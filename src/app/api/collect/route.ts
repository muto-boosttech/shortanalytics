import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface ApifyVideoItem {
  id: string;
  text: string;
  playCount: number;
  diggCount: number;
  commentCount: number;
  shareCount: number;
  videoMeta?: {
    duration: number;
  };
  authorMeta?: {
    name: string;
    fans: number;
  };
  createTime: number;
  covers?: {
    default: string;
  };
  webVideoUrl: string;
  hashtags?: Array<{ name: string }>;
}

// POST /api/collect - Apify TikTok Hashtag Scraperを使用して動画を収集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hashtags, industryId, resultsPerPage = 30, apiToken } = body;

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

    if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return NextResponse.json(
        { success: false, error: "ハッシュタグの配列が必要です" },
        { status: 400 }
      );
    }

    // 業種の存在確認（オプション）
    let industry = null;
    if (industryId) {
      industry = await prisma.industry.findUnique({
        where: { id: industryId },
      });

      if (!industry) {
        return NextResponse.json(
          { success: false, error: "業種が見つかりません" },
          { status: 404 }
        );
      }
    }

    // 収集ログを作成
    const collectionLog = await prisma.collectionLog.create({
      data: {
        industryId: industryId || null,
        hashtag: hashtags.join(", "),
        status: "running",
        startedAt: new Date(),
      },
    });

    try {
      // Apify APIを呼び出し（同期エンドポイント）
      const apifyUrl = `https://api.apify.com/v2/acts/clockworks~tiktok-hashtag-scraper/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

      const apifyResponse = await fetch(apifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hashtags,
          resultsPerPage,
        }),
      });

      if (!apifyResponse.ok) {
        const errorText = await apifyResponse.text();
        throw new Error(`Apify APIエラー: ${apifyResponse.status} - ${errorText}`);
      }

      const apifyData: ApifyVideoItem[] = await apifyResponse.json();

      // 収集結果を処理
      let videosNew = 0;
      let videosUpdated = 0;

      for (const item of apifyData) {
        const viewCount = item.playCount || 0;
        const likeCount = item.diggCount || 0;
        const commentCount = item.commentCount || 0;
        const shareCount = item.shareCount || 0;
        const engagementRate =
          viewCount > 0 ? (likeCount + commentCount + shareCount) / viewCount : 0;

        // ハッシュタグを配列として保存（PostgreSQL配列）
        const hashtagsArray = item.hashtags?.map((h) => h.name) || [];

        // 投稿日時をUnixタイムスタンプから変換
        const postedAt = item.createTime ? new Date(item.createTime * 1000) : null;

        // 既存の動画を確認
        const existing = await prisma.video.findUnique({
          where: { tiktokVideoId: item.id },
        });

        if (existing) {
          // 更新
          await prisma.video.update({
            where: { tiktokVideoId: item.id },
            data: {
              videoUrl: item.webVideoUrl,
              description: item.text,
              hashtags: hashtagsArray,
              viewCount,
              likeCount,
              commentCount,
              shareCount,
              engagementRate,
              videoDurationSeconds: item.videoMeta?.duration || null,
              authorUsername: item.authorMeta?.name || null,
              authorFollowerCount: item.authorMeta?.fans || null,
              postedAt,
              thumbnailUrl: item.covers?.default || null,
              collectedAt: new Date(),
            },
          });
          videosUpdated++;
        } else {
          // 新規作成
          await prisma.video.create({
            data: {
              tiktokVideoId: item.id,
              videoUrl: item.webVideoUrl,
              description: item.text,
              hashtags: hashtagsArray,
              viewCount,
              likeCount,
              commentCount,
              shareCount,
              engagementRate,
              videoDurationSeconds: item.videoMeta?.duration || null,
              authorUsername: item.authorMeta?.name || null,
              authorFollowerCount: item.authorMeta?.fans || null,
              postedAt,
              thumbnailUrl: item.covers?.default || null,
              collectedAt: new Date(),
              source: "apify",
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
        },
      });
    } catch (apifyError) {
      // エラー時に収集ログを更新
      await prisma.collectionLog.update({
        where: { id: collectionLog.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          errorMessage: (apifyError as Error).message,
        },
      });

      throw apifyError;
    }
  } catch (error) {
    console.error("Error collecting videos:", error);
    return NextResponse.json(
      {
        success: false,
        error: `動画の収集に失敗しました: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
