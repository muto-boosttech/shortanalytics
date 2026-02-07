"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, Info, Zap } from "lucide-react";

interface UsageData {
  plan: string;
  planLabel: string;
  refresh: {
    used: number;
    limit: number;
    remaining: number;
    period: string;
  };
  analysis: {
    used: number;
    limit: number;
    remaining: number;
    period: string;
  };
  export: {
    used: number;
    limit: number;
    remaining: number;
    period: string;
  };
  freeTrialDaysLeft?: number;
}

export function UsageBanner() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      const data = await res.json();
      if (data.success) {
        setUsage(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUsage();
    }
  }, [user, fetchUsage]);

  // マスター管理者は制限なし
  if (!usage || user?.role === "master_admin") return null;
  if (dismissed) return null;

  const refreshPercent = usage.refresh.limit > 0 ? (usage.refresh.used / usage.refresh.limit) * 100 : 0;
  const analysisPercent = usage.analysis.limit > 0 ? (usage.analysis.used / usage.analysis.limit) * 100 : 0;
  const exportPercent = usage.export.limit > 0 ? (usage.export.used / usage.export.limit) * 100 : 0;

  const isNearLimit = refreshPercent >= 80 || analysisPercent >= 80 || exportPercent >= 80;
  const isAtLimit = refreshPercent >= 100 || analysisPercent >= 100 || exportPercent >= 100;
  const isFreeTrial = usage.plan === "free" && usage.freeTrialDaysLeft !== undefined;

  // 制限に近づいていない場合は表示しない（Freeプランは常に表示）
  if (!isNearLimit && !isFreeTrial) return null;

  const barColor = (percent: number) => {
    if (percent >= 100) return "bg-red-500";
    if (percent >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const bgColor = isAtLimit
    ? "border-red-200 bg-red-50"
    : isNearLimit
    ? "border-amber-200 bg-amber-50"
    : "border-blue-200 bg-blue-50";

  const iconColor = isAtLimit
    ? "text-red-500"
    : isNearLimit
    ? "text-amber-500"
    : "text-blue-500";

  return (
    <div className={`rounded-lg border p-3 sm:p-4 ${bgColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          {isAtLimit ? (
            <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
          ) : isNearLimit ? (
            <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
          ) : (
            <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-800 sm:text-sm">
                {usage.planLabel}プラン
              </span>
              {isFreeTrial && usage.freeTrialDaysLeft !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 sm:text-xs">
                  残り{usage.freeTrialDaysLeft}日
                </span>
              )}
              {isAtLimit && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 sm:text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  上限到達
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {/* データ更新 */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-600 sm:text-xs mb-1">
                  <span>データ更新（{usage.refresh.period}）</span>
                  <span className="font-medium">{usage.refresh.used}/{usage.refresh.limit}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-1.5 rounded-full transition-all ${barColor(refreshPercent)}`}
                    style={{ width: `${Math.min(refreshPercent, 100)}%` }}
                  />
                </div>
              </div>
              {/* 分析 */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-600 sm:text-xs mb-1">
                  <span>分析（{usage.analysis.period}）</span>
                  <span className="font-medium">{usage.analysis.used}/{usage.analysis.limit}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-1.5 rounded-full transition-all ${barColor(analysisPercent)}`}
                    style={{ width: `${Math.min(analysisPercent, 100)}%` }}
                  />
                </div>
              </div>
              {/* エクスポート */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-600 sm:text-xs mb-1">
                  <span>エクスポート（{usage.export.period}）</span>
                  <span className="font-medium">{usage.export.used}/{usage.export.limit}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-1.5 rounded-full transition-all ${barColor(exportPercent)}`}
                    style={{ width: `${Math.min(exportPercent, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          title="閉じる"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// 制限到達時のオーバーレイダイアログ
export function UsageLimitDialog({
  type,
  onClose,
}: {
  type: "refresh" | "analysis" | "export";
  onClose: () => void;
}) {
  const labels: Record<string, string> = {
    refresh: "データ更新",
    analysis: "AI分析",
    export: "エクスポート",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Zap className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-gray-900">
            {labels[type]}の上限に達しました
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            現在のプランの{labels[type]}回数上限に達しました。プランのアップグレードについては管理者にお問い合わせください。
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
