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
  Users,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronUp,
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

interface PlanUser {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  role: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  trialEndsAt: string | null;
}

interface PlanStat {
  plan: string;
  label: string;
  price: number;
  userCount: number;
  activeSubscribers: number;
  cancelingUsers: number;
  monthlyRevenue: number;
  users: PlanUser[];
}

interface PlanStatsData {
  summary: {
    totalUsers: number;
    totalActiveSubscribers: number;
    totalMonthlyRevenue: number;
  };
  plans: PlanStat[];
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

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-700 border-gray-200",
  starter: "bg-blue-50 text-blue-700 border-blue-200",
  premium: "bg-purple-50 text-purple-700 border-purple-200",
  max: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [planStats, setPlanStats] = useState<PlanStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isMasterAdmin = user?.role === "master_admin";

  useEffect(() => {
    fetchSubscription();
    if (isMasterAdmin) {
      fetchPlanStats();
    }
  }, [isMasterAdmin]);

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

  const fetchPlanStats = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/plan-stats");
      const data = await res.json();
      if (data.success) {
        setPlanStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch plan stats:", error);
    } finally {
      setAdminLoading(false);
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

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
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

  const getUserStatusBadge = (u: PlanUser) => {
    if (u.cancelAtPeriodEnd) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          解約予約
        </span>
      );
    }
    if (u.subscriptionStatus === "active") {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
          有効
        </span>
      );
    }
    if (u.subscriptionStatus === "past_due") {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          支払い遅延
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
        未課金
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">プラン・お支払い</h1>
          <p className="text-gray-500 mt-1">
            {isMasterAdmin ? "プラン管理・ユーザー統計・売上情報" : "サブスクリプションの管理"}
          </p>
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

        {/* ===== マスター管理者用: プラン別ユーザー・売上 ===== */}
        {isMasterAdmin && (
          <>
            {adminLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : planStats ? (
              <>
                {/* サマリーカード */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-500">総ユーザー数</p>
                    </div>
                    <p className="text-3xl font-black text-gray-900">
                      {planStats.summary.totalUsers}
                      <span className="text-base font-normal text-gray-500 ml-1">人</span>
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-sm text-gray-500">有料会員数</p>
                    </div>
                    <p className="text-3xl font-black text-gray-900">
                      {planStats.summary.totalActiveSubscribers}
                      <span className="text-base font-normal text-gray-500 ml-1">人</span>
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="text-sm text-gray-500">月間売上</p>
                    </div>
                    <p className="text-3xl font-black text-gray-900">
                      ¥{planStats.summary.totalMonthlyRevenue.toLocaleString()}
                      <span className="text-base font-normal text-gray-500 ml-1">/月</span>
                    </p>
                  </div>
                </div>

                {/* プラン別詳細 */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-gray-700" />
                      <h2 className="text-lg font-bold text-gray-900">プラン別ユーザー・売上</h2>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {planStats.plans.map((plan) => (
                      <div key={plan.plan}>
                        {/* プラン行 */}
                        <button
                          onClick={() =>
                            setExpandedPlan(expandedPlan === plan.plan ? null : plan.plan)
                          }
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span
                              className={`px-3 py-1 rounded-lg text-sm font-bold border ${
                                PLAN_COLORS[plan.plan] || "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              {plan.label}
                            </span>
                            <div className="text-left">
                              <p className="text-sm text-gray-500">
                                {plan.price > 0
                                  ? `¥${plan.price.toLocaleString()}/月`
                                  : "無料"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm text-gray-500">ユーザー</p>
                              <p className="text-lg font-bold text-gray-900">
                                {plan.userCount}
                                <span className="text-xs font-normal text-gray-500 ml-0.5">人</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">有料会員</p>
                              <p className="text-lg font-bold text-emerald-600">
                                {plan.activeSubscribers}
                                <span className="text-xs font-normal text-gray-500 ml-0.5">人</span>
                              </p>
                            </div>
                            {plan.cancelingUsers > 0 && (
                              <div className="text-right">
                                <p className="text-sm text-gray-500">解約予約</p>
                                <p className="text-lg font-bold text-amber-600">
                                  {plan.cancelingUsers}
                                  <span className="text-xs font-normal text-gray-500 ml-0.5">人</span>
                                </p>
                              </div>
                            )}
                            <div className="text-right min-w-[120px]">
                              <p className="text-sm text-gray-500">月間売上</p>
                              <p className="text-lg font-bold text-gray-900">
                                ¥{plan.monthlyRevenue.toLocaleString()}
                              </p>
                            </div>
                            {expandedPlan === plan.plan ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* ユーザー一覧（展開時） */}
                        {expandedPlan === plan.plan && plan.users.length > 0 && (
                          <div className="bg-gray-50 px-6 py-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-gray-500 border-b border-gray-200">
                                    <th className="pb-2 font-medium">ユーザー名</th>
                                    <th className="pb-2 font-medium">表示名</th>
                                    <th className="pb-2 font-medium">メール</th>
                                    <th className="pb-2 font-medium">権限</th>
                                    <th className="pb-2 font-medium">ステータス</th>
                                    <th className="pb-2 font-medium">登録日</th>
                                    <th className="pb-2 font-medium">最終ログイン</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {plan.users.map((u) => (
                                    <tr key={u.id} className="text-gray-700">
                                      <td className="py-2.5 font-medium">{u.username}</td>
                                      <td className="py-2.5">{u.displayName || "-"}</td>
                                      <td className="py-2.5 text-gray-500">{u.email || "-"}</td>
                                      <td className="py-2.5">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                          {u.role === "master_admin"
                                            ? "マスター管理者"
                                            : u.role === "admin"
                                            ? "管理者"
                                            : "一般"}
                                        </span>
                                      </td>
                                      <td className="py-2.5">{getUserStatusBadge(u)}</td>
                                      <td className="py-2.5 text-gray-500">
                                        {formatShortDate(u.createdAt)}
                                      </td>
                                      <td className="py-2.5 text-gray-500">
                                        {u.lastLoginAt ? formatShortDate(u.lastLoginAt) : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {plan.users.length === 0 && (
                              <p className="text-center text-gray-400 py-4">
                                このプランのユーザーはいません
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {/* 区切り線 */}
            <div className="border-t border-gray-200 pt-2">
              <p className="text-sm text-gray-400">自分のサブスクリプション</p>
            </div>
          </>
        )}

        {/* ===== 通常ユーザー/マスター管理者共通: 自分のサブスクリプション ===== */}
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
                  !subscription.cancelAtPeriodEnd && (
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
