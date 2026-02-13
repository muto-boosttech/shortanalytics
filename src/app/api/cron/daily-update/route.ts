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

  const collectionLog = await prisma.collectionLog.create({
    data: { industryId, hashtag: hashtags.join(", "), status: "running", startedAt: new Date() },
  });

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/clockworks~tiktok-hashtag-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(apifyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hashtags, resultsPerPage: 30 }) });
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
  const searchQueries = hashtags.map((h) => h.startsWith('#') ? h : `#${h}`);

  const collectionLog = await prisma.collectionLog.create({
    data: { industryId, hashtag: hashtags.join(", "), status: "running", startedAt: new Date(), platform: "youtube" },
  });

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(apifyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ searchQueries, maxResults: 30, maxResultsShorts: 30 }) });
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

  const collectionLog = await prisma.collectionLog.create({
    data: { industryId, hashtag: hashtags.join(", "), status: "running", startedAt: new Date(), platform: "instagram" },
  });

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(apifyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hashtags: hashtags.map(h => h.replace(/^#/, "")), resultsType: "reels", resultsLimit: 30 }) });
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

// ===== ベンチマーク再計算 =====
async function recalculateBenchmarks() {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() - 1);
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd);
  periodStart.setMonth(periodStart.getMonth() - 1);
  periodStart.setHours(0, 0, 0, 0);

  const industries = await prisma.industry.findMany();
  for (const industry of industries) {
    const videos = await prisma.video.findMany({
      where: { videoTags: { some: { industryId: industry.id } }, postedAt: { gte: periodStart, lte: periodEnd } },
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

    const existing = await prisma.benchmark.findFirst({ where: { industryId: industry.id, periodStart, periodEnd } });
    if (existing) {
      await prisma.benchmark.update({ where: { id: existing.id }, data: { avgEngagementRate, medianViewCount, topContentTypes: JSON.stringify(topContentTypes), topHookTypes: JSON.stringify(topHookTypes), sampleSize: videos.length, calculatedAt: new Date() } });
    } else {
      await prisma.benchmark.create({ data: { industryId: industry.id, periodStart, periodEnd, avgEngagementRate, medianViewCount, topContentTypes: JSON.stringify(topContentTypes), topHookTypes: JSON.stringify(topHookTypes), sampleSize: videos.length } });
    }
  }
}

// GET /api/cron/daily-update - 毎日9時JSTに自動実行（内部fetchを排除し直接実行）
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

    console.log("[Daily Update] Starting...");

    const industries = await prisma.industry.findMany({ orderBy: { id: "asc" } });
    const platforms = ["tiktok", "youtube", "instagram"];
    const collectResults: Array<{ industry: string; platform: string; status: string; total?: number }> = [];

    // 1. データ収集（全業種×全プラットフォーム）
    for (const ind of industries) {
      for (const plat of platforms) {
        try {
          console.log(`[Daily Update] Collecting ${plat} for ${ind.name}...`);
          let result;
          if (plat === "tiktok") result = await collectTikTok(ind.id, APIFY_API_TOKEN);
          else if (plat === "youtube") result = await collectYouTube(ind.id, APIFY_API_TOKEN);
          else result = await collectInstagram(ind.id, APIFY_API_TOKEN);

          collectResults.push({ industry: ind.name, platform: plat, status: "success", total: result.total });
          console.log(`[Daily Update] ${plat} for ${ind.name}: ${result.total}件`);
        } catch (error) {
          console.error(`[Daily Update] Error ${plat} for ${ind.name}:`, error);
          collectResults.push({ industry: ind.name, platform: plat, status: "failed" });
        }
        await delay(2000);
      }
    }

    // 2. 自動タグ付け
    console.log("[Daily Update] Auto-tagging...");
    await prisma.videoTag.deleteMany({});
    const videos = await prisma.video.findMany({ where: { videoTags: { none: {} } } });
    let tagged = 0;
    for (const video of videos) {
      const hashtags = Array.isArray(video.hashtags) ? video.hashtags as string[] : [];
      const targetIndustryId = detectIndustryFromHashtags(hashtags) || 11;
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

    // 3. サムネイル更新（TikTok oEmbed + YouTube直接生成）
    console.log("[Daily Update] Updating thumbnails...");
    let thumbUpdated = 0;
    const noThumbVideos = await prisma.video.findMany({
      where: { thumbnailUrl: null },
      select: { id: true, tiktokVideoId: true, platform: true },
      take: 200,
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
      message: "Daily update completed",
      collections: collectResults,
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
