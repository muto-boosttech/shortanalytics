import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helper";

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

// POST /api/industries/[id]/hashtags - 新規ハッシュタグを追加（マスター管理者のみ）
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.role !== "master_admin") {
      return NextResponse.json(
        { success: false, error: "マスター管理者権限が必要です" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const industryId = parseInt(id);

    if (isNaN(industryId)) {
      return NextResponse.json(
        { success: false, error: "Invalid industry ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { hashtag, isActive = true, platform = "tiktok" } = body;

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

    // 重複チェック（同じ業種・ハッシュタグ・プラットフォームの組み合わせ）
    const existing = await prisma.industryHashtag.findFirst({
      where: {
        industryId,
        hashtag,
        platform,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Hashtag already exists for this industry" },
        { status: 409 }
      );
    }

    // プラットフォームのバリデーション
    const validPlatforms = ["tiktok", "youtube", "instagram"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { success: false, error: `プラットフォームは ${validPlatforms.join(", ")} のいずれかを指定してください` },
        { status: 400 }
      );
    }

    const newHashtag = await prisma.industryHashtag.create({
      data: {
        industryId,
        hashtag,
        isActive,
        platform,
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
