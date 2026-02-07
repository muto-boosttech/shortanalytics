import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
  typescript: true,
});

// プラン名とStripe Price IDのマッピング
export const PLAN_PRICE_MAP: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  premium: process.env.STRIPE_PRICE_PREMIUM!,
  max: process.env.STRIPE_PRICE_MAX!,
};

// Stripe Price IDからプラン名を逆引き
export function getPlanFromPriceId(priceId: string): string {
  for (const [plan, id] of Object.entries(PLAN_PRICE_MAP)) {
    if (id === priceId) return plan;
  }
  return "free";
}

// プラン表示名
export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  premium: "Premium",
  max: "Max",
};

// プラン価格（税別）
export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 9800,
  premium: 19800,
  max: 49800,
};
