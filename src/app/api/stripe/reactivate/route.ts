import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helper";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "サブスクリプションが見つかりません" },
        { status: 404 }
      );
    }

    // 解約予約を取り消し
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subData = subscription as any;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        cancelAtPeriodEnd: false,
        subscriptionStatus: subData.status || "active",
      },
    });

    return NextResponse.json({
      success: true,
      message: "解約予約が取り消されました",
    });
  } catch (error) {
    console.error("Reactivate subscription error:", error);
    return NextResponse.json(
      { error: "解約取り消しに失敗しました" },
      { status: 500 }
    );
  }
}
