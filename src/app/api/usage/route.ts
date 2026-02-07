import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { PLAN_CONFIGS, PlanType } from "@/lib/plan-limits";

// GET /api/usage - 現在のユーザーの使用量サマリーを取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ユーザーのプランを取得
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { plan: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const plan = (user.plan || "free") as PlanType;
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
        userId: session.userId,
        actionType: "refresh",
        createdAt: { gte: weekStart },
      },
    });

    // 今月の分析回数
    const analysisCount = await prisma.usageLog.count({
      where: {
        userId: session.userId,
        actionType: "analysis",
        createdAt: { gte: monthStart },
      },
    });

    // 今月のエクスポート回数
    const exportCount = await prisma.usageLog.count({
      where: {
        userId: session.userId,
        actionType: "export",
        createdAt: { gte: monthStart },
      },
    });

    // Freeプランの残り日数を計算
    let freeTrialDaysLeft: number | undefined;
    if (plan === "free" && config.trialDays) {
      const expiryDate = new Date(user.createdAt);
      expiryDate.setDate(expiryDate.getDate() + config.trialDays);
      const msLeft = expiryDate.getTime() - now.getTime();
      freeTrialDaysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    }

    // リフレッシュの上限は媒体×カテゴリ別だが、全体の概算として表示
    // 週あたりの上限 × 想定媒体数(3) × 想定カテゴリ数(5) = 全体上限
    const refreshTotalLimit = config.refreshPerWeek;
    const refreshPeriod = plan === "max" || plan === "premium" ? "日" : "週";
    const refreshDisplayLimit = plan === "max" ? 3 : plan === "premium" ? 1 : config.refreshPerWeek;

    return NextResponse.json({
      success: true,
      data: {
        plan: plan,
        planLabel: config.label,
        refresh: {
          used: refreshCount,
          limit: refreshTotalLimit,
          remaining: Math.max(0, refreshTotalLimit - refreshCount),
          period: refreshPeriod,
          description: plan === "max" ? "1日3回/媒体×カテゴリ" :
                       plan === "premium" ? "1日1回/媒体×カテゴリ" :
                       plan === "starter" ? "週3回/媒体×カテゴリ" :
                       "週1回/媒体×カテゴリ",
        },
        analysis: {
          used: analysisCount,
          limit: config.analysisPerMonth,
          remaining: Math.max(0, config.analysisPerMonth - analysisCount),
          period: "月",
        },
        export: {
          used: exportCount,
          limit: config.exportPerMonth,
          remaining: Math.max(0, config.exportPerMonth - exportCount),
          period: "月",
        },
        freeTrialDaysLeft,
      },
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
