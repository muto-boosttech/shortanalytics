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
 * Instagram CDN URLかどうかを判定
 */
function isInstagramCdnUrl(url: string): boolean {
  return url.includes("cdninstagram.com") || url.includes("fbcdn.net");
}

/**
 * Instagram CDN URLの署名が期限切れかどうかを判定
 */
function isInstagramUrlExpired(url: string): boolean {
  const match = url.match(/oe=([0-9a-fA-F]+)/);
  if (!match) return true;
  
  try {
    const expiryTimestamp = parseInt(match[1], 16);
    const now = Math.floor(Date.now() / 1000);
    // 1時間のバッファを持たせる
    return expiryTimestamp < (now + 3600);
  } catch {
    return true;
  }
}

/**
 * Instagram CDN URLをプロキシURL経由に変換
 */
function toProxyUrl(url: string): string {
  if (isInstagramCdnUrl(url)) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * 動画のサムネイルを表示するコンポーネント（TikTok/YouTube/Instagram対応）
 * 
 * Instagram動画の場合:
 * 1. DBのthumbnailUrlの署名が有効 → プロキシ経由で表示
 * 2. 署名切れ → thumbnail APIでembedページから最新URLを再取得 → プロキシ経由で表示
 * 3. 取得失敗 → グラデーションプレースホルダー
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

    // YouTube動画の場合、サムネイルURLを直接生成
    if (platform === "youtube") {
      const ytId = videoId.replace("yt_", "");
      setImgSrc(`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // Instagram動画の場合
    if (platform === "instagram") {
      // DBのURLがあり、署名が有効ならプロキシ経由で表示
      if (thumbnailUrl && isInstagramCdnUrl(thumbnailUrl) && !isInstagramUrlExpired(thumbnailUrl)) {
        setImgSrc(toProxyUrl(thumbnailUrl));
        setIsLoading(false);
        setHasError(false);
        return;
      }

      // 署名切れまたはURLなし → thumbnail APIでembedページから最新URLを取得
      const fetchFreshThumbnail = async () => {
        try {
          const response = await fetch(`/api/thumbnail?videoId=${videoId}&refresh=true`);
          if (response.ok) {
            const data = await response.json();
            if (data.thumbnailUrl) {
              setImgSrc(toProxyUrl(data.thumbnailUrl));
              setIsLoading(false);
              setHasError(false);
              return;
            }
          }
        } catch (error) {
          console.log("Instagram thumbnail refresh failed:", error);
        }
        
        // 取得失敗時はプレースホルダーを表示
        setHasError(true);
        setIsLoading(false);
      };

      fetchFreshThumbnail();
      return;
    }

    // TikTok動画の場合
    if (thumbnailUrl) {
      setImgSrc(thumbnailUrl);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // DBにサムネイルURLがない場合、thumbnail APIで取得
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
      
      setHasError(true);
      setIsLoading(false);
    };

    fetchThumbnail();
  }, [videoId, thumbnailUrl, platform]);

  const handleError = async () => {
    // 1回だけリフレッシュ取得を試みる
    if (retryCount < 1) {
      setRetryCount((prev) => prev + 1);
      try {
        const response = await fetch(`/api/thumbnail?videoId=${videoId}&refresh=true`);
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnailUrl) {
            const newSrc = platform === "instagram" ? toProxyUrl(data.thumbnailUrl) : data.thumbnailUrl;
            if (newSrc !== imgSrc) {
              setImgSrc(newSrc);
              setHasError(false);
              return;
            }
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
