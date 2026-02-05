import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/benchmarks - ベンチマークデータを取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const industryId = searchParams.get("industry_id");

    const where = industryId ? { industryId: parseInt(industryId) } : {};

    const benchmarks = await prisma.benchmark.findMany({
      where,
      include: {
        industry: true,
      },
      orderBy: {
        calculatedAt: "desc",
      },
    });

    // JSONフィールドをパース
    const parsedBenchmarks = benchmarks.map((b) => ({
      ...b,
      topContentTypes: b.topContentTypes ? JSON.parse(b.topContentTypes) : [],
      topHookTypes: b.topHookTypes ? JSON.parse(b.topHookTypes) : [],
    }));

    return NextResponse.json({
      success: true,
      data: parsedBenchmarks,
    });
  } catch (error) {
    console.error("Error fetching benchmarks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch benchmarks" },
      { status: 500 }
    );
  }
}
