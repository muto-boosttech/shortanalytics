import { NextRequest, NextResponse } from "next/server";

// GET /api/image-proxy?url=xxx - Instagram CDN画像をプロキシして返す
// Instagram CDNの署名付きURLはブラウザから直接アクセスすると403になるため、
// サーバーサイドでプロキシして返す
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    // セキュリティ: Instagram CDNドメインのみ許可
    const allowedDomains = [
      "cdninstagram.com",
      "instagram.com",
      "fbcdn.net",
    ];
    
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return new NextResponse("Invalid URL", { status: 400 });
    }

    const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
    if (!isAllowed) {
      return new NextResponse("Domain not allowed", { status: 403 });
    }

    // サーバーサイドで画像を取得
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": "https://www.instagram.com/",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return new NextResponse("Image fetch failed", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
