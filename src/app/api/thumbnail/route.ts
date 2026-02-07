import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/thumbnail?videoId=xxx&refresh=true - 動画のサムネイルURLを取得（DB優先、oEmbedフォールバック）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get("videoId");
    const refresh = searchParams.get("refresh") === "true";

    if (!videoId) {
      return NextResponse.json(
        { error: "videoIdが必要です" },
        { status: 400 }
      );
    }

    // まずDBからサムネイルURLを確認
    const video = await prisma.video.findUnique({
      where: { tiktokVideoId: videoId },
      select: { thumbnailUrl: true, videoUrl: true, platform: true },
    });

    // DBにサムネイルURLがあり、refreshが要求されていなければそのまま返す
    // ただし、tiktokcdn URLは署名切れの可能性があるのでrefreshフラグで再取得可能
    if (video?.thumbnailUrl && !refresh) {
      return NextResponse.json({
        thumbnailUrl: video.thumbnailUrl,
        source: "database",
      });
    }

    // YouTube動画の場合、サムネイルURLを直接生成
    const platform = videoId.startsWith("yt_") ? "youtube" : videoId.startsWith("ig_") ? "instagram" : "tiktok";
    
    if (platform === "youtube") {
      const ytId = videoId.replace("yt_", "");
      const thumbnailUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
      
      // DBにも保存
      if (video) {
        await prisma.video.update({
          where: { tiktokVideoId: videoId },
          data: { thumbnailUrl },
        });
      }
      
      return NextResponse.json({
        thumbnailUrl,
        source: "youtube_generated",
      });
    }

    // Instagram動画の場合、displayUrlがDBに保存されているはず
    if (platform === "instagram") {
      return NextResponse.json({
        thumbnailUrl: video?.thumbnailUrl || null,
        source: "instagram_unavailable",
      });
    }

    // TikTok動画の場合、oEmbed APIで取得
    // DBのvideoUrlがあればそれを使用、なければ構築
    const videoUrl = video?.videoUrl || `https://www.tiktok.com/@user/video/${videoId}`;
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;

    const response = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store", // キャッシュを無効化して最新のサムネイルを取得
    });

    if (!response.ok) {
      // oEmbedが失敗した場合、既存のDBのURLがあればそれを返す
      if (video?.thumbnailUrl) {
        return NextResponse.json({
          thumbnailUrl: video.thumbnailUrl,
          source: "database_fallback",
        });
      }
      return NextResponse.json(
        { thumbnailUrl: null, source: "oembed_failed" },
        { status: 200 }
      );
    }

    const data = await response.json();
    const thumbnailUrl = data.thumbnail_url || null;

    // 取得成功した場合、DBにも保存して次回以降はDB参照で済むようにする
    if (thumbnailUrl && video) {
      await prisma.video.update({
        where: { tiktokVideoId: videoId },
        data: { thumbnailUrl },
      });
    }

    return NextResponse.json({
      thumbnailUrl,
      title: data.title || null,
      authorName: data.author_name || null,
      source: "oembed",
    });
  } catch (error) {
    console.error("Error fetching thumbnail:", error);
    return NextResponse.json(
      { thumbnailUrl: null, source: "error" },
      { status: 200 }
    );
  }
}
