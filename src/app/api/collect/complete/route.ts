import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

interface YouTubeVideoItem {
  title: string;
  id: string;
  url: string;
  thumbnailUrl: string;
  viewCount: number;
  type: string;
  likes?: number;
  numberOfLikes?: number;
  commentsCount?: number;
  numberOfComments?: number;
  duration?: string;
  channelName?: string;
  channelUrl?: string;
  channelId?: string;
  numberOfSubscribers?: number;
  date?: string;
  hashtags?: string[];
  text?: string;
}

interface InstagramReelItem {
  type: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  url: string;
  commentsCount: number;
  displayUrl: string;
  likesCount: number;
  videoPlayCount?: number;
  igPlayCount?: number;
  reshareCount?: number;
  timestamp: string;
  ownerUsername: string;
  videoDuration?: number;
}

function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null;
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function parseRelativeDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  // まず通常のDate.parseを試す
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  // 相対日付をパース: "6 months ago", "2 weeks ago", "1 year ago", etc.
  const match = dateStr.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!match) return null;
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const now = new Date();
  switch (unit) {
    case 'second': now.setSeconds(now.getSeconds() - amount); break;
    case 'minute': now.setMinutes(now.getMinutes() - amount); break;
    case 'hour': now.setHours(now.getHours() - amount); break;
    case 'day': now.setDate(now.getDate() - amount); break;
    case 'week': now.setDate(now.getDate() - amount * 7); break;
    case 'month': now.setMonth(now.getMonth() - amount); break;
    case 'year': now.setFullYear(now.getFullYear() - amount); break;
  }
  return now;
}

