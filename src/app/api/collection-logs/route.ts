import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/collection-logs - 収集ログ一覧を取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // ページネーション
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // フィルタ
    const industryId = searchParams.get("industry_id");
    const status = searchParams.get("status");

    const where: {
      industryId?: number;
      status?: string;
    } = {};

    if (industryId) {
      where.industryId = parseInt(industryId);
    }

    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.collectionLog.findMany({
        where,
        include: {
          industry: true,
        },
        orderBy: {
          startedAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.collectionLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching collection logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch collection logs" },
      { status: 500 }
    );
  }
}
