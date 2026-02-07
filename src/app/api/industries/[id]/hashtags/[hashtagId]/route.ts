import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helper";

type RouteParams = {
  params: Promise<{ id: string; hashtagId: string }>;
};

// GET /api/industries/[id]/hashtags/[hashtagId] - 特定のハッシュタグを取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, hashtagId } = await params;
    const industryId = parseInt(id);
    const hashtagIdNum = parseInt(hashtagId);

    if (isNaN(industryId) || isNaN(hashtagIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 }
      );
    }

    const hashtag = await prisma.industryHashtag.findFirst({
      where: {
        id: hashtagIdNum,
        industryId,
      },
    });

    if (!hashtag) {
      return NextResponse.json(
        { success: false, error: "Hashtag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: hashtag,
    });
  } catch (error) {
    console.error("Error fetching hashtag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch hashtag" },
      { status: 500 }
    );
  }
}

// PATCH /api/industries/[id]/hashtags/[hashtagId] - ハッシュタグを更新（マスター管理者のみ）
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.role !== "master_admin") {
      return NextResponse.json(
        { success: false, error: "マスター管理者権限が必要です" },
        { status: 403 }
      );
    }

    const { id, hashtagId } = await params;
    const industryId = parseInt(id);
    const hashtagIdNum = parseInt(hashtagId);

    if (isNaN(industryId) || isNaN(hashtagIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { hashtag, isActive, platform } = body;

    // 既存のハッシュタグを確認
    const existing = await prisma.industryHashtag.findFirst({
      where: {
        id: hashtagIdNum,
        industryId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Hashtag not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.industryHashtag.update({
      where: { id: hashtagIdNum },
      data: {
        ...(hashtag !== undefined && { hashtag }),
        ...(isActive !== undefined && { isActive }),
        ...(platform !== undefined && { platform }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating hashtag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update hashtag" },
      { status: 500 }
    );
  }
}

// DELETE /api/industries/[id]/hashtags/[hashtagId] - ハッシュタグを削除（マスター管理者のみ）
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.role !== "master_admin") {
      return NextResponse.json(
        { success: false, error: "マスター管理者権限が必要です" },
        { status: 403 }
      );
    }

    const { id, hashtagId } = await params;
    const industryId = parseInt(id);
    const hashtagIdNum = parseInt(hashtagId);

    if (isNaN(industryId) || isNaN(hashtagIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 }
      );
    }

    // 既存のハッシュタグを確認
    const existing = await prisma.industryHashtag.findFirst({
      where: {
        id: hashtagIdNum,
        industryId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Hashtag not found" },
        { status: 404 }
      );
    }

    await prisma.industryHashtag.delete({
      where: { id: hashtagIdNum },
    });

    return NextResponse.json({
      success: true,
      message: "Hashtag deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting hashtag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete hashtag" },
      { status: 500 }
    );
  }
}
