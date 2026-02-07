import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 画像最適化
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30日キャッシュ
  },
  // 圧縮有効化
  compress: true,
  // パフォーマンス最適化
  poweredByHeader: false,
  // 実験的機能
  experimental: {
    optimizeCss: true,
  },
  // ヘッダー設定（キャッシュ）
  async headers() {
    return [
      {
        source: "/:path*.:ext(js|css|woff2|woff|ttf|ico|png|jpg|jpeg|webp|svg|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/videos/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
