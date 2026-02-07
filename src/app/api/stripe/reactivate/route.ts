import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ error: "セッションが無効です" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
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
