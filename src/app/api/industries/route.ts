import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helper";

// GET /api/industries - 全業種を取得
export async function GET() {
  try {
    const industries = await prisma.industry.findMany({
      include: {
        _count: {
          select: {
            hashtags: true,
            videoTags: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: industries,
    });
  } catch (error) {
    console.error("Error fetching industries:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch industries" },
      { status: 500 }
    );
  }
}

// POST /api/industries - 新規業種を作成（マスター管理者のみ）
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "master_admin") {
      return NextResponse.json(
        { success: false, error: "マスター管理者権限が必要です" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // slugの重複チェック
    const existing = await prisma.industry.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Industry with this slug already exists" },
        { status: 409 }
      );
    }

    const industry = await prisma.industry.create({
      data: { name, slug },
    });

    return NextResponse.json({
      success: true,
      data: industry,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating industry:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create industry" },
      { status: 500 }
    );
  }
}
