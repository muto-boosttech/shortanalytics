import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tategatashort-analytics.com"),
  title: {
    default: "BOOSTTECH 縦型ショート動画分析 | ブーストテック - TikTok・YouTube Shorts・Instagram Reels トレンド分析ツール",
    template: "%s | BOOSTTECH 縦型ショート動画分析",
  },
  description:
    "BOOSTTECH（ブーストテック）の縦型ショート動画分析ツール。TikTok、YouTube Shorts、Instagram Reelsの3プラットフォームを横断分析。コンテンツ類型・フック・動画尺の多角的分析、AIによる成功パターン自動分析、PDF/CSV/PPTXレポート出力に対応。7日間無料トライアル。",
  keywords: [
    "BOOSTTECH",
    "ブーストテック",
    "縦型ショート動画",
    "ショート動画分析",
    "TikTok分析",
    "YouTube Shorts分析",
    "Instagram Reels分析",
    "SNS分析ツール",
    "動画マーケティング",
    "コンテンツ分析",
    "エンゲージメント率",
    "バズ動画",
    "トレンド分析",
    "AI分析",
    "ショート動画トレンド",
    "SNSマーケティングツール",
  ],
  authors: [{ name: "BOOSTTECH" }],
  creator: "BOOSTTECH",
  publisher: "BOOSTTECH",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "BOOSTTECH 縦型ショート動画分析",
    title: "BOOSTTECH 縦型ショート動画分析 | TikTok・YouTube Shorts・Instagram Reels トレンド分析",
    description:
      "3プラットフォームのショート動画データを自動収集・分析。コンテンツ類型、フック、動画尺などの多角的な分析で、バズる動画の法則を見つけましょう。7日間無料トライアル。",
    images: [
      {
        url: "/images/screenshot-dashboard.png",
        width: 1200,
        height: 630,
        alt: "BOOSTTECH 縦型ショート動画分析 ダッシュボード",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BOOSTTECH 縦型ショート動画分析",
    description:
      "TikTok・YouTube Shorts・Instagram Reelsの3プラットフォームを横断分析。AIによる成功パターン自動分析。7日間無料トライアル。",
    images: ["/images/screenshot-dashboard.png"],
  },
  alternates: {
    canonical: "https://tategatashort-analytics.com",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <head>
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* JSON-LD 構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "BOOSTTECH 縦型ショート動画分析",
              alternateName: ["ブーストテック", "BOOSTTECH"],
              description:
                "TikTok、YouTube Shorts、Instagram Reelsの3プラットフォームを横断分析するショート動画分析ツール",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: [
                {
                  "@type": "Offer",
                  name: "Free",
                  price: "0",
                  priceCurrency: "JPY",
                  description: "7日間無料トライアル",
                },
                {
                  "@type": "Offer",
                  name: "Starter",
                  description: "個人や小規模チームでの分析に",
                },
                {
                  "@type": "Offer",
                  name: "Premium",
                  description: "本格的な分析運用をしたい方に",
                },
                {
                  "@type": "Offer",
                  name: "Max",
                  description: "大規模運用・代理店向け",
                },
              ],
              featureList: [
                "TikTokデータ収集・分析",
                "YouTube Shortsデータ収集・分析",
                "Instagram Reelsデータ収集・分析",
                "AIによる成功パターン自動分析",
                "コンテンツ類型別分析",
                "フック別再生数分析",
                "PDF/CSV/PPTXレポート出力",
                "業種別ランキング",
              ],
              creator: {
                "@type": "Organization",
                name: "BOOSTTECH",
                alternateName: "ブーストテック",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Freeプランはどのくらい使えますか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Freeプランは登録日から7日間ご利用いただけます。期間中はデータ更新（週1回/媒体×カテゴリ）、AI分析（月3回）、エクスポート（月3回）をお試しいただけます。",
                  },
                },
                {
                  "@type": "Question",
                  name: "対応しているSNSプラットフォームは？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "TikTok、YouTube Shorts、Instagram Reelsの3つのプラットフォームに対応しています。",
                  },
                },
                {
                  "@type": "Question",
                  name: "申し込み後すぐに使えますか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "はい、アカウント作成後すぐにログインしてご利用いただけます。",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${notoSansJP.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
