const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function setup() {
  console.log('=== Stripe Products & Prices Setup ===\n');

  // 1. Starter Plan
  const starterProduct = await stripe.products.create({
    name: 'BOOSTTECH 縦型ショート動画分析 - Starter',
    description: '個人や小規模チームでの分析に。データ更新: 週3回/媒体×カテゴリ、AI分析: 月60回、エクスポート: 月60回',
    metadata: { plan: 'starter' },
  });
  const starterPrice = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 9800,
    currency: 'jpy',
    recurring: { interval: 'month' },
    metadata: { plan: 'starter' },
  });
  console.log('Starter Product:', starterProduct.id);
  console.log('Starter Price:', starterPrice.id);

  // 2. Premium Plan
  const premiumProduct = await stripe.products.create({
    name: 'BOOSTTECH 縦型ショート動画分析 - Premium',
    description: '本格的な分析運用をしたい方に。データ更新: 1日1回/媒体×カテゴリ、AI分析: 月200回、エクスポート: 月200回',
    metadata: { plan: 'premium' },
  });
  const premiumPrice = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 19800,
    currency: 'jpy',
    recurring: { interval: 'month' },
    metadata: { plan: 'premium' },
  });
  console.log('Premium Product:', premiumProduct.id);
  console.log('Premium Price:', premiumPrice.id);

  // 3. Max Plan
  const maxProduct = await stripe.products.create({
    name: 'BOOSTTECH 縦型ショート動画分析 - Max',
    description: '大規模運用・代理店向け。データ更新: 1日3回/媒体×カテゴリ、AI分析: 月500回、エクスポート: 月500回',
    metadata: { plan: 'max' },
  });
  const maxPrice = await stripe.prices.create({
    product: maxProduct.id,
    unit_amount: 49800,
    currency: 'jpy',
    recurring: { interval: 'month' },
    metadata: { plan: 'max' },
  });
  console.log('Max Product:', maxProduct.id);
  console.log('Max Price:', maxPrice.id);

  console.log('\n=== Setup Complete ===');
  console.log('\nAdd these to your .env.local:');
  console.log(`STRIPE_PRICE_STARTER=${starterPrice.id}`);
  console.log(`STRIPE_PRICE_PREMIUM=${premiumPrice.id}`);
  console.log(`STRIPE_PRICE_MAX=${maxPrice.id}`);
}

setup().catch(console.error);
