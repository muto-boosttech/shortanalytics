import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helper";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/industries/[id] - 業種の詳細を取得（ハッシュタグ含む）
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

    const industry = await prisma.industry.findUnique({
      where: { id: industryId },
      include: {
        hashtags: {
          orderBy: { id: "asc" },
        },
        _count: {
          select: {
            videoTags: true,
          },
        },
      },
    });

    if (!industry) {
      return NextResponse.json(
        { success: false, error: "Industry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: industry,
    });
  } catch (error) {
    console.error("Error fetching industry:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch industry" },
      { status: 500 }
    );
  }
}

// PATCH /api/industries/[id] - 業種を更新（マスター管理者のみ）
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { name, slug } = body;

    const existing = await prisma.industry.findUnique({
      where: { id: industryId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Industry not found" },
        { status: 404 }
      );
    }

    // slugの重複チェック（自分自身は除外）
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.industry.findUnique({
        where: { slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: "このスラッグは既に使用されています" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.industry.update({
      where: { id: industryId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating industry:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update industry" },
      { status: 500 }
    );
  }
}

// DELETE /api/industries/[id] - 業種を削除（マスター管理者のみ）
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const existing = await prisma.industry.findUnique({
      where: { id: industryId },
      include: {
        _count: {
          select: { videoTags: true, hashtags: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Industry not found" },
        { status: 404 }
      );
    }

    // カスケード削除（関連するハッシュタグ、ビデオタグ、ベンチマーク、収集ログも削除される）
    await prisma.industry.delete({
      where: { id: industryId },
    });

    return NextResponse.json({
      success: true,
      message: `業種「${existing.name}」を削除しました（関連ハッシュタグ: ${existing._count.hashtags}件、動画タグ: ${existing._count.videoTags}件）`,
    });
  } catch (error) {
    console.error("Error deleting industry:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete industry" },
      { status: 500 }
    );
  }
}
