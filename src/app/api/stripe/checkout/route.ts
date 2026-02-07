import { NextRequest, NextResponse } from "next/server";
import { stripe, PLAN_PRICE_MAP } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, plan } = body;

    if (!userId || !plan) {
      return NextResponse.json(
        { error: "userId と plan は必須です" },
        { status: 400 }
      );
    }

    if (plan === "free") {
      return NextResponse.json(
        { error: "Freeプランは決済不要です" },
        { status: 400 }
      );
    }

    const priceId = PLAN_PRICE_MAP[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: "無効なプランです" },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // Stripe Customerを作成または取得
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.displayName || user.username,
        metadata: {
          userId: user.id.toString(),
          username: user.username,
        },
      });
      customerId = customer.id;

      // DBにStripe Customer IDを保存
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // 既存のアクティブなサブスクリプションがある場合はポータルにリダイレクト
    if (user.stripeSubscriptionId && user.subscriptionStatus === "active") {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://tategatashort-analytics.com"}/dashboard`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tategatashort-analytics.com";

    // Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/signup?canceled=true`,
      metadata: {
        userId: user.id.toString(),
        plan: plan,
      },
      subscription_data: {
        metadata: {
          userId: user.id.toString(),
          plan: plan,
        },
      },
      locale: "ja",
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe Checkout error:", error);
    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
