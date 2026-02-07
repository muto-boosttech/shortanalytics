import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface InstagramReelItem {
  type: string; // "Video" | "Image"
  shortCode: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  url: string;
  commentsCount: number;
  displayUrl: string;
  images: string[];
  videoUrl?: string;
  likesCount: number;
  videoPlayCount?: number;
  igPlayCount?: number;
  reshareCount?: number;
  timestamp: string;
  ownerFullName: string;
  ownerUsername: string;
  ownerId: string;
  productType: string; // "clips" = Reels, "feed" = 通常投稿
  videoDuration?: number;
  musicInfo?: {
    artist_name?: string;
    song_name?: string;
    audio_type?: string;
  };
  locationName?: string;
  dimensionsHeight?: number;
  dimensionsWidth?: number;
}

// リトライ設定
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Apify Instagram Hashtag Scraper APIを呼び出す関数（リトライ付き）
async function callApifyInstagramWithRetry(
  hashtags: string[],
  maxResults: number,
  apiToken: string,
  maxRetries: number = MAX_RETRIES
): Promise<InstagramReelItem[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Apify Instagram Hashtag Scraper API呼び出し: 試行 ${attempt}/${maxRetries}`);

      // apify/instagram-hashtag-scraper を使用
      const apifyUrl = `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${apiToken}`;

      const apifyResponse = await fetch(apifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hashtags: hashtags.map(h => h.replace(/^#/, "")),
          resultsType: "reels",
          resultsLimit: maxResults,
        }),
      });

      if (!apifyResponse.ok) {
        const errorText = await apifyResponse.text();
        throw new Error(`Apify APIエラー: ${apifyResponse.status} - ${errorText}`);
      }

      const apifyData: InstagramReelItem[] = await apifyResponse.json();

      // resultsType: "reels" で取得しているので全て動画のはず
      // 念のため type === "Video" のみフィルタリング
      const reelsOnly = apifyData.filter(item => item.type === "Video");

      console.log(`Apify Instagram Scraper API成功: ${apifyData.length}件取得, Reels: ${reelsOnly.length}件`);
      return reelsOnly;

    } catch (error) {
      lastError = error as Error;
      console.error(`Apify Instagram Scraper API失敗 (試行 ${attempt}/${maxRetries}):`, lastError.message);

      if (attempt < maxRetries) {
        console.log(`${RETRY_DELAY_MS / 1000}秒後にリトライします...`);
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError || new Error("Apify Instagram Scraper API呼び出しに失敗しました");
}

// POST /api/collect-instagram - Apify Instagram Hashtag Scraperを使用してReelsを収集
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

    // 収集ログを作成
    const collectionLog = await prisma.collectionLog.create({
      data: {
        industryId: industryId || null,
        hashtag: hashtags.join(", "),
        status: "running",
        startedAt: new Date(),
        platform: "instagram",
      },
    });

    try {
      // Apify APIを呼び出し（リトライ付き）
      const apifyData = await callApifyInstagramWithRetry(
        hashtags,
        maxResults,
        APIFY_API_TOKEN,
        MAX_RETRIES
      );

      // 収集結果を処理
      let videosNew = 0;
      let videosUpdated = 0;

      for (const item of apifyData) {
        const viewCount = item.videoPlayCount || item.igPlayCount || 0;
        // likesCountが-1の場合は非公開なので0として扱う
        const likeCount = item.likesCount > 0 ? item.likesCount : 0;
        const commentCount = item.commentsCount || 0;
        const shareCount = item.reshareCount || 0;
        const engagementRate =
          viewCount > 0 ? (likeCount + commentCount + shareCount) / viewCount : 0;

        // ハッシュタグを配列として保存
        const hashtagsArray = item.hashtags || [];

        // 投稿日時を変換
        const postedAt = item.timestamp ? new Date(item.timestamp) : null;

        // 動画尺を秒数に変換（Instagramは浮動小数点で返される）
        const durationSeconds = item.videoDuration
          ? Math.round(item.videoDuration)
          : null;

        // Instagram Reel IDをユニークキーとして使用（ig_プレフィックスを付ける）
        const videoId = `ig_${item.shortCode}`;

        // 説明文（キャプション）
        const description = item.caption || "";

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
              authorUsername: item.ownerUsername || null,
              authorFollowerCount: null, // Hashtag Scraperではフォロワー数は取得できない
              postedAt,
              thumbnailUrl: item.displayUrl || null,
              collectedAt: new Date(),
              platform: "instagram",
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
              authorUsername: item.ownerUsername || null,
              authorFollowerCount: null,
              postedAt,
              thumbnailUrl: item.displayUrl || null,
              collectedAt: new Date(),
              source: "apify",
              platform: "instagram",
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
          platform: "instagram",
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
    console.error("Error collecting Instagram Reels:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Instagram Reelsの収集に失敗しました: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
