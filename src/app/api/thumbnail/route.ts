import { NextRequest, NextResponse } from "next/server";

// GET /api/thumbnail?videoId=xxx - TikTok動画のサムネイルURLを取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { error: "videoIdが必要です" },
        { status: 400 }
      );
    }

    // TikTok oEmbed APIを使用してサムネイルを取得
    const videoUrl = `https://www.tiktok.com/@user/video/${videoId}`;
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;

    const response = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 86400 }, // 24時間キャッシュ
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "サムネイルの取得に失敗しました", thumbnailUrl: null },
        { status: 200 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      thumbnailUrl: data.thumbnail_url || null,
      title: data.title || null,
      authorName: data.author_name || null,
    });
  } catch (error) {
    console.error("Error fetching thumbnail:", error);
    return NextResponse.json(
      { error: "サムネイルの取得に失敗しました", thumbnailUrl: null },
      { status: 200 }
    );
  }
}
