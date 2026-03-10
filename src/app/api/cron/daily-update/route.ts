import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 遅延関数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ===== TikTok Apify API =====
interface ApifyVideoItem {
  id: string; text: string; playCount: number; diggCount: number;
  commentCount: number; shareCount: number; videoMeta?: { duration: number };
  authorMeta?: { name: string; fans: number }; createTime: number;
  covers?: { default: string }; webVideoUrl: string;
  hashtags?: Array<{ name: string }>;
}

async function collectTikTok(industryId: number, apiToken: string) {
  const industry = await prisma.industry.findUnique({
    where: { id: industryId },
    include: { hashtags: { where: { isActive: true, platform: "tiktok" } } },
  });
  if (!industry) return { videosNew: 0, videosUpdated: 0, total: 0 };
  const hashtags = industry.hashtags.map((h) => h.hashtag);
  if (hashtags.length === 0) return { videosNew: 0, videosUpdated: 0, total: 0 };

  // ハッシュタグが多い場合は最大10個に制限（API負荷軽減）
  const selectedHashtags = hashtags.length > 10 ? hashtags.slice(0, 10) : hashtags;

  const collectionLog = await prisma.collectionLog.create({
    data: { industryId, hashtag: selectedHashtags.join(", "), status: "running", startedAt: new Date() },
  });

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/clockworks~tiktok-hashtag-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashtags: selectedHashtags, resultsPerPage: 30 }),
      signal: AbortSignal.timeout(120000), // 2分タイムアウト
    });
    if (!res.ok) throw new Error(`Apify APIエラー: ${res.status}`);
    const data: ApifyVideoItem[] = await res.json();

    let videosNew = 0, videosUpdated = 0;
    for (const item of data) {
      const viewCount = item.playCount || 0;
      const likeCount = item.diggCount || 0;
      const commentCount = item.commentCount || 0;
      const shareCount = item.shareCount || 0;
      const engagementRate = viewCount > 0 ? (likeCount + commentCount + shareCount) / viewCount : 0;
      const hashtagsArray = item.hashtags?.map((h) => h.name) || [];
      const postedAt = item.createTime ? new Date(item.createTime * 1000) : null;

      const existing = await prisma.video.findUnique({ where: { tiktokVideoId: item.id } });
      if (existing) {
        await prisma.video.update({ where: { tiktokVideoId: item.id }, data: { videoUrl: item.webVideoUrl, description: item.text, hashtags: hashtagsArray, viewCount, likeCount, commentCount, shareCount, engagementRate, videoDurationSeconds: item.videoMeta?.duration || null, authorUsername: item.authorMeta?.name || null, authorFollowerCount: item.authorMeta?.fans || null, postedAt, thumbnailUrl: item.covers?.default || existing.thumbnailUrl, collectedAt: new Date() } });
        videosUpdated++;
      } else {
        await prisma.video.create({ data: { tiktokVideoId: item.id, videoUrl: item.webVideoUrl, description: item.text, hashtags: hashtagsArray, viewCount, likeCount, commentCount, shareCount, engagementRate, videoDurationSeconds: item.videoMeta?.duration || null, authorUsername: item.authorMeta?.name || null, authorFollowerCount: item.authorMeta?.fans || null, postedAt, thumbnailUrl: item.covers?.default || null, collectedAt: new Date(), source: "apify" } });
        videosNew++;
      }
    }

    await prisma.collectionLog.update({ where: { id: collectionLog.id }, data: { videosCollected: data.length, videosNew, videosUpdated, status: "completed", completedAt: new Date() } });
    return { videosNew, videosUpdated, total: data.length };
  } catch (error) {
    await prisma.collectionLog.update({ where: { id: collectionLog.id }, data: { status: "failed", completedAt: new Date(), errorMessage: (error as Error).message } });
    throw error;
  }
}

// ===== YouTube Apify API =====
interface YouTubeVideoItem {
  title: string; id: string; url: string; thumbnailUrl: string; viewCount: number;
  likes?: number; numberOfLikes?: number; commentsCount?: number; numberOfComments?: number;
  duration?: string; channelName?: string; numberOfSubscribers?: number; date?: string;
  hashtags?: string[]; text?: string;
}

function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null;
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

