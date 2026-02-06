import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/videos - 動画一覧を取得（フィルタ+ソート+ページネーション）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // ページネーション
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // フィルタ
    const industryId = searchParams.get("industry_id");
    const authorUsername = searchParams.get("author_username");
    const source = searchParams.get("source");
    const minViewCount = searchParams.get("min_view_count");
    const maxViewCount = searchParams.get("max_view_count");
    const minEngagementRate = searchParams.get("min_engagement_rate");
    const maxEngagementRate = searchParams.get("max_engagement_rate");
    const minDuration = searchParams.get("min_duration");
    const maxDuration = searchParams.get("max_duration");
    const contentType = searchParams.get("content_type");
    const hookType = searchParams.get("hook_type");
    const durationCategory = searchParams.get("duration_category");
    const search = searchParams.get("search");
    const platform = searchParams.get("platform") || "tiktok"; // 'tiktok' | 'youtube'

    // ソート
    const sortBy = searchParams.get("sort_by") || "collectedAt";
    const sortOrder = (searchParams.get("sort_order") || "desc") as "asc" | "desc";

    // Where条件の構築
    const where: Prisma.VideoWhereInput = {
      platform: platform,
    };

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { authorUsername: { contains: search } },
      ];
    }

    if (authorUsername) {
      where.authorUsername = { contains: authorUsername };
    }

    if (source) {
      where.source = source;
    }

    if (minViewCount || maxViewCount) {
      where.viewCount = {};
      if (minViewCount) where.viewCount.gte = parseInt(minViewCount);
      if (maxViewCount) where.viewCount.lte = parseInt(maxViewCount);
    }

    if (minEngagementRate || maxEngagementRate) {
      where.engagementRate = {};
      if (minEngagementRate) where.engagementRate.gte = parseFloat(minEngagementRate);
      if (maxEngagementRate) where.engagementRate.lte = parseFloat(maxEngagementRate);
    }

    if (minDuration || maxDuration) {
      where.videoDurationSeconds = {};
      if (minDuration) where.videoDurationSeconds.gte = parseInt(minDuration);
      if (maxDuration) where.videoDurationSeconds.lte = parseInt(maxDuration);
    }

    // video_tagsを使ったフィルタ
    if (industryId || contentType || hookType || durationCategory) {
      where.videoTags = {
        some: {
          ...(industryId && { industryId: parseInt(industryId) }),
          ...(contentType && { contentType }),
          ...(hookType && { hookType }),
          ...(durationCategory && { durationCategory }),
        },
      };
    }

    // ソートフィールドのマッピング
    const sortFieldMap: Record<string, string> = {
      collectedAt: "collectedAt",
      postedAt: "postedAt",
      viewCount: "viewCount",
      likeCount: "likeCount",
      commentCount: "commentCount",
      shareCount: "shareCount",
      engagementRate: "engagementRate",
      videoDurationSeconds: "videoDurationSeconds",
    };

    const orderByField = sortFieldMap[sortBy] || "collectedAt";

    // データ取得
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        include: {
          videoTags: {
            include: {
              industry: true,
            },
          },
        },
        orderBy: {
          [orderByField]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.video.count({ where }),
    ]);

    // hashtagsはPostgreSQL配列なのでそのまま返す
    return NextResponse.json({
      success: true,
      data: videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
