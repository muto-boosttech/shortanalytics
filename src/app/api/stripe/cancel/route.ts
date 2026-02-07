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
        { error: "アクティブなサブスクリプションが見つかりません" },
        { status: 404 }
      );
    }

    // 期間末でキャンセル（即時キャンセルではない）
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subData = subscription as any;
    const periodEnd = subData.current_period_end
      ? new Date(subData.current_period_end * 1000)
      : new Date();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: periodEnd,
      },
    });

    return NextResponse.json({
      success: true,
      message: "サブスクリプションは現在の請求期間の終了時にキャンセルされます",
      currentPeriodEnd: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: "解約処理に失敗しました" },
      { status: 500 }
    );
  }
}
