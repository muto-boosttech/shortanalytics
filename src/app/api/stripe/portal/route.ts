import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // セッションからユーザーIDを取得
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

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { error: "Stripeカスタマー情報が見つかりません" },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tategatashort-analytics.com";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe Portal error:", error);
    return NextResponse.json(
      { error: "ポータルセッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
