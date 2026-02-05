import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/videos/update-thumbnails - サムネイルURLがない動画のサムネイルを一括取得・更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 50;

    // サムネイルURLがない動画を取得
    const videos = await prisma.video.findMany({
      where: {
        thumbnailUrl: null,
      },
      select: {
        id: true,
        tiktokVideoId: true,
      },
      take: limit,
    });

    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        message: "更新対象の動画がありません",
        updated: 0,
      });
    }

    let updated = 0;
    let failed = 0;

    for (const video of videos) {
      try {
        // TikTok oEmbed APIを使用してサムネイルを取得
        const videoUrl = `https://www.tiktok.com/@user/video/${video.tiktokVideoId}`;
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;

        const response = await fetch(oembedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.thumbnail_url) {
            await prisma.video.update({
              where: { id: video.id },
              data: { thumbnailUrl: data.thumbnail_url },
            });
            updated++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }

        // レート制限を避けるため少し待機
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to update thumbnail for video ${video.id}:`, error);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updated}件のサムネイルを更新しました`,
      updated,
      failed,
      total: videos.length,
    });
  } catch (error) {
    console.error("Error updating thumbnails:", error);
    return NextResponse.json(
      {
        success: false,
        error: `サムネイルの更新に失敗しました: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
