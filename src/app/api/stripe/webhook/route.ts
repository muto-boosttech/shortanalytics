import { NextRequest, NextResponse } from "next/server";
import { stripe, getPlanFromPriceId } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

// Webhookのbodyをrawで受け取るための設定
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    // Webhook Secretが設定されている場合は署名を検証
    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(
        body,
        sig!,
        webhookSecret
      );
    } else {
      // 開発環境: 署名検証なし
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // サブスクリプション作成完了
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      // サブスクリプション更新（プラン変更、更新など）
      case "customer.subscription.updated": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      // サブスクリプション削除（解約完了）
      case "customer.subscription.deleted": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // 支払い失敗
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      // 支払い成功（更新時）
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Checkout完了時の処理
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = parseInt(session.metadata?.userId || "0");
  const plan = session.metadata?.plan || "free";

  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription as any)?.id;

  if (subscriptionId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
    const priceId = subscription.items?.data?.[0]?.price?.id || "";

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: plan,
        stripeCustomerId:
          typeof session.customer === "string"
            ? session.customer
            : (session.customer as any)?.id || null,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        subscriptionStatus: subscription.status || "active",
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      },
    });

    console.log(`User ${userId} upgraded to ${plan} plan`);
  }
}

// サブスクリプション更新時の処理
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(subscription: any) {
  const userId = parseInt(subscription.metadata?.userId || "0");

  // metadataにuserIdがない場合、stripeSubscriptionIdで検索
  let user;
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: userId } });
  }
  if (!user) {
    user = await prisma.user.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
  }

  if (!user) {
    console.error(
      "User not found for subscription:",
      subscription.id
    );
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id || "";
  const plan = getPlanFromPriceId(priceId);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: plan,
      stripePriceId: priceId,
      subscriptionStatus: subscription.status || "active",
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    },
  });

  console.log(
    `Subscription updated for user ${user.id}: ${plan} (${subscription.status})`
  );
}

// サブスクリプション削除時の処理
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(subscription: any) {
  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.error(
      "User not found for deleted subscription:",
      subscription.id
    );
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "free",
      subscriptionStatus: "canceled",
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
  });

  console.log(`Subscription canceled for user ${user.id}`);
}

// 支払い失敗時の処理
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceData = invoice as any;
  const subscriptionId =
    typeof invoiceData.subscription === "string"
      ? invoiceData.subscription
      : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "past_due",
      },
    });

    console.log(`Payment failed for user ${user.id}`);
  }
}

// 支払い成功時の処理（更新時）
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceData = invoice as any;
  const subscriptionId =
    typeof invoiceData.subscription === "string"
      ? invoiceData.subscription
      : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription =
      await stripe.subscriptions.retrieve(subscriptionId) as any;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "active",
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
      },
    });

    console.log(`Payment succeeded for user ${user.id}`);
  }
}
