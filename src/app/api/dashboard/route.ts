import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/dashboard - ダッシュボードKPIとグラフデータを取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const industryId = searchParams.get("industry_id");
    const period = searchParams.get("period") || "30"; // デフォルト30日

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // フィルタ条件
    const videoWhere: { postedAt?: { gte: Date }; videoTags?: { some: { industryId: number } } } = {
      postedAt: { gte: startDate },
    };

    if (industryId) {
      videoWhere.videoTags = {
        some: { industryId: parseInt(industryId) },
      };
    }

    // 基本KPI
    const videos = await prisma.video.findMany({
      where: videoWhere,
      include: {
        videoTags: true,
      },
    });

    const totalVideos = videos.length;
    const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likeCount, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.commentCount, 0);
    const totalShares = videos.reduce((sum, v) => sum + v.shareCount, 0);

    const avgEngagementRate =
      totalVideos > 0
        ? videos.reduce((sum, v) => sum + v.engagementRate, 0) / totalVideos
        : 0;

    const avgViewCount = totalVideos > 0 ? totalViews / totalVideos : 0;

    // 視聴数の中央値
    const sortedViews = videos.map((v) => v.viewCount).sort((a, b) => a - b);
    const medianViewCount =
      sortedViews.length > 0
        ? sortedViews[Math.floor(sortedViews.length / 2)]
        : 0;

    // コンテンツタイプ別集計
    const contentTypeStats: Record<string, { count: number; totalViews: number; avgEngagement: number }> = {};
    const hookTypeStats: Record<string, { count: number; totalViews: number; avgEngagement: number }> = {};
    const durationCategoryStats: Record<string, { count: number; totalViews: number; avgEngagement: number }> = {};

    for (const video of videos) {
      for (const tag of video.videoTags) {
        // コンテンツタイプ
        if (tag.contentType) {
          if (!contentTypeStats[tag.contentType]) {
            contentTypeStats[tag.contentType] = { count: 0, totalViews: 0, avgEngagement: 0 };
          }
          contentTypeStats[tag.contentType].count++;
          contentTypeStats[tag.contentType].totalViews += video.viewCount;
          contentTypeStats[tag.contentType].avgEngagement += video.engagementRate;
        }

        // フックタイプ
        if (tag.hookType) {
          if (!hookTypeStats[tag.hookType]) {
            hookTypeStats[tag.hookType] = { count: 0, totalViews: 0, avgEngagement: 0 };
          }
          hookTypeStats[tag.hookType].count++;
          hookTypeStats[tag.hookType].totalViews += video.viewCount;
          hookTypeStats[tag.hookType].avgEngagement += video.engagementRate;
        }

        // 動画時間カテゴリ
        if (tag.durationCategory) {
          if (!durationCategoryStats[tag.durationCategory]) {
            durationCategoryStats[tag.durationCategory] = { count: 0, totalViews: 0, avgEngagement: 0 };
          }
          durationCategoryStats[tag.durationCategory].count++;
          durationCategoryStats[tag.durationCategory].totalViews += video.viewCount;
          durationCategoryStats[tag.durationCategory].avgEngagement += video.engagementRate;
        }
      }
    }

    // 平均エンゲージメント率を計算
    for (const key of Object.keys(contentTypeStats)) {
      contentTypeStats[key].avgEngagement /= contentTypeStats[key].count;
    }
    for (const key of Object.keys(hookTypeStats)) {
      hookTypeStats[key].avgEngagement /= hookTypeStats[key].count;
    }
    for (const key of Object.keys(durationCategoryStats)) {
      durationCategoryStats[key].avgEngagement /= durationCategoryStats[key].count;
    }

    // 日別トレンド
    const dailyTrend: Record<string, { date: string; videos: number; views: number; engagement: number }> = {};
    for (const video of videos) {
      if (video.postedAt) {
        const dateKey = video.postedAt.toISOString().split("T")[0];
        if (!dailyTrend[dateKey]) {
          dailyTrend[dateKey] = { date: dateKey, videos: 0, views: 0, engagement: 0 };
        }
        dailyTrend[dateKey].videos++;
        dailyTrend[dateKey].views += video.viewCount;
        dailyTrend[dateKey].engagement += video.engagementRate;
      }
    }

    // 日別トレンドの平均エンゲージメント率を計算
    for (const key of Object.keys(dailyTrend)) {
      dailyTrend[key].engagement /= dailyTrend[key].videos;
    }

    // トップ動画
    const topVideosByViews = [...videos]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10)
      .map((v) => ({
        id: v.id,
        tiktokVideoId: v.tiktokVideoId,
        description: v.description?.substring(0, 100),
        viewCount: v.viewCount,
        engagementRate: v.engagementRate,
        authorUsername: v.authorUsername,
      }));

    const topVideosByEngagement = [...videos]
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 10)
      .map((v) => ({
        id: v.id,
        tiktokVideoId: v.tiktokVideoId,
        description: v.description?.substring(0, 100),
        viewCount: v.viewCount,
        engagementRate: v.engagementRate,
        authorUsername: v.authorUsername,
      }));

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          totalVideos,
          totalViews,
          totalLikes,
          totalComments,
          totalShares,
          avgEngagementRate,
          avgViewCount,
          medianViewCount,
        },
        charts: {
          contentTypeStats: Object.entries(contentTypeStats)
            .map(([type, stats]) => ({ type, ...stats }))
            .sort((a, b) => b.count - a.count),
          hookTypeStats: Object.entries(hookTypeStats)
            .map(([type, stats]) => ({ type, ...stats }))
            .sort((a, b) => b.count - a.count),
          durationCategoryStats: Object.entries(durationCategoryStats)
            .map(([category, stats]) => ({ category, ...stats }))
            .sort((a, b) => b.count - a.count),
          dailyTrend: Object.values(dailyTrend).sort((a, b) =>
            a.date.localeCompare(b.date)
          ),
        },
        topVideos: {
          byViews: topVideosByViews,
          byEngagement: topVideosByEngagement,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