async function collectYouTube(industryId: number, apiToken: string) {
  const industry = await prisma.industry.findUnique({
    where: { id: industryId },
    include: { hashtags: { where: { isActive: true, platform: "youtube" } } },
  });
  if (!industry) return { videosNew: 0, videosUpdated: 0, total: 0 };
  const hashtags = industry.hashtags.map((h) => h.hashtag);
  if (hashtags.length === 0) return { videosNew: 0, videosUpdated: 0, total: 0 };

  // ハッシュタグが多い場合は最大10個に制限
  const selectedHashtags = hashtags.length > 10 ? hashtags.slice(0, 10) : hashtags;
  const searchQueries = selectedHashtags.map((h) => h.startsWith('#') ? h : `#${h}`);

  const collectionLog = await prisma.collectionLog.create({
    data: { industryId, hashtag: selectedHashtags.join(", "), status: "running", startedAt: new Date(), platform: "youtube" },
  });

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchQueries, maxResults: 30, maxResultsShorts: 30 }),
      signal: AbortSignal.timeout(120000), // 2分タイムアウト
    });
    if (!res.ok) throw new Error(`Apify APIエラー: ${res.status}`);
    const apifyData: YouTubeVideoItem[] = await res.json();
    const shortsOnly = apifyData.filter(item => item.url?.includes('/shorts/') || (parseDuration(item.duration) !== null && parseDuration(item.duration)! <= 60));

    let videosNew = 0, videosUpdated = 0;
    for (const item of shortsOnly) {
      const viewCount = item.viewCount || 0;
      const likeCount = item.likes || item.numberOfLikes || 0;
      const commentCount = item.commentsCount || item.numberOfComments || 0;
      const engagementRate = viewCount > 0 ? (likeCount + commentCount) / viewCount : 0;
      const postedAt = item.date ? new Date(item.date) : null;
      const videoId = `yt_${item.id}`;

      const existing = await prisma.video.findUnique({ where: { tiktokVideoId: videoId } });
      if (existing) {
        await prisma.video.update({ where: { tiktokVideoId: videoId }, data: { videoUrl: item.url, description: item.title || item.text || "", hashtags: item.hashtags || [], viewCount, likeCount, commentCount, shareCount: 0, engagementRate, videoDurationSeconds: parseDuration(item.duration), authorUsername: item.channelName || null, authorFollowerCount: item.numberOfSubscribers || null, postedAt, thumbnailUrl: item.thumbnailUrl || existing.thumbnailUrl, collectedAt: new Date(), platform: "youtube" } });
        videosUpdated++;
      } else {
        await prisma.video.create({ data: { tiktokVideoId: videoId, videoUrl: item.url, description: item.title || item.text || "", hashtags: item.hashtags || [], viewCount, likeCount, commentCount, shareCount: 0, engagementRate, videoDurationSeconds: parseDuration(item.duration), authorUsername: item.channelName || null, authorFollowerCount: item.numberOfSubscribers || null, postedAt, thumbnailUrl: item.thumbnailUrl || null, collectedAt: new Date(), source: "apify", platform: "youtube" } });
        videosNew++;
      }
    }

    await prisma.collectionLog.update({ where: { id: collectionLog.id }, data: { videosCollected: shortsOnly.length, videosNew, videosUpdated, status: "completed", completedAt: new Date() } });
    return { videosNew, videosUpdated, total: shortsOnly.length };
  } catch (error) {
    await prisma.collectionLog.update({ where: { id: collectionLog.id }, data: { status: "failed", completedAt: new Date(), errorMessage: (error as Error).message } });
    throw error;
  }
}

// ===== Instagram Apify API =====
interface InstagramReelItem {
  type: string; shortCode: string; caption: string; hashtags: string[];
  url: string; commentsCount: number; displayUrl: string;
  likesCount: number; videoPlayCount?: number; igPlayCount?: number;
  reshareCount?: number; timestamp: string; ownerUsername: string;
  videoDuration?: number;
}

