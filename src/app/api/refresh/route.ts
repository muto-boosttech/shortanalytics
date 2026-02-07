import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { checkRefreshUsage, logUsage, PlanType } from "@/lib/plan-limits";

// 遅延関数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ===== TikTok Apify API =====
interface ApifyVideoItem {
  id: string;
  text: string;
  playCount: number;
  diggCount: number;
  commentCount: number;
  shareCount: number;
  videoMeta?: { duration: number };
  authorMeta?: { name: string; fans: number };
  createTime: number;
  covers?: { default: string };
  webVideoUrl: string;
  hashtags?: Array<{ name: string }>;
}

async function collectTikTok(industryId: number, apiToken: string): Promise<{ videosNew: number; videosUpdated: number; total: number }> {
  const industry = await prisma.industry.findUnique({
    where: { id: industryId },
    include: { hashtags: { where: { isActive: true, platform: "tiktok" } } },
  });
  if (!industry) throw new Error("業種が見つかりません");

  const hashtags = industry.hashtags.map((h) => h.hashtag);
  if (hashtags.length === 0) return { videosNew: 0, videosUpdated: 0, total: 0 };

  const collectionLog = await prisma.collectionLog.create({
    data: { industryId, hashtag: hashtags.join(", "), status: "running", startedAt: new Date() },
  });

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/clockworks~tiktok-hashtag-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const apifyResponse = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashtags, resultsPerPage: 30 }),
    });
    if (!apifyResponse.ok) throw new Error(`Apify APIエラー: ${apifyResponse.status}`);
    const apifyData: ApifyVideoItem[] = await apifyResponse.json();

    let videosNew = 0, videosUpdated = 0;
    for (const item of apifyData) {
      const viewCount = item.playCount || 0;
      const likeCount = item.diggCount || 0;
      const commentCount = item.commentCount || 0;
      const shareCount = item.shareCount || 0;
      const engagementRate = viewCount > 0 ? (likeCount + commentCount + shareCount) / viewCount : 0;
      const hashtagsArray = item.hashtags?.map((h) => h.name) || [];
      const postedAt = item.createTime ? new Date(item.createTime * 1000) : null;

      const existing = await prisma.video.findUnique({ where: { tiktokVideoId: item.id } });
      if (existing) {
        await prisma.video.update({
          where: { tiktokVideoId: item.id },
          data: { videoUrl: item.webVideoUrl, description: item.text, hashtags: hashtagsArray, viewCount, likeCount, commentCount, shareCount, engagementRate, videoDurationSeconds: item.videoMeta?.duration || null, authorUsername: item.authorMeta?.name || null, authorFollowerCount: item.authorMeta?.fans || null, postedAt, thumbnailUrl: item.covers?.default || existing.thumbnailUrl, collectedAt: new Date() },
        });
        videosUpdated++;
      } else {
        await prisma.video.create({
          data: { tiktokVideoId: item.id, videoUrl: item.webVideoUrl, description: item.text, hashtags: hashtagsArray, viewCount, likeCount, commentCount, shareCount, engagementRate, videoDurationSeconds: item.videoMeta?.duration || null, authorUsername: item.authorMeta?.name || null, authorFollowerCount: item.authorMeta?.fans || null, postedAt, thumbnailUrl: item.covers?.default || null, collectedAt: new Date(), source: "apify" },
        });
        videosNew++;
      }
    }

    await prisma.collectionLog.update({
      where: { id: collectionLog.id },
      data: { videosCollected: apifyData.length, videosNew, videosUpdated, status: "completed", completedAt: new Date() },
    });
    return { videosNew, videosUpdated, total: apifyData.length };
  } catch (error) {
    await prisma.collectionLog.update({
      where: { id: collectionLog.id },
      data: { status: "failed", completedAt: new Date(), errorMessage: (error as Error).message },
    });
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

async function collectYouTube(industryId: number, apiToken: string): Promise<{ videosNew: number; videosUpdated: number; total: number }> {
  const industry = await prisma.industry.findUnique({
    where: { id: industryId },
    include: { hashtags: { where: { isActive: true, platform: "youtube" } } },
  });
  if (!industry) throw new Error("業種が見つかりません");

  const hashtags = industry.hashtags.map((h) => h.hashtag);
  if (hashtags.length === 0) return { videosNew: 0, videosUpdated: 0, total: 0 };

  const searchKeywords = hashtags.map((h) => h.startsWith('#') ? h : `#${h}`);

  const collectionLog = await prisma.collectionLog.create({
    data: { industryId, hashtag: hashtags.join(", "), status: "running", startedAt: new Date(), platform: "youtube" },
  });

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const apifyResponse = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchKeywords, maxResults: 30, maxResultsShorts: 30, searchType: "video", verboseLog: false }),
    });
    if (!apifyResponse.ok) throw new Error(`Apify APIエラー: ${apifyResponse.status}`);
    const apifyData: YouTubeVideoItem[] = await apifyResponse.json();

    const shortsOnly = apifyData.filter(item => {
      const isShortUrl = item.url?.includes('/shorts/');
      const duration = parseDuration(item.duration);
      const isShortDuration = duration !== null && duration <= 60;
      return isShortUrl || isShortDuration;
    });

    let videosNew = 0, videosUpdated = 0;
    for (const item of shortsOnly) {
      const viewCount = item.viewCount || 0;
      const likeCount = item.likes || item.numberOfLikes || 0;
      const commentCount = item.commentsCount || item.numberOfComments || 0;
      const engagementRate = viewCount > 0 ? (likeCount + commentCount) / viewCount : 0;
      const hashtagsArray = item.hashtags || [];
      const postedAt = item.date ? new Date(item.date) : null;
      const durationSeconds = parseDuration(item.duration);
      const videoId = `yt_${item.id}`;
      const description = item.title || item.text || "";

      const existing = await prisma.video.findUnique({ where: { tiktokVideoId: videoId } });
      if (existing) {
        await prisma.video.update({
          where: { tiktokVideoId: videoId },
          data: { videoUrl: item.url, description, hashtags: hashtagsArray, viewCount, likeCount, commentCount, shareCount: 0, engagementRate, videoDurationSeconds: durationSeconds, authorUsername: item.channelName || null, authorFollowerCount: item.numberOfSubscribers || null, postedAt, thumbnailUrl: item.thumbnailUrl || existing.thumbnailUrl, collectedAt: new Date(), platform: "youtube" },
        });
        videosUpdated++;
      } else {
        await prisma.video.create({
          data: { tiktokVideoId: videoId, videoUrl: item.url, description, hashtags: hashtagsArray, viewCount, likeCount, commentCount, shareCount: 0, engagementRate, videoDurationSeconds: durationSeconds, authorUsername: item.channelName || null, authorFollowerCount: item.numberOfSubscribers || null, postedAt, thumbnailUrl: item.thumbnailUrl || null, collectedAt: new Date(), source: "apify", platform: "youtube" },
        });
        videosNew++;
      }
    }

    await prisma.collectionLog.update({
      where: { id: collectionLog.id },
      data: { videosCollected: shortsOnly.length, videosNew, videosUpdated, status: "completed", completedAt: new Date() },
    });
    return { videosNew, videosUpdated, total: shortsOnly.length };
  } catch (error) {
    await prisma.collectionLog.update({
      where: { id: collectionLog.id },
      data: { status: "failed", completedAt: new Date(), errorMessage: (error as Error).message },
    });
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

async function collectInstagram(industryId: number, apiToken: string): Promise<{ videosNew: number; videosUpdated: number; total: number }> {
  const industry = await prisma.industry.findUnique({
    where: { id: industryId },
    include: { hashtags: { where: { isActive: true, platform: "instagram" } } },
  });
  if (!industry) throw new Error("業種が見つかりません");

  const hashtags = industry.hashtags.map((h) => h.hashtag);
  if (hashtags.length === 0) return { videosNew: 0, videosUpdated: 0, total: 0 };

  const collectionLog = await prisma.collectionLog.create({
    data: { industryId, hashtag: hashtags.join(", "), status: "running", startedAt: new Date(), platform: "instagram" },
  });

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const apifyResponse = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashtags: hashtags.map(h => h.replace(/^#/, "")), resultsType: "reels", resultsLimit: 30 }),
    });
    if (!apifyResponse.ok) throw new Error(`Apify APIエラー: ${apifyResponse.status}`);
    const apifyData: InstagramReelItem[] = await apifyResponse.json();

    const reelsOnly = apifyData.filter(item => item.type === "Video");

    let videosNew = 0, videosUpdated = 0;
    for (const item of reelsOnly) {
      const viewCount = item.videoPlayCount || item.igPlayCount || 0;
      const likeCount = item.likesCount > 0 ? item.likesCount : 0;
      const commentCount = item.commentsCount || 0;
      const shareCount = item.reshareCount || 0;
      const engagementRate = viewCount > 0 ? (likeCount + commentCount + shareCount) / viewCount : 0;
      const hashtagsArray = item.hashtags || [];
      const postedAt = item.timestamp ? new Date(item.timestamp) : null;
      const durationSeconds = item.videoDuration ? Math.round(item.videoDuration) : null;
      const videoId = `ig_${item.shortCode}`;
      const description = item.caption || "";

      const existing = await prisma.video.findUnique({ where: { tiktokVideoId: videoId } });
      if (existing) {
        await prisma.video.update({
          where: { tiktokVideoId: videoId },
          data: { videoUrl: item.url, description, hashtags: hashtagsArray, viewCount, likeCount, commentCount, shareCount, engagementRate, videoDurationSeconds: durationSeconds, authorUsername: item.ownerUsername || null, postedAt, thumbnailUrl: item.displayUrl || existing.thumbnailUrl, collectedAt: new Date(), platform: "instagram" },
        });
        videosUpdated++;
      } else {
        await prisma.video.create({
          data: { tiktokVideoId: videoId, videoUrl: item.url, description, hashtags: hashtagsArray, viewCount, likeCount, commentCount, shareCount, engagementRate, videoDurationSeconds: durationSeconds, authorUsername: item.ownerUsername || null, postedAt, thumbnailUrl: item.displayUrl || null, collectedAt: new Date(), source: "apify", platform: "instagram" },
        });
        videosNew++;
      }
    }

    await prisma.collectionLog.update({
      where: { id: collectionLog.id },
      data: { videosCollected: reelsOnly.length, videosNew, videosUpdated, status: "completed", completedAt: new Date() },
    });
    return { videosNew, videosUpdated, total: reelsOnly.length };
  } catch (error) {
    await prisma.collectionLog.update({
      where: { id: collectionLog.id },
      data: { status: "failed", completedAt: new Date(), errorMessage: (error as Error).message },
    });
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

const performerTypeRules: Record<string, string[]> = {
  "顔出し": ["私", "僕", "俺", "自分"],
  "顔なし": ["手元", "商品だけ"],
  "テキストのみ": ["テキスト"],
  "商品のみ": ["商品紹介", "アイテム"],
};

const toneRules: Record<string, string[]> = {
  "カジュアル": ["笑", "w", "！", "〜"],
  "プロフェッショナル": ["専門", "プロ", "解説"],
  "ユーモア": ["笑", "爆笑", "面白い", "ネタ"],
  "感動": ["泣", "感動", "涙", "エモい"],
  "教育的": ["学び", "勉強", "知識", "教える"],
};

const ctaTypeRules: Record<string, string[]> = {
  "フォロー促進": ["フォロー", "follow"],
  "いいね促進": ["いいね", "like", "❤"],
  "コメント促進": ["コメント", "教えて", "聞かせて"],
  "シェア促進": ["シェア", "share", "広めて"],
  "リンク誘導": ["リンク", "プロフィール", "詳細は"],
};

const industryHashtagMapping: Record<number, string[]> = {
  11: ["フィットネス", "筋トレ", "ダイエット", "ジム", "ワークアウト", "ボディメイク"],
  12: ["エンタメ", "お笑い", "ダンス", "映画", "音楽", "ゲーム"],
  13: ["ファッション", "OOTD", "コーデ", "着回し", "プチプラ", "トレンド"],
  14: ["不動産", "マイホーム", "賃貸", "ルームツアー", "インテリア", "物件"],
  15: ["教育", "勉強", "学習", "英語", "受験", "資格"],
  16: ["EC", "ショッピング", "購入品", "通販", "レビュー", "おすすめ商品"],
  17: ["グルメ", "料理", "レシピ", "カフェ", "食べ歩き", "おうちごはん"],
  18: ["美容", "コスメ", "スキンケア", "メイク", "美肌", "化粧品"],
  19: ["旅行", "トラベル", "国内旅行", "海外旅行", "観光", "絶景"],
  20: ["医療", "健康", "ヘルスケア", "病院", "予防", "医師"],
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

function detectIndustryFromHashtags(hashtags: string[]): number | null {
  const hashtagsLower = hashtags.map(h => h.toLowerCase());
  for (const [industryId, keywords] of Object.entries(industryHashtagMapping)) {
    for (const keyword of keywords) {
      if (hashtagsLower.some(h => h.includes(keyword.toLowerCase()))) return parseInt(industryId);
    }
  }
  return null;
}

async function runAutoTag(): Promise<{ processed: number; tagged: number }> {
  // 既存タグを削除
  await prisma.videoTag.deleteMany({});

  // タグがない動画を対象
  const videos = await prisma.video.findMany({
    where: { videoTags: { none: {} } },
  });

  let processed = 0, tagged = 0;
  for (const video of videos) {
    processed++;
    const hashtags = Array.isArray(video.hashtags) ? video.hashtags as string[] : [];
    const targetIndustryId = detectIndustryFromHashtags(hashtags) || 11;

    const text = `${video.description || ""} ${hashtags.join(" ")}`;
    const contentType = detectTag(text, contentTypeRules);
    const hookType = detectTag(text, hookTypeRules);
    const performerType = detectTag(text, performerTypeRules);
    const tone = detectTag(text, toneRules);
    const ctaType = detectTag(text, ctaTypeRules);
    const durationCategory = getDurationCategory(video.videoDurationSeconds);

    await prisma.videoTag.create({
      data: { videoId: video.id, industryId: targetIndustryId, contentType, hookType, durationCategory, performerType, tone, ctaType },
    });
    tagged++;
  }

  return { processed, tagged };
}

// ===== サムネイル更新ロジック =====
async function updateThumbnails(): Promise<number> {
  let totalUpdated = 0;

  for (let batch = 0; batch < 20; batch++) {
    const videos = await prisma.video.findMany({
      where: { thumbnailUrl: null },
      select: { id: true, tiktokVideoId: true, platform: true },
      take: 50,
    });

    if (videos.length === 0) break;

    for (const video of videos) {
      try {
        let thumbnailUrl: string | null = null;
        const platform = video.platform || "tiktok";

        if (platform === "tiktok") {
          // TikTok oEmbed APIを使用
          const videoUrl = `https://www.tiktok.com/@user/video/${video.tiktokVideoId}`;
          const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
          const response = await fetch(oembedUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          });
          if (response.ok) {
            const data = await response.json();
            thumbnailUrl = data.thumbnail_url || null;
          }
        } else if (platform === "youtube") {
          // YouTube サムネイルURLを生成
          const ytId = video.tiktokVideoId.replace("yt_", "");
          thumbnailUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        } else if (platform === "instagram") {
          // Instagramはサムネイルが取得しにくいのでスキップ
          continue;
        }

        if (thumbnailUrl) {
          await prisma.video.update({
            where: { id: video.id },
            data: { thumbnailUrl },
          });
          totalUpdated++;
        }

        await delay(200);
      } catch (error) {
        console.error(`Failed to update thumbnail for video ${video.id}:`, error);
      }
    }
  }

  return totalUpdated;
}

// ===== ベンチマーク再計算ロジック =====
async function recalculateBenchmarks(): Promise<boolean> {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() - 1);
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd);
  periodStart.setMonth(periodStart.getMonth() - 1);
  periodStart.setHours(0, 0, 0, 0);

  const industries = await prisma.industry.findMany();

  for (const industry of industries) {
    const videos = await prisma.video.findMany({
      where: {
        videoTags: { some: { industryId: industry.id } },
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

    const existingBenchmark = await prisma.benchmark.findFirst({
      where: { industryId: industry.id, periodStart, periodEnd },
    });

    if (existingBenchmark) {
      await prisma.benchmark.update({
        where: { id: existingBenchmark.id },
        data: { avgEngagementRate, medianViewCount, topContentTypes: JSON.stringify(topContentTypes), topHookTypes: JSON.stringify(topHookTypes), sampleSize: videos.length, calculatedAt: new Date() },
      });
    } else {
      await prisma.benchmark.create({
        data: { industryId: industry.id, periodStart, periodEnd, avgEngagementRate, medianViewCount, topContentTypes: JSON.stringify(topContentTypes), topHookTypes: JSON.stringify(topHookTypes), sampleSize: videos.length },
      });
    }
  }

  return true;
}

// POST /api/refresh - 手動データ更新API（内部fetchを排除し、直接実行）
export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
    }

    // ユーザーのプランを取得
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { plan: true, role: true },
    });
    const plan = (user?.plan || "free") as PlanType;

    const body = await request.json();
    const { type, platform, industryId } = body;

    // マスター管理者は制限なし
    if (user?.role !== "master_admin") {
      if (type === "full" || type === "collect") {
        if (platform && industryId) {
          const usageCheck = await checkRefreshUsage(session.userId, plan, platform, parseInt(industryId));
          if (!usageCheck.allowed) {
            return NextResponse.json({
              success: false,
              error: usageCheck.message,
              usageInfo: { currentCount: usageCheck.currentCount, limit: usageCheck.limit, remaining: usageCheck.remaining },
            }, { status: 429 });
          }
        }
      }
    }

    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
    if (!APIFY_API_TOKEN) {
      return NextResponse.json({ success: false, error: "APIFY_API_TOKENが設定されていません" }, { status: 500 });
    }

    const results: {
      collections: Array<{ industryId: number; industryName: string; platform: string; status: string; videos?: number }>;
      tagging: { processed: number; tagged: number };
      thumbnails: { updated: number };
      benchmarks: boolean;
    } = {
      collections: [],
      tagging: { processed: 0, tagged: 0 },
      thumbnails: { updated: 0 },
      benchmarks: false,
    };

    // ===== データ収集（直接実行） =====
    if (type === "full" || type === "collect") {
      let industries = await prisma.industry.findMany({
        include: { _count: { select: { hashtags: true, videoTags: true } } },
        orderBy: { id: "asc" },
      });

      if (industryId) {
        industries = industries.filter((i) => i.id === parseInt(industryId));
      }

      const platforms = platform ? [platform] : ["tiktok", "youtube", "instagram"];

      for (const ind of industries) {
        for (const plat of platforms) {
          if (user?.role !== "master_admin") {
            const usageCheck = await checkRefreshUsage(session.userId, plan, plat, ind.id);
            if (!usageCheck.allowed) {
              results.collections.push({ industryId: ind.id, industryName: ind.name, platform: plat, status: "limit_reached" });
              continue;
            }
          }

          try {
            console.log(`[Manual Refresh] Collecting ${plat} for ${ind.name}...`);
            let collectResult: { videosNew: number; videosUpdated: number; total: number };

            if (plat === "tiktok") {
              collectResult = await collectTikTok(ind.id, APIFY_API_TOKEN);
            } else if (plat === "youtube") {
              collectResult = await collectYouTube(ind.id, APIFY_API_TOKEN);
            } else {
              collectResult = await collectInstagram(ind.id, APIFY_API_TOKEN);
            }

            console.log(`[Manual Refresh] ${plat} for ${ind.name}: ${collectResult.total}件取得, 新規${collectResult.videosNew}件`);

            results.collections.push({
              industryId: ind.id,
              industryName: ind.name,
              platform: plat,
              status: "success",
              videos: collectResult.videosNew,
            });

            await logUsage(session.userId, "refresh", plat, ind.id, `videos: ${collectResult.videosNew}`);
          } catch (error) {
            console.error(`[Manual Refresh] Error collecting ${plat} for ${ind.name}:`, error);
            results.collections.push({ industryId: ind.id, industryName: ind.name, platform: plat, status: "failed" });
          }
          await delay(1000);
        }
      }
    }

    // ===== タグ付け（直接実行） =====
    if (type === "full" || type === "tag") {
      try {
        console.log("[Manual Refresh] Starting auto-tagging...");
        results.tagging = await runAutoTag();
        console.log(`[Manual Refresh] Auto-tagging: ${results.tagging.processed}件処理, ${results.tagging.tagged}件タグ付け`);
      } catch (error) {
        console.error("[Manual Refresh] Error during tagging:", error);
      }
    }

    // ===== サムネイル更新（直接実行） =====
    if (type === "full" || type === "thumbnail") {
      try {
        console.log("[Manual Refresh] Updating thumbnails...");
        results.thumbnails.updated = await updateThumbnails();
        console.log(`[Manual Refresh] Thumbnails: ${results.thumbnails.updated}件更新`);
      } catch (error) {
        console.error("[Manual Refresh] Error updating thumbnails:", error);
      }
    }

    // ===== ベンチマーク再計算（直接実行） =====
    if (type === "full" || type === "benchmark") {
      try {
        console.log("[Manual Refresh] Recalculating benchmarks...");
        results.benchmarks = await recalculateBenchmarks();
        console.log("[Manual Refresh] Benchmarks recalculated");
      } catch (error) {
        console.error("[Manual Refresh] Error recalculating benchmarks:", error);
      }
    }

    console.log("[Manual Refresh] Completed:", JSON.stringify(results));

    return NextResponse.json({
      success: true,
      message: "データ更新が完了しました",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manual Refresh] Error:", error);
    return NextResponse.json(
      { success: false, error: "データ更新に失敗しました" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
