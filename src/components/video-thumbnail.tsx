"use client";

import { useState, useEffect, useRef } from "react";
import { Play } from "lucide-react";

interface VideoThumbnailProps {
  videoId: string;
  thumbnailUrl?: string | null;
  description?: string;
  className?: string;
  showPlayIcon?: boolean;
}

/**
 * 動画のサムネイルを表示するコンポーネント（TikTok/YouTube/Instagram対応）
 * 
 * 優先順位:
 * 1. DBに保存されたthumbnailUrl
 * 2. 画像読み込み失敗時はサーバーサイドAPIでrefresh=trueでoEmbed再取得
 * 3. グラデーションプレースホルダー
 */
export function VideoThumbnail({
  videoId,
  thumbnailUrl,
  description = "動画",
  className = "",
  showPlayIcon = true,
}: VideoThumbnailProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const prevVideoIdRef = useRef<string | null>(null);

  // プラットフォームを判定
  const platform = videoId.startsWith("yt_") ? "youtube" : videoId.startsWith("ig_") ? "instagram" : "tiktok";

  // プラットフォーム別のグラデーションカラー
  const gradientClass = platform === "youtube"
    ? "from-red-500 to-red-700"
    : platform === "instagram"
    ? "from-purple-500 via-pink-500 to-orange-400"
    : "from-indigo-500 to-pink-500";

  // プラットフォーム名
  const platformLabel = platform === "youtube" ? "YouTube" : platform === "instagram" ? "Instagram" : "TikTok";

  useEffect(() => {
    // videoIdが変わった場合は状態をリセット
    if (prevVideoIdRef.current !== videoId) {
      setImgSrc(null);
      setIsLoading(true);
      setHasError(false);
      setRetryCount(0);
      prevVideoIdRef.current = videoId;
    }

    // DBに保存されたサムネイルURLがあれば使用
    if (thumbnailUrl) {
      setImgSrc(thumbnailUrl);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // YouTube動画の場合、サムネイルURLを直接生成
    if (platform === "youtube") {
      const ytId = videoId.replace("yt_", "");
      setImgSrc(`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // TikTok/Instagram動画の場合、サーバーサイドAPIを通じて取得
    if (platform === "tiktok" || platform === "instagram") {
      const fetchThumbnail = async () => {
        try {
          const response = await fetch(`/api/thumbnail?videoId=${videoId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.thumbnailUrl) {
              setImgSrc(data.thumbnailUrl);
              setIsLoading(false);
              setHasError(false);
              return;
            }
          }
        } catch (error) {
          console.log("Thumbnail fetch failed:", error);
        }
        
        // 取得失敗時はプレースホルダーを表示
        setHasError(true);
        setIsLoading(false);
      };

      fetchThumbnail();
      return;
    }

    // その他の場合はプレースホルダー
    setHasError(true);
    setIsLoading(false);
  }, [videoId, thumbnailUrl, platform]);

  const handleError = async () => {
    // 1回だけoEmbedでリフレッシュ取得を試みる（署名切れ対策）
    if (retryCount < 1 && (platform === "tiktok" || platform === "instagram")) {
      setRetryCount((prev) => prev + 1);
      try {
        const response = await fetch(`/api/thumbnail?videoId=${videoId}&refresh=true`);
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnailUrl && data.thumbnailUrl !== imgSrc) {
            setImgSrc(data.thumbnailUrl);
            setHasError(false);
            return;
          }
        }
      } catch (error) {
        console.log("Thumbnail retry failed:", error);
      }
    }
    setHasError(true);
    setImgSrc(null);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  return (
    <div className={`relative bg-gradient-to-br ${gradientClass} ${className}`}>
      {isLoading ? (
        // ローディング状態
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      ) : hasError || !imgSrc ? (
        // プレースホルダー表示
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          {showPlayIcon && (
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Play className="h-6 w-6 text-white" fill="white" />
            </div>
          )}
          <span className="text-lg font-bold">{platformLabel}</span>
          <span className="text-sm opacity-70">動画</span>
        </div>
      ) : (
        // サムネイル画像表示
        <img
          src={imgSrc}
          alt={description}
          className="h-full w-full object-cover"
          onError={handleError}
          onLoad={handleLoad}
          loading="lazy"
        />
      )}
      
      {/* 再生アイコンオーバーレイ（画像がある場合のみ） */}
      {showPlayIcon && !isLoading && !hasError && imgSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
            <Play className="h-6 w-6 text-white" fill="white" />
          </div>
        </div>
      )}
    </div>
  );
}