async function collectInstagram(industryId: number, apiToken: string) {
  const industry = await prisma.industry.findUnique({
    where: { id: industryId },
    include: { hashtags: { where: { isActive: true, platform: "instagram" } } },
  });
  if (!industry) return { videosNew: 0, videosUpdated: 0, total: 0 };
  const hashtags = industry.hashtags.map((h) => h.hashtag);
  if (hashtags.length === 0) return { videosNew: 0, videosUpdated: 0, total: 0 };

  // ハッシュタグが多い場合は最大10個に制限
  const selectedHashtags = hashtags.length > 10 ? hashtags.slice(0, 10) : hashtags;

  const collectionLog = await prisma.collectionLog.create({
    data: { industryId, hashtag: selectedHashtags.join(", "), status: "running", startedAt: new Date(), platform: "instagram" },
  });

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashtags: selectedHashtags.map(h => h.replace(/^#/, "")), resultsType: "reels", resultsLimit: 30 }),
      signal: AbortSignal.timeout(120000), // 2分タイムアウト
    });
    if (!res.ok) throw new Error(`Apify APIエラー: ${res.status}`);
    const apifyData: InstagramReelItem[] = await res.json();
    const reelsOnly = apifyData.filter(item => item.type === "Video");

    let videosNew = 0, videosUpdated = 0;
    for (const item of reelsOnly) {
      const viewCount = item.videoPlayCount || item.igPlayCount || 0;
      const likeCount = item.likesCount > 0 ? item.likesCount : 0;
      const commentCount = item.commentsCount || 0;
      const shareCount = item.reshareCount || 0;
      const engagementRate = viewCount > 0 ? (likeCount + commentCount + shareCount) / viewCount : 0;
      const postedAt = item.timestamp ? new Date(item.timestamp) : null;
      const videoId = `ig_${item.shortCode}`;

      const existing = await prisma.video.findUnique({ where: { tiktokVideoId: videoId } });
      if (existing) {
        await prisma.video.update({ where: { tiktokVideoId: videoId }, data: { videoUrl: item.url, description: item.caption || "", hashtags: item.hashtags || [], viewCount, likeCount, commentCount, shareCount, engagementRate, videoDurationSeconds: item.videoDuration ? Math.round(item.videoDuration) : null, authorUsername: item.ownerUsername || null, postedAt, thumbnailUrl: item.displayUrl || existing.thumbnailUrl, collectedAt: new Date(), platform: "instagram" } });
        videosUpdated++;
      } else {
        await prisma.video.create({ data: { tiktokVideoId: videoId, videoUrl: item.url, description: item.caption || "", hashtags: item.hashtags || [], viewCount, likeCount, commentCount, shareCount, engagementRate, videoDurationSeconds: item.videoDuration ? Math.round(item.videoDuration) : null, authorUsername: item.ownerUsername || null, postedAt, thumbnailUrl: item.displayUrl || null, collectedAt: new Date(), source: "apify", platform: "instagram" } });
        videosNew++;
      }
    }

    await prisma.collectionLog.update({ where: { id: collectionLog.id }, data: { videosCollected: reelsOnly.length, videosNew, videosUpdated, status: "completed", completedAt: new Date() } });
    return { videosNew, videosUpdated, total: reelsOnly.length };
  } catch (error) {
    await prisma.collectionLog.update({ where: { id: collectionLog.id }, data: { status: "failed", completedAt: new Date(), errorMessage: (error as Error).message } });
    throw error;
  }
}

// ===== Auto-tag ロジック =====
const contentTypeRules: Record<string, string[]> = {
  "チュートリアル": ["やり方", "方法", "教える", "解説", "ハウツー", "How to", "tutorial"],
  "レビュー": ["レビュー", "正直", "使ってみた", "買ってみた", "感想", "review"],
  "Vlog": ["vlog", "日常", "1日", "ルーティン", "routine"],
  "ビフォーアフター": ["ビフォーアフター", "before", "after", "変化", "変身"],
  "ランキング": ["TOP", "ランキング", "BEST", "おすすめ", "選"],
  "Q&A": ["Q&A", "質問", "答え", "回答"],
  "ハウツー": ["コツ", "ポイント", "秘訣", "tips"],
  "商品紹介": ["紹介", "商品", "アイテム", "購入品", "買った"],
};

const hookTypeRules: Record<string, string[]> = {
  "質問形式": ["？", "知ってる", "わかる", "なぜ", "どうして"],
  "衝撃的事実": ["実は", "驚き", "衝撃", "知らない", "秘密"],
  "ビフォーアフター": ["ビフォー", "アフター", "before", "after"],
  "カウントダウン": ["TOP", "第", "位", "ランキング"],
  "ストーリー導入": ["ある日", "実は", "今日は", "この前"],
  "問題提起": ["悩み", "困った", "問題", "解決"],
  "比較": ["vs", "比較", "違い", "どっち"],
};

