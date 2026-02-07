import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

// リトライ設定
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5秒

// 遅延関数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 動画尺を秒数に変換（HH:MM:SS形式から）
function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null;
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return null;
}

// Apify APIを呼び出す関数（リトライ付き）- streamers~youtube-scraperを使用
async function callApifyWithRetry(
  searchKeywords: string[],
  maxResults: number,
  apiToken: string,
  maxRetries: number = MAX_RETRIES
): Promise<YouTubeVideoItem[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Apify YouTube Scraper API呼び出し: 試行 ${attempt}/${maxRetries}`);
      
      // streamers~youtube-scraper を使用（likes/comments対応）
      const apifyUrl = `https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?token=${apiToken}`;

      const apifyResponse = await fetch(apifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchKeywords,
          maxResults,
          maxResultsShorts: maxResults,
          searchType: "video",
          verboseLog: false,
        }),
      });

      if (!apifyResponse.ok) {
        const errorText = await apifyResponse.text();
        throw new Error(`Apify APIエラー: ${apifyResponse.status} - ${errorText}`);
      }

      const apifyData: YouTubeVideoItem[] = await apifyResponse.json();
      
      // Shortsのみフィルタリング（URLに/shortsが含まれる、または60秒以下）
      const shortsOnly = apifyData.filter(item => {
        const isShortUrl = item.url?.includes('/shorts/');
        const duration = parseDuration(item.duration);
        const isShortDuration = duration !== null && duration <= 60;
        return isShortUrl || isShortDuration;
      });
      
      console.log(`Apify YouTube Scraper API成功: ${apifyData.length}件取得, Shorts: ${shortsOnly.length}件`);
      return shortsOnly;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Apify YouTube Scraper API失敗 (試行 ${attempt}/${maxRetries}):`, lastError.message);
      
      if (attempt < maxRetries) {
        console.log(`${RETRY_DELAY_MS / 1000}秒後にリトライします...`);
        await delay(RETRY_DELAY_MS);
      }
    }
  }
  
  throw lastError || new Error("Apify YouTube Scraper API呼び出しに失敗しました");
}

// POST /api/collect-youtube - Apify YouTube Scraperを使用して動画を収集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { hashtags, industryId, maxResults = 30, apiToken } = body;

    // UIから渡されたトークンまたは環境変数のトークンを使用
    const APIFY_API_TOKEN = apiToken || process.env.APIFY_API_TOKEN;

    if (!APIFY_API_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: "APIFY_API_TOKENが設定されていません。環境変数を設定するか、UIからトークンを入力してください。",
        },
        { status: 500 }
      );
    }

    // 業種の存在確認とハッシュタグ取得
    let industry = null;
    if (industryId) {
      industry = await prisma.industry.findUnique({
        where: { id: industryId },
        include: {
          hashtags: {
            where: { 
              isActive: true,
              platform: "youtube",
            },
          },
        },
      });

      if (!industry) {
        return NextResponse.json(
          { success: false, error: "業種が見つかりません" },
          { status: 404 }
        );
      }

      // 業種のハッシュタグを使用（ハッシュタグが指定されていない場合）
      if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
        hashtags = industry.hashtags.map((h: { hashtag: string }) => h.hashtag);
      }
    }

    if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return NextResponse.json(
        { success: false, error: "ハッシュタグの配列が必要です" },
        { status: 400 }
      );
    }

    // 検索キーワードを作成（ハッシュタグを検索キーワードとして使用）
    const searchKeywords = hashtags.map((h: string) => 
      h.startsWith('#') ? h : `#${h}`
    );

    // 収集ログを作成
    const collectionLog = await prisma.collectionLog.create({
      data: {
        industryId: industryId || null,
        hashtag: hashtags.join(", "),
        status: "running",
        startedAt: new Date(),
        platform: "youtube",
      },
    });

    try {
      // Apify APIを呼び出し（リトライ付き）
      const apifyData = await callApifyWithRetry(
        searchKeywords,
        maxResults,
        APIFY_API_TOKEN,
        MAX_RETRIES
      );

      // 収集結果を処理
      let videosNew = 0;
      let videosUpdated = 0;

      for (const item of apifyData) {
        const viewCount = item.viewCount || 0;
        // likes または numberOfLikes を使用
        const likeCount = item.likes || item.numberOfLikes || 0;
        // commentsCount または numberOfComments を使用
        const commentCount = item.commentsCount || item.numberOfComments || 0;
        const shareCount = 0; // YouTubeにはシェア数がない
        const engagementRate =
          viewCount > 0 ? (likeCount + commentCount) / viewCount : 0;

        // ハッシュタグを配列として保存
        const hashtagsArray = item.hashtags || [];

        // 投稿日時を変換
        const postedAt = item.date ? new Date(item.date) : null;

        // 動画尺を秒数に変換
        const durationSeconds = parseDuration(item.duration);

        // YouTube動画IDをユニークキーとして使用（yt_プレフィックスを付ける）
        const videoId = `yt_${item.id}`;

        // 説明文（title または text を使用）
        const description = item.title || item.text || "";

        // 既存の動画を確認
        const existing = await prisma.video.findUnique({
          where: { tiktokVideoId: videoId },
        });

        if (existing) {
          // 更新
          await prisma.video.update({
            where: { tiktokVideoId: videoId },
            data: {
              videoUrl: item.url,
              description,
              hashtags: hashtagsArray,
              viewCount,
              likeCount,
              commentCount,
              shareCount,
              engagementRate,
              videoDurationSeconds: durationSeconds,
              authorUsername: item.channelName || null,
              authorFollowerCount: item.numberOfSubscribers || null,
              postedAt,
              thumbnailUrl: item.thumbnailUrl || null,
              collectedAt: new Date(),
              platform: "youtube",
            },
          });
          videosUpdated++;
        } else {
          // 新規作成
          await prisma.video.create({
            data: {
              tiktokVideoId: videoId,
              videoUrl: item.url,
              description,
              hashtags: hashtagsArray,
              viewCount,
              likeCount,
              commentCount,
              shareCount,
              engagementRate,
              videoDurationSeconds: durationSeconds,
              authorUsername: item.channelName || null,
              authorFollowerCount: item.numberOfSubscribers || null,
              postedAt,
              thumbnailUrl: item.thumbnailUrl || null,
              collectedAt: new Date(),
              source: "apify",
              platform: "youtube",
            },
          });
          videosNew++;
        }
      }

      // 収集ログを更新
      await prisma.collectionLog.update({
        where: { id: collectionLog.id },
        data: {
          videosCollected: apifyData.length,
          videosNew,
          videosUpdated,
          status: "completed",
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          collectionLogId: collectionLog.id,
          videosCollected: apifyData.length,
          videosNew,
          videosUpdated,
          platform: "youtube",
        },
      });
    } catch (apifyError) {
      // エラー時に収集ログを更新
      await prisma.collectionLog.update({
        where: { id: collectionLog.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          errorMessage: `${MAX_RETRIES}回のリトライ後に失敗: ${(apifyError as Error).message}`,
        },
      });

      throw apifyError;
    }
  } catch (error) {
    console.error("Error collecting YouTube videos:", error);
    return NextResponse.json(
      {
        success: false,
        error: `YouTube動画の収集に失敗しました: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
