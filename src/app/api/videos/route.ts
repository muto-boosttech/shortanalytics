import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// 日本語文字を含むかチェック（PostgreSQL正規表現用）
const JAPANESE_REGEX_PATTERN =
  "[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]";

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
    const platform = searchParams.get("platform") || "tiktok";

    // ソート
    const sortBy = searchParams.get("sort_by") || "collectedAt";
    const sortOrder = (searchParams.get("sort_order") || "desc") as
      | "asc"
      | "desc";

    // 投稿期間フィルタ: 前日から1か月前まで
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setHours(0, 0, 0, 0);

    // Where条件の構築
    const where: Prisma.VideoWhereInput = {
      platform: platform,
      postedAt: {
        gte: startDate,
        lte: endDate,
      },
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
      if (minEngagementRate)
        where.engagementRate.gte = parseFloat(minEngagementRate);
      if (maxEngagementRate)
        where.engagementRate.lte = parseFloat(maxEngagementRate);
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

    // TikTokの場合は日本国内コンテンツのみにフィルタ
    // PostgreSQLのRaw SQLで日本語文字を含むレコードのみ取得
    if (platform === "tiktok") {
      // まず日本語コンテンツの動画IDを取得
      const japaneseVideoIds: Array<{ id: number }> = await prisma.$queryRaw`
        SELECT id FROM videos
        WHERE platform = 'tiktok'
          AND posted_at >= ${startDate}
          AND posted_at <= ${endDate}
          AND (
            description ~ ${JAPANESE_REGEX_PATTERN}
            OR EXISTS (
              SELECT 1 FROM unnest(hashtags) AS h
              WHERE h ~ ${JAPANESE_REGEX_PATTERN}
            )
          )
      `;
      const jpIds = japaneseVideoIds.map((v) => v.id);

      if (jpIds.length > 0) {
        where.id = { in: jpIds };
      } else {
        // 日本語コンテンツがない場合は空の結果を返す
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          dataRange: {
            postedFrom: null,
            postedTo: null,
            collectedFrom: null,
            collectedTo: null,
          },
        });
      }
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

    // データ収集期間を計算
    const allVideosForRange = await prisma.video.findMany({
      where: {
        platform: platform,
        postedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(industryId
          ? {
              videoTags: {
                some: { industryId: parseInt(industryId) },
              },
            }
          : {}),
      },
      select: {
        postedAt: true,
        collectedAt: true,
      },
    });

    const postedDates = allVideosForRange
      .filter((v) => v.postedAt)
      .map((v) => v.postedAt!.getTime());
    const collectedDates = allVideosForRange
      .filter((v) => v.collectedAt)
      .map((v) => v.collectedAt!.getTime());

    const dataRange = {
      postedFrom:
        postedDates.length > 0
          ? new Date(Math.min(...postedDates)).toISOString().split("T")[0]
          : null,
      postedTo:
        postedDates.length > 0
          ? new Date(Math.max(...postedDates)).toISOString().split("T")[0]
          : null,
      collectedFrom:
        collectedDates.length > 0
          ? new Date(Math.min(...collectedDates)).toISOString().split("T")[0]
          : null,
      collectedTo:
        collectedDates.length > 0
          ? new Date(Math.max(...collectedDates)).toISOString().split("T")[0]
          : null,
    };

    return NextResponse.json({
      success: true,
      data: videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      dataRange,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