// 拡充されたindustryHashtagMapping（DBのハッシュタグと同期）
const industryHashtagMapping: Record<number, string[]> = {
  11: ["フィットネス", "筋トレ", "ダイエット", "ジム", "ワークアウト", "ボディメイク", "トレーニング", "筋肉", "腹筋", "プロテイン", "HIIT", "ヨガ", "ピラティス", "ストレッチ", "ランニング", "痩せる", "体脂肪", "美ボディ", "宅トレ", "パーソナルトレーニング"],
  12: ["エンタメ", "お笑い", "ダンス", "映画", "音楽", "ゲーム", "バラエティ", "コント", "漫才", "モノマネ", "あるある", "おもしろ", "爆笑", "アニメ", "漫画", "推し", "推し活", "歌ってみた", "踊ってみた", "コスプレ", "ASMR", "Vtuber", "ゲーム実況"],
  13: ["ファッション", "OOTD", "コーデ", "着回し", "プチプラ", "トレンド", "GU", "ユニクロ", "ZARA", "SHEIN", "韓国ファッション", "古着", "スニーカー", "バッグ", "アクセサリー", "骨格診断", "パーソナルカラー", "着痩せ", "おしゃれ", "大人カジュアル"],
  14: ["不動産", "マイホーム", "賃貸", "ルームツアー", "インテリア", "物件", "新築", "注文住宅", "リノベーション", "リフォーム", "DIY", "住宅ローン", "間取り", "収納", "北欧インテリア", "一人暮らし", "IKEA", "ニトリ", "無印良品", "暮らし"],
  15: ["教育", "勉強", "学習", "英語", "受験", "資格", "勉強法", "勉強垢", "TOEIC", "英検", "留学", "プログラミング", "簿記", "読書", "朝活", "社会人勉強", "リスキリング", "数学", "大学受験", "塾"],
  16: ["EC", "ショッピング", "購入品", "通販", "レビュー", "おすすめ商品", "D2C", "Amazon", "楽天", "Qoo10", "SHEIN", "開封動画", "買ってよかった", "コスパ", "セール", "ガジェット", "便利グッズ", "100均", "ダイソー", "サブスク"],
  17: ["グルメ", "料理", "レシピ", "カフェ", "食べ歩き", "おうちごはん", "ランチ", "ディナー", "簡単レシピ", "時短レシピ", "スイーツ", "パン", "カフェ巡り", "コーヒー", "ラーメン", "寿司", "焼肉", "居酒屋", "和食", "韓国料理"],
  18: ["美容", "コスメ", "スキンケア", "メイク", "美肌", "化粧品", "デパコス", "プチプラコスメ", "韓国コスメ", "アイメイク", "リップ", "ファンデーション", "ヘアケア", "ヘアアレンジ", "ネイル", "エステ", "脱毛", "美容院", "ナチュラルメイク", "メイク動画"],
  19: ["旅行", "トラベル", "国内旅行", "海外旅行", "観光", "絶景", "温泉", "ホテル", "リゾート", "沖縄", "京都", "北海道", "ハワイ", "韓国", "台湾", "旅vlog", "お土産", "飛行機", "一人旅", "女子旅"],
  20: ["医療", "健康", "ヘルスケア", "病院", "予防", "医師", "看護師", "歯科", "美容医療", "整形", "健康診断", "メンタルヘルス", "睡眠", "栄養", "サプリメント", "漢方", "整体", "ストレス", "自律神経", "ダイエット"],
  21: ["ペット", "犬", "猫", "ペットホテル", "猫ホテル", "キャットホテル", "わんこ", "にゃんこ", "トリミング", "ドッグ", "キャット", "犬のいる暮らし", "猫のいる暮らし", "子犬", "子猫", "保護犬", "保護猫", "トイプードル", "柴犬", "ドッグラン", "ペットフード"],
};

function detectTag(text: string, rules: Record<string, string[]>): string | null {
  const lowerText = text.toLowerCase();
  for (const [tag, keywords] of Object.entries(rules)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) return tag;
    }
  }
  return null;
}

function getDurationCategory(seconds: number | null): string {
  if (!seconds) return "〜60秒";
  if (seconds <= 15) return "〜15秒";
  if (seconds <= 30) return "〜30秒";
  if (seconds <= 60) return "〜60秒";
  return "60秒以上";
}

