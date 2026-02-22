"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface RefreshResult {
  success: boolean;
  message: string;
  results?: {
    collections: Array<{
      industryId: number;
      industryName: string;
      platform: string;
      status: string;
      videos?: number;
    }>;
    tagging: { processed: number; tagged: number };
    thumbnails: { updated: number };
    benchmarks: boolean;
  };
}

interface RefreshButtonProps {
  /** 更新タイプ: "full" | "collect" | "tag" | "thumbnail" | "benchmark" */
  type?: string;
  /** プラットフォーム: "tiktok" | "youtube" | "instagram" */
  platform?: string;
  /** 業種ID */
  industryId?: string;
  /** 更新完了後のコールバック */
  onRefreshComplete?: () => void;
  /** ボタンのバリアント */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** ボタンサイズ */
  size?: "default" | "sm" | "lg" | "icon";
  /** 追加のクラス名 */
  className?: string;
  /** ボタンラベル */
  label?: string;
  /** コンパクトモード（アイコンのみ） */
  compact?: boolean;
}

const PROGRESS_STEPS = [
  { key: "collect", label: "データ収集中...", duration: 60 },
  { key: "tag", label: "タグ付け中...", duration: 15 },
  { key: "benchmark", label: "ベンチマーク計算中...", duration: 10 },
];

export function RefreshButton({
  type = "full",
  platform,
  industryId,
  onRefreshComplete,
  variant = "outline",
  size = "sm",
  className = "",
  label = "データ更新",
  compact = false,
}: RefreshButtonProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 経過時間カウンター
  useEffect(() => {
    if (!refreshing) {
      setElapsedTime(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshing]);

  // 進捗ステップの自動進行（推定時間ベース）
  useEffect(() => {
    if (!refreshing) {
      setProgressStep(0);
      return;
    }
    // 収集: 0-60秒, タグ付け: 60-75秒, ベンチマーク: 75-85秒
    if (elapsedTime >= 75) {
      setProgressStep(2);
    } else if (elapsedTime >= 60) {
      setProgressStep(1);
    } else {
      setProgressStep(0);
    }
  }, [refreshing, elapsedTime]);

  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}分${secs}秒`;
    return `${secs}秒`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setResult(null);
    setShowResult(false);
    setProgressStep(0);
    setElapsedTime(0);

    try {
      const body: Record<string, string | undefined> = { type };
      if (platform) body.platform = platform;
      if (industryId) body.industryId = industryId;

      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setResult(data);
      setShowResult(true);

      // 成功時にコールバックを呼ぶ
      if (data.success && onRefreshComplete) {
        onRefreshComplete();
      }

      // 5秒後に結果表示を消す
      setTimeout(() => {
        setShowResult(false);
      }, 5000);
    } catch (error) {
      setResult({
        success: false,
        message: "データ更新に失敗しました",
      });
      setShowResult(true);
      setTimeout(() => {
        setShowResult(false);
      }, 5000);
    } finally {
      setRefreshing(false);
    }
  };

  const currentStepLabel = refreshing && type === "full"
    ? PROGRESS_STEPS[progressStep]?.label || "処理中..."
    : "更新中...";

  return (
    <div className="relative inline-flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        className={`gap-1.5 ${className}`}
        onClick={handleRefresh}
        disabled={refreshing}
        title={refreshing ? currentStepLabel : label}
      >
        {refreshing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {!compact && (
              <span className="text-xs sm:text-sm">
                {currentStepLabel}
                <span className="ml-1 text-gray-400">({formatElapsedTime(elapsedTime)})</span>
              </span>
            )}
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5" />
            {!compact && <span className="text-xs sm:text-sm">{label}</span>}
          </>
        )}
      </Button>

      {/* 結果トースト */}
      {showResult && result && (
        <div
          className={`absolute top-full right-0 mt-2 z-50 min-w-[240px] rounded-lg border p-3 shadow-lg text-sm ${
            result.success
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
            )}
            <div className="flex-1">
              <p className="font-medium">{result.success ? "更新完了" : "更新失敗"}</p>
              {result.success && result.results && (
                <div className="mt-1 text-xs space-y-0.5">
                  {result.results.collections.length > 0 && (
                    <p>
                      収集: {result.results.collections.filter(c => c.status === "success").length}/
                      {result.results.collections.length} 成功
                      {result.results.collections.reduce((sum, c) => sum + (c.videos || 0), 0) > 0 &&
                        ` (新規${result.results.collections.reduce((sum, c) => sum + (c.videos || 0), 0)}件)`}
                    </p>
                  )}
                  {result.results.tagging.processed > 0 && (
                    <p>タグ付け: {result.results.tagging.tagged}件</p>
                  )}
                  {result.results.thumbnails.updated > 0 && (
                    <p>サムネイル: {result.results.thumbnails.updated}件更新</p>
                  )}
                  {result.results.benchmarks && <p>ベンチマーク: 再計算済み</p>}
                </div>
              )}
              {!result.success && (
                <p className="mt-1 text-xs">{result.message}</p>
              )}
            </div>
            <button
              onClick={() => setShowResult(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
