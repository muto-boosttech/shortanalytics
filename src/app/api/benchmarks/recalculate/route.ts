import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/benchmarks/recalculate - ベンチマークを再計算
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { industryId, periodDays = 30 } = body;

    // 期間の設定
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // 対象業種を取得
    let industries;
    if (industryId) {
      const industry = await prisma.industry.findUnique({
        where: { id: industryId },
      });
      if (!industry) {
        return NextResponse.json(
          { success: false, error: "Industry not found" },
          { status: 404 }
        );
      }
      industries = [industry];
    } else {
      industries = await prisma.industry.findMany();
    }

    const results = [];

    for (const industry of industries) {
      // 業種に紐づく動画を取得
      const videos = await prisma.video.findMany({
        where: {
          videoTags: {
            some: { industryId: industry.id },
          },
          postedAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        include: {
          videoTags: {
            where: { industryId: industry.id },
          },
        },
      });

      if (videos.length === 0) {
        continue;
      }

      // 統計計算
      const engagementRates = videos.map((v) => v.engagementRate);
      const viewCounts = videos.map((v) => v.viewCount).sort((a, b) => a - b);

      const avgEngagementRate =
        engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
      const medianViewCount = viewCounts[Math.floor(viewCounts.length / 2)];

      // コンテンツタイプとフックタイプの集計
      const contentTypeCounts: Record<string, number> = {};
      const hookTypeCounts: Record<string, number> = {};

      for (const video of videos) {
        for (const tag of video.videoTags) {
          if (tag.contentType) {
            contentTypeCounts[tag.contentType] = (contentTypeCounts[tag.contentType] || 0) + 1;
          }
          if (tag.hookType) {
            hookTypeCounts[tag.hookType] = (hookTypeCounts[tag.hookType] || 0) + 1;
          }
        }
      }

      const topContentTypes = Object.entries(contentTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      const topHookTypes = Object.entries(hookTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      // 既存のベンチマークを更新または新規作成
      const existingBenchmark = await prisma.benchmark.findFirst({
        where: {
          industryId: industry.id,
          periodStart,
          periodEnd,
        },
      });

      let benchmark;
      if (existingBenchmark) {
        benchmark = await prisma.benchmark.update({
          where: { id: existingBenchmark.id },
          data: {
            avgEngagementRate,
            medianViewCount,
            topContentTypes: JSON.stringify(topContentTypes),
            topHookTypes: JSON.stringify(topHookTypes),
            sampleSize: videos.length,
            calculatedAt: new Date(),
          },
        });
      } else {
        benchmark = await prisma.benchmark.create({
          data: {
            industryId: industry.id,
            periodStart,
            periodEnd,
            avgEngagementRate,
            medianViewCount,
            topContentTypes: JSON.stringify(topContentTypes),
            topHookTypes: JSON.stringify(topHookTypes),
            sampleSize: videos.length,
          },
        });
      }

      results.push({
        industryId: industry.id,
        industryName: industry.name,
        benchmarkId: benchmark.id,
        sampleSize: videos.length,
        avgEngagementRate,
        medianViewCount,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        recalculated: results.length,
        results,
      },
    });
  } catch (error) {
    console.error("Error recalculating benchmarks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to recalculate benchmarks" },
      { status: 500 }
    );
  }
}