function detectIndustryFromHashtags(hashtags: string[], description?: string | null): number | null {
  // ハッシュタグ配列 + descriptionから#付きタグを抽出して統合
  const allTags = [...hashtags];
  if (description) {
    const descTags = description.match(/#([^\s#]+)/g);
    if (descTags) {
      allTags.push(...descTags.map(t => t.replace('#', '')));
    }
  }

  const tagsLower = allTags.map(h => h.toLowerCase());
  const descLower = (description || '').toLowerCase();

  // まずハッシュタグからマッチを試みる
  for (const [industryId, keywords] of Object.entries(industryHashtagMapping)) {
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      if (tagsLower.some(h => h.includes(kw))) {
        return parseInt(industryId);
      }
    }
  }

  // ハッシュタグでマッチしない場合はdescription全体からキーワードを検索
  for (const [industryId, keywords] of Object.entries(industryHashtagMapping)) {
    for (const keyword of keywords) {
      if (descLower.includes(keyword.toLowerCase())) {
        return parseInt(industryId);
      }
    }
  }

  return null;
}

// ===== ベンチマーク再計算 =====
async function recalculateBenchmarks() {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() - 1);
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd);
  periodStart.setMonth(periodStart.getMonth() - 1);
  periodStart.setHours(0, 0, 0, 0);

  const industries = await prisma.industry.findMany();
  const platforms = ["tiktok", "youtube", "instagram"];

  for (const industry of industries) {
    for (const platform of platforms) {
      const videos = await prisma.video.findMany({
        where: {
          videoTags: { some: { industryId: industry.id } },
          platform,
          postedAt: { gte: periodStart, lte: periodEnd },
        },
        include: { videoTags: { where: { industryId: industry.id } } },
      });
      if (videos.length === 0) continue;

      const engagementRates = videos.map((v) => v.engagementRate);
      const viewCounts = videos.map((v) => v.viewCount).sort((a, b) => a - b);
      const avgEngagementRate = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
      const medianViewCount = viewCounts[Math.floor(viewCounts.length / 2)];

      const contentTypeCounts: Record<string, number> = {};
      const hookTypeCounts: Record<string, number> = {};
      for (const video of videos) {
        for (const tag of video.videoTags) {
          if (tag.contentType) contentTypeCounts[tag.contentType] = (contentTypeCounts[tag.contentType] || 0) + 1;
          if (tag.hookType) hookTypeCounts[tag.hookType] = (hookTypeCounts[tag.hookType] || 0) + 1;
        }
      }
      const topContentTypes = Object.entries(contentTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => ({ type, count }));
      const topHookTypes = Object.entries(hookTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => ({ type, count }));

      const existing = await prisma.benchmark.findFirst({ where: { industryId: industry.id, platform, periodStart, periodEnd } });
      if (existing) {
        await prisma.benchmark.update({ where: { id: existing.id }, data: { avgEngagementRate, medianViewCount, topContentTypes: JSON.stringify(topContentTypes), topHookTypes: JSON.stringify(topHookTypes), sampleSize: videos.length, calculatedAt: new Date() } });
      } else {
        await prisma.benchmark.create({ data: { industryId: industry.id, platform, periodStart, periodEnd, avgEngagementRate, medianViewCount, topContentTypes: JSON.stringify(topContentTypes), topHookTypes: JSON.stringify(topHookTypes), sampleSize: videos.length } });
      }
    }
  }
}

// ===== ローテーション方式のcronジョブ =====
// 1回のcron実行で1業種×1プラットフォームのみ処理し、次回は次の組み合わせを処理
// これによりVercelの300秒制限内に確実に収まる

function getRotationTarget(industries: { id: number; name: string }[]): { industryId: number; industryName: string; platform: string } {
  const platforms = ["tiktok", "youtube", "instagram"];
  const totalCombinations = industries.length * platforms.length;

  // 現在のUTC時間から「何番目の組み合わせを処理するか」を計算
  // 1日に複数回cronが走る場合、時間ベースでローテーション
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const hourSlot = now.getUTCHours(); // 0-23

  // 1日に4回実行（0時、6時、12時、18時 UTC）を想定
  // dayOfYear * 4 + hourSlot/6 でインデックスを計算
  const slotIndex = dayOfYear * 4 + Math.floor(hourSlot / 6);
  const targetIndex = slotIndex % totalCombinations;

  const industryIndex = Math.floor(targetIndex / platforms.length);
  const platformIndex = targetIndex % platforms.length;

  return {
    industryId: industries[industryIndex].id,
    industryName: industries[industryIndex].name,
    platform: platforms[platformIndex],
  };
}

