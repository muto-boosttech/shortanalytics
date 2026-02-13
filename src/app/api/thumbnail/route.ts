import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Instagram embedページからサムネイルURLを再取得する
 * shortCode例: DRRiCnygaTs
 */
async function fetchInstagramThumbnailFromEmbed(shortCode: string): Promise<string | null> {
  try {
    const embedUrl = `https://www.instagram.com/p/${shortCode}/embed/`;
    const response = await fetch(embedUrl, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const html = await response.text();

    // まず &amp; を & にデコード
    const decodedHtml = html.replace(/&amp;/g, "&");

    // embedページからscontent CDN URLを抽出
    // t51.2885-15 = 投稿画像/動画サムネイル
    // t51.71878-15 = Reel画像
    // プロフィール画像は t51.2885-19 なので除外される
    const regex = /https:\/\/scontent[^\s"'<>]*?cdninstagram\.com\/v\/t51\.(?:2885|71878)-15\/[^\s"'<>]+/g;
    const matches = decodedHtml.match(regex);

    if (matches && matches.length > 0) {
      // 最初のマッチを返す（投稿のサムネイル画像）
      // URLの末尾にある不要な文字（例: 640w, 750w, 1080w）を除去
      let url = matches[0];
      url = url.replace(/\s+\d+w$/, "");
      return url;
    }

    return null;
  } catch (error) {
    console.error("Instagram embed fetch error:", error);
    return null;
  }
}

/**
 * Instagram CDN URLの署名が期限切れかどうかを判定
 */
function isInstagramUrlExpired(url: string): boolean {
  const match = url.match(/oe=([0-9a-fA-F]+)/);
  if (!match) return true; // oeパラメータがない場合は期限切れとみなす
  
  try {
    const expiryTimestamp = parseInt(match[1], 16);
    const now = Math.floor(Date.now() / 1000);
    // 1時間のバッファを持たせる
    return expiryTimestamp < (now + 3600);
  } catch {
    return true;
  }
}

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

    // プラットフォーム判定
    const platform = videoId.startsWith("yt_") ? "youtube" : videoId.startsWith("ig_") ? "instagram" : "tiktok";

    // YouTube動画の場合、サムネイルURLを直接生成
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

    // Instagram動画の場合
    if (platform === "instagram") {
      const currentUrl = video?.thumbnailUrl;
      
      // DBにURLがあり、署名が有効で、refreshが要求されていなければそのまま返す
      if (currentUrl && !refresh && !isInstagramUrlExpired(currentUrl)) {
        return NextResponse.json({
          thumbnailUrl: currentUrl,
          source: "database",
        });
      }

      // 署名切れまたはrefresh要求 → embedページから最新URLを取得
      const shortCode = videoId.replace("ig_", "");
      const newThumbnailUrl = await fetchInstagramThumbnailFromEmbed(shortCode);
      
      if (newThumbnailUrl) {
        // DBを更新
        if (video) {
          await prisma.video.update({
            where: { tiktokVideoId: videoId },
            data: { thumbnailUrl: newThumbnailUrl },
          });
        }
        return NextResponse.json({
          thumbnailUrl: newThumbnailUrl,
          source: "instagram_embed_refresh",
        });
      }

      // embedからも取得できない場合、既存のURLを返す（プロキシ経由で試す価値はある）
      return NextResponse.json({
        thumbnailUrl: currentUrl || null,
        source: "instagram_fallback",
      });
    }

    // TikTok動画の場合
    // DBにサムネイルURLがあり、refreshが要求されていなければそのまま返す
    if (video?.thumbnailUrl && !refresh) {
      return NextResponse.json({
        thumbnailUrl: video.thumbnailUrl,
        source: "database",
      });
    }

    // TikTok動画の場合、oEmbed APIで取得
    const videoUrl = video?.videoUrl || `https://www.tiktok.com/@user/video/${videoId}`;
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;

    const response = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    });

    if (!response.ok) {
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
