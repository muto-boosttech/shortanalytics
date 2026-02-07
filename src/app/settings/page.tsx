"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/lib/auth-context";
import {
  CreditCard,
  Crown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  ArrowUpRight,
  XCircle,
  RotateCcw,
} from "lucide-react";

interface SubscriptionInfo {
  plan: string;
  planDisplayName: string;
  planPrice: number;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeSubscription: boolean;
  trialEndsAt: string | null;
  createdAt: string;
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "データ更新: 週1回/媒体×カテゴリ",
    "AI分析: 月3回",
    "エクスポート: 月3回",
    "7日間限定",
  ],
  starter: [
    "データ更新: 週3回/媒体×カテゴリ",
    "AI分析: 月60回",
    "エクスポート: 月60回",
    "メールサポート",
  ],
  premium: [
    "データ更新: 1日1回/媒体×カテゴリ",
    "AI分析: 月200回",
    "エクスポート: 月200回",
    "優先サポート",
  ],
  max: [
    "データ更新: 1日3回/媒体×カテゴリ",
    "AI分析: 月500回",
    "エクスポート: 月500回",
    "専任サポート",
  ],
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/stripe/subscription");
      const data = await res.json();
      if (res.ok) {
        setSubscription(data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    if (!user) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "エラーが発生しました");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "エラーが発生しました",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setShowCancelConfirm(false);
        await fetchSubscription();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "解約に失敗しました",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/stripe/reactivate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        await fetchSubscription();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "解約取り消しに失敗しました",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    if (subscription.cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          解約予約中
        </span>
      );
    }

    switch (subscription.subscriptionStatus) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3.5 h-3.5" />
            有効
          </span>
        );
      case "past_due":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            支払い遅延
          </span>
        );
      case "canceled":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
            <XCircle className="w-3.5 h-3.5" />
            解約済み
          </span>
        );
      default:
        if (subscription.plan === "free") {
          return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
              無料プラン
            </span>
          );
        }
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">プラン・お支払い</h1>
          <p className="text-gray-500 mt-1">サブスクリプションの管理</p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl text-sm ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : subscription ? (
          <>
            {/* 現在のプラン */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="w-6 h-6 text-emerald-600" />
                    <h2 className="text-xl font-bold text-gray-900">
                      {subscription.planDisplayName}プラン
                    </h2>
                    {getStatusBadge()}
                  </div>
                  {subscription.planPrice > 0 && (
                    <p className="text-3xl font-black text-gray-900 mt-3">
                      ¥{subscription.planPrice.toLocaleString()}
                      <span className="text-base font-normal text-gray-500">/月（税別）</span>
                    </p>
                  )}
                </div>
              </div>

              {/* プラン機能一覧 */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {(PLAN_FEATURES[subscription.plan] || []).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>

              {/* 請求情報 */}
              {subscription.hasStripeSubscription && subscription.currentPeriodEnd && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">次回請求日</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                    {subscription.cancelAtPeriodEnd && (
                      <div>
                        <p className="text-gray-500">サービス終了日</p>
                        <p className="font-medium text-amber-600 mt-1">
                          {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* アクションボタン */}
              <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-3">
                {subscription.hasStripeSubscription && (
                  <button
                    onClick={handleOpenPortal}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    お支払い情報の管理
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                {subscription.cancelAtPeriodEnd ? (
                  <button
                    onClick={handleReactivate}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    解約を取り消す
                  </button>
                ) : (
                  subscription.hasStripeSubscription &&
                  subscription.subscriptionStatus === "active" && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      解約する
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 解約確認モーダル */}
            {showCancelConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">解約の確認</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-6">
                    現在の請求期間の終了時にサブスクリプションが解約されます。
                    {subscription.currentPeriodEnd && (
                      <>
                        <br />
                        <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
                        まではすべての機能をご利用いただけます。
                      </>
                    )}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "解約する"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* プラン変更 */}
            {(subscription.plan === "free" || subscription.plan === "starter" || subscription.plan === "premium") && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">プランをアップグレード</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {subscription.plan !== "starter" && (
                    <div className="border border-gray-200 rounded-xl p-4 hover:border-emerald-300 transition-colors">
                      <h3 className="font-bold text-gray-900">Starter</h3>
                      <p className="text-2xl font-black text-gray-900 mt-1">
                        ¥9,800<span className="text-xs font-normal text-gray-500">/月</span>
                      </p>
                      <button
                        onClick={() => handleUpgrade("starter")}
                        disabled={actionLoading}
                        className="mt-3 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        アップグレード
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {subscription.plan !== "premium" && (
                    <div className="border-2 border-emerald-500 rounded-xl p-4 relative">
                      <span className="absolute -top-2.5 left-4 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        人気
                      </span>
                      <h3 className="font-bold text-gray-900">Premium</h3>
                      <p className="text-2xl font-black text-gray-900 mt-1">
                        ¥19,800<span className="text-xs font-normal text-gray-500">/月</span>
                      </p>
                      <button
                        onClick={() => handleUpgrade("premium")}
                        disabled={actionLoading}
                        className="mt-3 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        アップグレード
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="border border-gray-200 rounded-xl p-4 hover:border-emerald-300 transition-colors">
                    <h3 className="font-bold text-gray-900">Max</h3>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                      ¥49,800<span className="text-xs font-normal text-gray-500">/月</span>
                    </p>
                    <button
                      onClick={() => handleUpgrade("max")}
                      disabled={actionLoading}
                      className="mt-3 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      アップグレード
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-gray-500">
            サブスクリプション情報を取得できませんでした
          </div>
        )}
      </div>
    </MainLayout>
  );
}
