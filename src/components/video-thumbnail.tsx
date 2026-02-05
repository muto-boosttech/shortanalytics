"use client";

import { useState, useEffect } from "react";
import { Play } from "lucide-react";

interface VideoThumbnailProps {
  videoId: string;
  thumbnailUrl?: string | null;
  description?: string;
  className?: string;
  showPlayIcon?: boolean;
}

/**
 * TikTok動画のサムネイルを表示するコンポーネント
 * 
 * 優先順位:
 * 1. DBに保存されたthumbnailUrl
 * 2. サーバーサイドAPIを通じてTikTok oEmbedから取得
 * 3. グラデーションプレースホルダー
 */
export function VideoThumbnail({
  videoId,
  thumbnailUrl,
  description = "TikTok動画",
  className = "",
  showPlayIcon = true,
}: VideoThumbnailProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(thumbnailUrl || null);
  const [isLoading, setIsLoading] = useState(!thumbnailUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // DBに保存されたサムネイルURLがあれば使用
    if (thumbnailUrl) {
      setImgSrc(thumbnailUrl);
      setIsLoading(false);
      return;
    }

    // サムネイルURLがない場合はサーバーサイドAPIを通じて取得
    const fetchThumbnail = async () => {
      try {
        const response = await fetch(`/api/thumbnail?videoId=${videoId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnailUrl) {
            setImgSrc(data.thumbnailUrl);
            setIsLoading(false);
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
  }, [videoId, thumbnailUrl]);

  const handleError = () => {
    setHasError(true);
    setImgSrc(null);
  };

  return (
    <div className={`relative bg-gradient-to-br from-indigo-500 to-pink-500 ${className}`}>
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
          <span className="text-lg font-bold">TikTok</span>
          <span className="text-sm opacity-70">動画</span>
        </div>
      ) : (
        // サムネイル画像表示
        <img
          src={imgSrc}
          alt={description}
          className="h-full w-full object-cover"
          onError={handleError}
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
