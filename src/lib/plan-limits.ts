import prisma from "@/lib/prisma";

// プラン定義
export type PlanType = "free" | "starter" | "premium" | "max";

export interface PlanConfig {
  name: string;
  label: string;
  refreshPerWeek: number;    // 各媒体×各カテゴリのデータ更新回数/週
  analysisPerMonth: number;  // 分析回数/月
  exportPerMonth: number;    // エクスポート回数/月
  trialDays: number | null;  // 有効期限（日数）、nullは無制限
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    name: "free",
    label: "Free",
    refreshPerWeek: 1,
    analysisPerMonth: 3,
    exportPerMonth: 3,
    trialDays: 7,
  },
  starter: {
    name: "starter",
    label: "Starter",
    refreshPerWeek: 3,
    analysisPerMonth: 60,
    exportPerMonth: 60,
    trialDays: null,
  },
  premium: {
    name: "premium",
    label: "Premium",
    refreshPerWeek: 7,       // 1日1回 = 週7回
    analysisPerMonth: 200,
    exportPerMonth: 200,
    trialDays: null,
  },
  max: {
    name: "max",
    label: "Max",
    refreshPerWeek: 21,      // 1日3回 = 週21回
    analysisPerMonth: 500,
    exportPerMonth: 500,
    trialDays: null,
  },
};

// アクションタイプ
export type ActionType = "refresh" | "analysis" | "export";

// 使用量チェック結果
export interface UsageCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  message?: string;
}

// Freeプランの有効期限チェック
export async function checkFreeTrialExpired(userId: number, plan: string, createdAt: Date): Promise<boolean> {
  if (plan !== "free") return false;
  const config = PLAN_CONFIGS.free;
  if (!config.trialDays) return false;

  const expiryDate = new Date(createdAt);
  expiryDate.setDate(expiryDate.getDate() + config.trialDays);
  return new Date() > expiryDate;
}

// データ更新の使用量チェック（週単位、媒体×カテゴリ別）
export async function checkRefreshUsage(
  userId: number,
  plan: PlanType,
  platform: string,
  industryId: number
): Promise<UsageCheckResult> {
  const config = PLAN_CONFIGS[plan];
  const limit = config.refreshPerWeek;

  // 今週の開始日（月曜日）を計算
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  // 今週の該当媒体×カテゴリの更新回数を取得
  const count = await prisma.usageLog.count({
    where: {
      userId,
      actionType: "refresh",
      platform,
      industryId,
      createdAt: { gte: weekStart },
    },
  });

  const remaining = Math.max(0, limit - count);
  return {
    allowed: count < limit,
    currentCount: count,
    limit,
    remaining,
    message: count >= limit
      ? `${config.label}プランでは${platform}×このカテゴリのデータ更新は週${limit}回までです（残り0回）`
      : undefined,
  };
}

// 分析の使用量チェック（月単位）
export async function checkAnalysisUsage(
  userId: number,
  plan: PlanType
): Promise<UsageCheckResult> {
  const config = PLAN_CONFIGS[plan];
  const limit = config.analysisPerMonth;

  // 今月の開始日
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const count = await prisma.usageLog.count({
    where: {
      userId,
      actionType: "analysis",
      createdAt: { gte: monthStart },
    },
  });

  const remaining = Math.max(0, limit - count);
  return {
    allowed: count < limit,
    currentCount: count,
    limit,
    remaining,
    message: count >= limit
      ? `${config.label}プランでは分析は月${limit}回までです（残り0回）`
      : undefined,
  };
}

// エクスポートの使用量チェック（月単位）
export async function checkExportUsage(
  userId: number,
  plan: PlanType
): Promise<UsageCheckResult> {
  const config = PLAN_CONFIGS[plan];
  const limit = config.exportPerMonth;

  // 今月の開始日
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const count = await prisma.usageLog.count({
    where: {
      userId,
      actionType: "export",
      createdAt: { gte: monthStart },
    },
  });

  const remaining = Math.max(0, limit - count);
  return {
    allowed: count < limit,
    currentCount: count,
    limit,
    remaining,
    message: count >= limit
      ? `${config.label}プランではエクスポートは月${limit}回までです（残り0回）`
      : undefined,
  };
}

// 使用量ログを記録
export async function logUsage(
  userId: number,
  actionType: ActionType,
  platform?: string,
  industryId?: number,
  detail?: string
) {
  await prisma.usageLog.create({
    data: {
      userId,
      actionType,
      platform: platform || null,
      industryId: industryId || null,
      detail: detail || null,
    },
  });
}

// ユーザーの使用量サマリーを取得
export async function getUsageSummary(userId: number, plan: PlanType) {
  const config = PLAN_CONFIGS[plan];
  const now = new Date();

  // 今週の開始日（月曜日）
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  // 今月の開始日
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 今週のデータ更新回数（全体）
  const refreshCount = await prisma.usageLog.count({
    where: {
      userId,
      actionType: "refresh",
      createdAt: { gte: weekStart },
    },
  });

  // 今月の分析回数
  const analysisCount = await prisma.usageLog.count({
    where: {
      userId,
      actionType: "analysis",
      createdAt: { gte: monthStart },
    },
  });

  // 今月のエクスポート回数
  const exportCount = await prisma.usageLog.count({
    where: {
      userId,
      actionType: "export",
      createdAt: { gte: monthStart },
    },
  });

  return {
    plan: config.label,
    refresh: {
      weeklyUsed: refreshCount,
      weeklyLimitPerCombo: config.refreshPerWeek,
      description: plan === "max" ? "1日3回/媒体×カテゴリ" :
                   plan === "premium" ? "1日1回/媒体×カテゴリ" :
                   plan === "starter" ? "週3回/媒体×カテゴリ" :
                   "週1回/媒体×カテゴリ",
    },
    analysis: {
      monthlyUsed: analysisCount,
      monthlyLimit: config.analysisPerMonth,
      remaining: Math.max(0, config.analysisPerMonth - analysisCount),
    },
    export: {
      monthlyUsed: exportCount,
      monthlyLimit: config.exportPerMonth,
      remaining: Math.max(0, config.exportPerMonth - exportCount),
    },
  };
}