// POST /api/collect/complete - Apifyジョブ完了後にデータセットを取得してDBに保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, collectionLogId, platform } = body;

    if (!runId || !collectionLogId) {
      return NextResponse.json(
        { success: false, error: "runIdとcollectionLogIdが必要です" },
        { status: 400 }
      );
    }

    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
    if (!APIFY_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_TOKENが設定されていません" },
        { status: 500 }
      );
    }

    // Apify Run情報を取得してdatasetIdを確認
    const runUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`;
    const runResponse = await fetch(runUrl);
    if (!runResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Apify Run情報の取得に失敗しました" },
        { status: 500 }
      );
    }
    const runData = await runResponse.json();
    const datasetId = runData.data?.defaultDatasetId;

    if (!datasetId) {
      await prisma.collectionLog.update({
        where: { id: collectionLogId },
        data: { status: "failed", completedAt: new Date(), errorMessage: "データセットIDが見つかりません" },
      });
      return NextResponse.json(
        { success: false, error: "データセットIDが見つかりません" },
        { status: 500 }
      );
    }

    // データセットからアイテムを取得
    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`;
    const datasetResponse = await fetch(datasetUrl);
    if (!datasetResponse.ok) {
      await prisma.collectionLog.update({
        where: { id: collectionLogId },
        data: { status: "failed", completedAt: new Date(), errorMessage: "データセット取得失敗" },
      });
      return NextResponse.json(
        { success: false, error: "データセットの取得に失敗しました" },
        { status: 500 }
      );
    }

    const items = await datasetResponse.json();
    const plat = platform || "tiktok";

    let videosNew = 0;
    let videosUpdated = 0;
    let totalProcessed = 0;

    if (plat === "tiktok") {
      const apifyData = items as ApifyVideoItem[];
      for (const item of apifyData) {
        // エラーレスポンスやIDなしのアイテムをスキップ
        if (!item.id || (item as any).error) continue;
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
            data: {
              videoUrl: item.webVideoUrl, description: item.text, hashtags: hashtagsArray,
              viewCount, likeCount, commentCount, shareCount, engagementRate,
              videoDurationSeconds: item.videoMeta?.duration || null,
              authorUsername: item.authorMeta?.name || null, authorFollowerCount: item.authorMeta?.fans || null,
              postedAt, thumbnailUrl: item.covers?.default || null, collectedAt: new Date(),
            },
          });
          videosUpdated++;
        } else {
          await prisma.video.create({
            data: {
              tiktokVideoId: item.id, videoUrl: item.webVideoUrl, description: item.text,
              hashtags: hashtagsArray, viewCount, likeCount, commentCount, shareCount, engagementRate,
              videoDurationSeconds: item.videoMeta?.duration || null,
              authorUsername: item.authorMeta?.name || null, authorFollowerCount: item.authorMeta?.fans || null,
              postedAt, thumbnailUrl: item.covers?.default || null, collectedAt: new Date(), source: "apify",
              platform: "tiktok",
            },
          });
          videosNew++;
        }
      }
      totalProcessed = apifyData.length;
    } else if (plat === "youtube") {
      const apifyData = (items as YouTubeVideoItem[]).filter(item => item.id && !(item as any).error);
      // Shortsのみフィルタリング
      const shortsOnly = apifyData.filter((item) => {
        const isShortUrl = item.url?.includes("/shorts/");
        const isShortType = item.type === 'shorts';
        const duration = parseDuration(item.duration);
        const isShortDuration = duration !== null && duration <= 60;
        return isShortUrl || isShortType || isShortDuration;
      });

      for (const item of shortsOnly) {
        const viewCount = item.viewCount || 0;
        const likeCount = item.likes || item.numberOfLikes || 0;
        const commentCount = item.commentsCount || item.numberOfComments || 0;
        const shareCount = 0;
        const engagementRate = viewCount > 0 ? (likeCount + commentCount) / viewCount : 0;
        const hashtagsArray = item.hashtags || [];
        const postedAt = parseRelativeDate(item.date);
        const durationSeconds = parseDuration(item.duration);
        const videoId = `yt_${item.id}`;
        const description = item.title || item.text || "";

        const existing = await prisma.video.findUnique({ where: { tiktokVideoId: videoId } });
        if (existing) {
          await prisma.video.update({
            where: { tiktokVideoId: videoId },
            data: {
              videoUrl: item.url, description, hashtags: hashtagsArray,
              viewCount, likeCount, commentCount, shareCount, engagementRate,
              videoDurationSeconds: durationSeconds,
              authorUsername: item.channelName || null, authorFollowerCount: item.numberOfSubscribers || null,
              postedAt, thumbnailUrl: item.thumbnailUrl || null, collectedAt: new Date(), platform: "youtube",
            },
          });
          videosUpdated++;
        } else {
          await prisma.video.create({
            data: {
              tiktokVideoId: videoId, videoUrl: item.url, description, hashtags: hashtagsArray,
              viewCount, likeCount, commentCount, shareCount, engagementRate,
              videoDurationSeconds: durationSeconds,
              authorUsername: item.channelName || null, authorFollowerCount: item.numberOfSubscribers || null,
              postedAt, thumbnailUrl: item.thumbnailUrl || null, collectedAt: new Date(), source: "apify",
              platform: "youtube",
            },
          });
          videosNew++;
        }
      }
      totalProcessed = shortsOnly.length;
    } else if (plat === "instagram") {
      const apifyData = (items as InstagramReelItem[]).filter(item => item.shortCode && !(item as any).error);
      const reelsOnly = apifyData.filter((item) => item.type === "Video");

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
            data: {
              videoUrl: item.url, description, hashtags: hashtagsArray,
              viewCount, likeCount, commentCount, shareCount, engagementRate,
              videoDurationSeconds: durationSeconds,
              authorUsername: item.ownerUsername || null,
              postedAt, thumbnailUrl: (item as any).displayUrl || null, collectedAt: new Date(), platform: "instagram",
            },
          });
          videosUpdated++;
        } else {
          await prisma.video.create({
            data: {
              tiktokVideoId: videoId, videoUrl: item.url, description, hashtags: hashtagsArray,
              viewCount, likeCount, commentCount, shareCount, engagementRate,
              videoDurationSeconds: durationSeconds,
              authorUsername: item.ownerUsername || null,
              postedAt, thumbnailUrl: (item as any).displayUrl || null, collectedAt: new Date(), source: "apify",
              platform: "instagram",
            },
          });
          videosNew++;
        }
      }
      totalProcessed = reelsOnly.length;
    }

    // 収集ログを更新
    await prisma.collectionLog.update({
      where: { id: collectionLogId },
      data: {
        videosCollected: totalProcessed,
        videosNew,
        videosUpdated,
        status: "completed",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        collectionLogId,
        videosCollected: totalProcessed,
        videosNew,
        videosUpdated,
        platform: plat,
      },
    });
  } catch (error) {
    console.error("Error completing collection:", error);
    return NextResponse.json(
      { success: false, error: `データ保存に失敗しました: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
