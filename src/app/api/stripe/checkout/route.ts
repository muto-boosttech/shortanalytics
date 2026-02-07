import { NextRequest, NextResponse } from "next/server";
import { PLAN_PRICE_MAP } from "@/lib/stripe";
import prisma from "@/lib/prisma";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

async function stripeRequest(endpoint: string, params: Record<string, string>) {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return res.json();
}

async function stripeGet(endpoint: string) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
    },
  });
  return res.json();
}

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
        { error: `無効なプランです: ${plan}` },
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
      const customer = await stripeRequest("/customers", {
        email: user.email || "",
        name: user.displayName || user.username,
        "metadata[userId]": user.id.toString(),
        "metadata[username]": user.username,
      });

      if (customer.error) {
        return NextResponse.json(
          { error: `Stripe Customer作成エラー: ${customer.error.message}` },
          { status: 500 }
        );
      }

      customerId = customer.id;

      // DBにStripe Customer IDを保存
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // 既存のアクティブなサブスクリプションがある場合はポータルにリダイレクト
    if (user.stripeSubscriptionId && user.subscriptionStatus === "active") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tategatashort-analytics.com";
      const portalSession = await stripeRequest("/billing_portal/sessions", {
        customer: customerId!,
        return_url: `${appUrl}/dashboard`,
      });
      if (portalSession.error) {
        return NextResponse.json(
          { error: `ポータルセッション作成エラー: ${portalSession.error.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json({ url: portalSession.url });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tategatashort-analytics.com";

    // Checkout Sessionを作成（fetch API使用）
    const session = await stripeRequest("/checkout/sessions", {
      customer: customerId!,
      mode: "subscription",
      "payment_method_types[0]": "card",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${appUrl}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/signup?canceled=true`,
      "metadata[userId]": user.id.toString(),
      "metadata[plan]": plan,
      "subscription_data[metadata][userId]": user.id.toString(),
      "subscription_data[metadata][plan]": plan,
      locale: "ja",
      allow_promotion_codes: "true",
    });

    if (session.error) {
      return NextResponse.json(
        { error: `Checkoutセッション作成エラー: ${session.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    console.error("Stripe Checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: `決済セッションの作成に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
