const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  // 1. Check industry 11 video tags count
  const tagCount = await prisma.videoTag.count({
    where: { industryId: 11 }
  });
  console.log(`VideoTags with industryId=11: ${tagCount}`);

  // 2. Check date range
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setHours(0, 0, 0, 0);
  
  console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // 3. Check videos with industry 11 tags and date filter
  const videosWithTags = await prisma.video.findMany({
    where: {
      platform: 'tiktok',
      postedAt: { gte: startDate, lte: endDate },
      videoTags: { some: { industryId: 11 } },
    },
    select: { id: true, postedAt: true, viewCount: true },
    take: 5,
  });
  console.log(`Videos with industry=11 + date filter + tiktok: ${videosWithTags.length}`);
  console.log('Sample:', videosWithTags.slice(0, 3));

  // 4. Check without date filter
  const videosNoDate = await prisma.video.count({
    where: {
      platform: 'tiktok',
      videoTags: { some: { industryId: 11 } },
    },
  });
  console.log(`Videos with industry=11 + tiktok (no date): ${videosNoDate}`);

  // 5. Check without platform filter
  const videosNoPlatform = await prisma.video.count({
    where: {
      postedAt: { gte: startDate, lte: endDate },
      videoTags: { some: { industryId: 11 } },
    },
  });
  console.log(`Videos with industry=11 + date (no platform): ${videosNoPlatform}`);

  // 6. Check the full filter as in dashboard API
  const videoWhere = {
    postedAt: { gte: startDate, lte: endDate },
    platform: 'tiktok',
    videoTags: { some: { industryId: 11 } },
  };
  const fullCount = await prisma.video.count({ where: videoWhere });
  console.log(`Full dashboard filter count: ${fullCount}`);

  // 7. Check videos API filter (same as videos/route.ts)
  const videosApiWhere = {
    platform: 'tiktok',
    postedAt: { gte: startDate, lte: endDate },
    videoTags: { some: { industryId: 11 } },
  };
  const videosApiCount = await prisma.video.count({ where: videosApiWhere });
  console.log(`Videos API filter count: ${videosApiCount}`);

  // 8. Check a sample video with tag
  const sampleTag = await prisma.videoTag.findFirst({
    where: { industryId: 11 },
    include: { video: { select: { id: true, platform: true, postedAt: true, viewCount: true } } },
  });
  console.log('Sample tag:', JSON.stringify(sampleTag, null, 2));

  await prisma.$disconnect();
}

debug().catch(console.error);
