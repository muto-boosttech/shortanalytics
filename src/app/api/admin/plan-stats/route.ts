import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helper";

// GET /api/admin/plan-stats - マスター管理者用: プラン別ユーザー数・売上を取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

    // マスター管理者のみアクセス可能
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.role !== "master_admin") {
      return NextResponse.json(
        { success: false, error: "マスター管理者権限が必要です" },
        { status: 403 }
      );
    }

    // プラン別の価格定義
    const planPrices: Record<string, number> = {
      free: 0,
      starter: 9800,
      premium: 19800,
      max: 49800,
    };

    const planLabels: Record<string, string> = {
      free: "Free（7日間無料）",
      starter: "Starter",
      premium: "Premium",
      max: "Max",
    };

    // 全ユーザーを取得
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        plan: true,
        role: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        createdAt: true,
        lastLoginAt: true,
        trialEndsAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // プラン別に集計
    const planStats = Object.entries(planPrices).map(([planKey, price]) => {
      const usersInPlan = allUsers.filter((u) => u.plan === planKey);
      const activeSubscribers = usersInPlan.filter(
        (u) =>
          u.subscriptionStatus === "active" && !u.cancelAtPeriodEnd
      );
      const cancelingUsers = usersInPlan.filter(
        (u) => u.cancelAtPeriodEnd === true
      );

      return {
        plan: planKey,
        label: planLabels[planKey] || planKey,
        price,
        userCount: usersInPlan.length,
        activeSubscribers: activeSubscribers.length,
        cancelingUsers: cancelingUsers.length,
        monthlyRevenue: activeSubscribers.length * price,
        users: usersInPlan.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          email: u.email,
          role: u.role,
          subscriptionStatus: u.subscriptionStatus,
          currentPeriodEnd: u.currentPeriodEnd,
          cancelAtPeriodEnd: u.cancelAtPeriodEnd,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          trialEndsAt: u.trialEndsAt,
        })),
      };
    });

    // 全体の集計
    const totalUsers = allUsers.length;
    const totalActiveSubscribers = planStats.reduce(
      (sum, p) => sum + p.activeSubscribers,
      0
    );
    const totalMonthlyRevenue = planStats.reduce(
      (sum, p) => sum + p.monthlyRevenue,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalActiveSubscribers,
          totalMonthlyRevenue,
        },
        plans: planStats,
      },
    });
  } catch (error) {
    console.error("Error fetching plan stats:", error);
    return NextResponse.json(
      { success: false, error: "プラン統計の取得に失敗しました" },
      { status: 500 }
    );
  }
}
