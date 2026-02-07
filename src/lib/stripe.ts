import Stripe from "stripe";

// 遅延初期化でビルド時のAPIキー不在エラーを回避
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
      maxNetworkRetries: 3,
      timeout: 30000,
    });
  }
  return _stripe;
}

// 後方互換性のためのexport（ランタイムでのみ使用）
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

// プラン名とStripe Price IDのマッピング
export const PLAN_PRICE_MAP: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || "",
  premium: process.env.STRIPE_PRICE_PREMIUM || "",
  max: process.env.STRIPE_PRICE_MAX || "",
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
