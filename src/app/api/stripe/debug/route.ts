import { NextResponse } from "next/server";

export async function GET() {
  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  const priceStarter = process.env.STRIPE_PRICE_STARTER || "";
  const pricePremium = process.env.STRIPE_PRICE_PREMIUM || "";
  const priceMax = process.env.STRIPE_PRICE_MAX || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return NextResponse.json({
    stripeKeySet: !!stripeKey,
    stripeKeyPrefix: stripeKey ? stripeKey.substring(0, 10) + "..." : "EMPTY",
    priceStarter: priceStarter || "EMPTY",
    pricePremium: pricePremium || "EMPTY",
    priceMax: priceMax || "EMPTY",
    appUrl: appUrl || "EMPTY",
  });
}
