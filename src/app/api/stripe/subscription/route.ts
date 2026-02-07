import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helper";
import { PLAN_DISPLAY_NAMES, PLAN_PRICES } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      plan: user.plan,
      planDisplayName: PLAN_DISPLAY_NAMES[user.plan] || user.plan,
      planPrice: PLAN_PRICES[user.plan] || 0,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      hasStripeSubscription: !!user.stripeSubscriptionId,
      trialEndsAt: user.trialEndsAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Subscription info error:", error);
    return NextResponse.json(
      { error: "サブスクリプション情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