// GET /api/cron/daily-update - ローテーション方式で自動実行
export async function GET(request: NextRequest) {
  try {
    // Cron認証チェック
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
    if (!APIFY_API_TOKEN) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not set" }, { status: 500 });
    }

    console.log("[Daily Update] Starting (rotation mode)...");

    const industries = await prisma.industry.findMany({ orderBy: { id: "asc" } });
    const target = getRotationTarget(industries);

    console.log(`[Daily Update] Target: ${target.industryName} (${target.platform})`);

    // 1. データ収集（1業種×1プラットフォーム）
    let collectResult = { videosNew: 0, videosUpdated: 0, total: 0 };
    let collectStatus = "success";
    try {
      if (target.platform === "tiktok") {
        collectResult = await collectTikTok(target.industryId, APIFY_API_TOKEN);
      } else if (target.platform === "youtube") {
        collectResult = await collectYouTube(target.industryId, APIFY_API_TOKEN);
      } else {
        collectResult = await collectInstagram(target.industryId, APIFY_API_TOKEN);
      }
      console.log(`[Daily Update] Collected: ${collectResult.total}件 (new: ${collectResult.videosNew})`);
    } catch (error) {
      console.error(`[Daily Update] Collection error:`, error);
      collectStatus = "failed";
    }

    await delay(1000);

    // 2. 自動タグ付け（タグなし動画のみ）
    console.log("[Daily Update] Auto-tagging untagged videos...");
    const untaggedVideos = await prisma.video.findMany({
      where: { videoTags: { none: {} } },
      take: 500, // バッチサイズ制限
    });

    let tagged = 0;
    for (const video of untaggedVideos) {
      const hashtags = Array.isArray(video.hashtags) ? video.hashtags as string[] : [];
      const targetIndustryId = detectIndustryFromHashtags(hashtags, video.description) || 11;
      const text = `${video.description || ""} ${hashtags.join(" ")}`;

      await prisma.videoTag.create({
        data: {
          videoId: video.id,
          industryId: targetIndustryId,
          contentType: detectTag(text, contentTypeRules),
          hookType: detectTag(text, hookTypeRules),
          durationCategory: getDurationCategory(video.videoDurationSeconds),
          performerType: null,
          tone: null,
          ctaType: null,
        },
      });
      tagged++;
    }
    console.log(`[Daily Update] Tagged ${tagged} videos`);

    // 3. サムネイル更新（最大50件）
    console.log("[Daily Update] Updating thumbnails...");
    let thumbUpdated = 0;
    const noThumbVideos = await prisma.video.findMany({
      where: { thumbnailUrl: null },
      select: { id: true, tiktokVideoId: true, platform: true },
      take: 50,
    });
    for (const video of noThumbVideos) {
      try {
        const platform = video.platform || "tiktok";
        let thumbnailUrl: string | null = null;

        if (platform === "tiktok") {
          const videoUrl = `https://www.tiktok.com/@user/video/${video.tiktokVideoId}`;
          const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
          const response = await fetch(oembedUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (response.ok) {
            const data = await response.json();
            thumbnailUrl = data.thumbnail_url || null;
          }
        } else if (platform === "youtube") {
          const ytId = video.tiktokVideoId.replace("yt_", "");
          thumbnailUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        }

        if (thumbnailUrl) {
          await prisma.video.update({ where: { id: video.id }, data: { thumbnailUrl } });
          thumbUpdated++;
        }
        await delay(200);
      } catch (error) {
        console.error(`[Daily Update] Thumb error for ${video.id}:`, error);
      }
    }
    console.log(`[Daily Update] Updated ${thumbUpdated} thumbnails`);

    // 4. ベンチマーク再計算
    console.log("[Daily Update] Recalculating benchmarks...");
    await recalculateBenchmarks();

    console.log("[Daily Update] Completed");

    return NextResponse.json({
      success: true,
      message: "Daily update completed (rotation mode)",
      target: { industry: target.industryName, platform: target.platform },
      collection: { status: collectStatus, ...collectResult },
      tagged,
      thumbnailsUpdated: thumbUpdated,
    });
  } catch (error) {
    console.error("[Daily Update] Error:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
