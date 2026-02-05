import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/industries/[id]/hashtags - 業種のハッシュタグ一覧を取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const industryId = parseInt(id);

    if (isNaN(industryId)) {
      return NextResponse.json(
        { success: false, error: "Invalid industry ID" },
        { status: 400 }
      );
    }

    // 業種の存在確認
    const industry = await prisma.industry.findUnique({
      where: { id: industryId },
    });

    if (!industry) {
      return NextResponse.json(
        { success: false, error: "Industry not found" },
        { status: 404 }
      );
    }

    const hashtags = await prisma.industryHashtag.findMany({
      where: { industryId },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        industry,
        hashtags,
      },
    });
  } catch (error) {
    console.error("Error fetching hashtags:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch hashtags" },
      { status: 500 }
    );
  }
}

// POST /api/industries/[id]/hashtags - 新規ハッシュタグを追加
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const industryId = parseInt(id);

    if (isNaN(industryId)) {
      return NextResponse.json(
        { success: false, error: "Invalid industry ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { hashtag, isActive = true } = body;

    if (!hashtag) {
      return NextResponse.json(
        { success: false, error: "Hashtag is required" },
        { status: 400 }
      );
    }

    // 業種の存在確認
    const industry = await prisma.industry.findUnique({
      where: { id: industryId },
    });

    if (!industry) {
      return NextResponse.json(
        { success: false, error: "Industry not found" },
        { status: 404 }
      );
    }

    // 重複チェック
    const existing = await prisma.industryHashtag.findFirst({
      where: {
        industryId,
        hashtag,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Hashtag already exists for this industry" },
        { status: 409 }
      );
    }

    const newHashtag = await prisma.industryHashtag.create({
      data: {
        industryId,
        hashtag,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: newHashtag,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating hashtag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create hashtag" },
      { status: 500 }
    );
  }
}
