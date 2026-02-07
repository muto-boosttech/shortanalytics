const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function containsJapanese(text) {
  if (!text) return false;
  // ひらがな、カタカナ、漢字（CJK統合漢字）
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

async function check() {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setHours(0, 0, 0, 0);

  const videos = await prisma.video.findMany({
    where: {
      platform: 'tiktok',
      postedAt: { gte: startDate, lte: endDate },
    },
    select: { id: true, description: true, hashtags: true, authorUsername: true },
  });

  let jpCount = 0;
  let nonJpCount = 0;
  const nonJpSamples = [];

  for (const v of videos) {
    const desc = v.description || '';
    const hashtags = Array.isArray(v.hashtags) ? v.hashtags.join(' ') : '';
    const fullText = `${desc} ${hashtags}`;
    
    if (containsJapanese(fullText)) {
      jpCount++;
    } else {
      nonJpCount++;
      if (nonJpSamples.length < 3) {
        nonJpSamples.push({ id: v.id, desc: desc.substring(0, 80), author: v.authorUsername });
      }
    }
  }

  console.log(`Total TikTok videos: ${videos.length}`);
  console.log(`Japanese content: ${jpCount} (${(jpCount/videos.length*100).toFixed(1)}%)`);
  console.log(`Non-Japanese content: ${nonJpCount} (${(nonJpCount/videos.length*100).toFixed(1)}%)`);
  console.log('\nNon-Japanese samples:', JSON.stringify(nonJpSamples, null, 2));

  await prisma.$disconnect();
}

check().catch(console.error);
