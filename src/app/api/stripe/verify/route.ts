import { NextRequest, NextResponse } from "next/server";
import { stripe, getPlanFromPriceId, PLAN_DISPLAY_NAMES } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "session_id is required" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.items.data.price"],
    });

    if (session.payment_status === "paid" || session.status === "complete") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = session.subscription as any;
      const userId = parseInt(session.metadata?.userId || "0");

      if (userId && subscription) {
        const priceId = subscription.items?.data?.[0]?.price?.id || "";
        const plan = session.metadata?.plan || getPlanFromPriceId(priceId);

        // ユーザーのプラン情報を更新
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: plan,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            subscriptionStatus: subscription.status || "active",
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          },
        });

        return NextResponse.json({
          success: true,
          plan: PLAN_DISPLAY_NAMES[plan] || plan,
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: "Payment not completed",
    });
  } catch (error) {
    console.error("Stripe verify error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
