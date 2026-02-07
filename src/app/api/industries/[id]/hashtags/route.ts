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

// POST /api/industries/[id]/hashtags - 新規ハッシュタグを追加（全媒体同時登録・一括登録対応）
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
    // hashtags: 複数ハッシュタグ対応（カンマ・改行・スペース区切り）
    // hashtag: 単一ハッシュタグ（後方互換性）
    const { hashtag, hashtags, isActive = true } = body;

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

    // ハッシュタグリストを作成（複数対応）
    let hashtagList: string[] = [];
    
    if (hashtags && Array.isArray(hashtags)) {
      // 配列で渡された場合
      hashtagList = hashtags.map((h: string) => h.trim().replace(/^#/, "")).filter((h: string) => h.length > 0);
    } else if (hashtags && typeof hashtags === "string") {
      // カンマ・改行・スペース区切りの文字列で渡された場合
      hashtagList = hashtags
        .split(/[,\n\s]+/)
        .map((h: string) => h.trim().replace(/^#/, ""))
        .filter((h: string) => h.length > 0);
    } else if (hashtag) {
      // 単一ハッシュタグ（後方互換性）
      hashtagList = [hashtag.trim().replace(/^#/, "")];
    }

    if (hashtagList.length === 0) {
      return NextResponse.json(
        { success: false, error: "ハッシュタグを入力してください" },
        { status: 400 }
      );
    }

    // 全プラットフォームに登録
    const platforms = ["tiktok", "youtube", "instagram"];
    const created: { hashtag: string; platform: string }[] = [];
    const skipped: { hashtag: string; platform: string; reason: string }[] = [];

    for (const tag of hashtagList) {
      for (const platform of platforms) {
        // 重複チェック（同じ業種・ハッシュタグ・プラットフォームの組み合わせ）
        const existing = await prisma.industryHashtag.findFirst({
          where: {
            industryId,
            hashtag: tag,
            platform,
          },
        });

        if (existing) {
          skipped.push({ hashtag: tag, platform, reason: "既に登録済み" });
          continue;
        }

        await prisma.industryHashtag.create({
          data: {
            industryId,
            hashtag: tag,
            isActive,
            platform,
          },
        });

        created.push({ hashtag: tag, platform });
      }
    }

    const uniqueHashtags = [...new Set(created.map(c => c.hashtag))];
    const message = uniqueHashtags.length > 0
      ? `${uniqueHashtags.length}件のハッシュタグを全媒体（TikTok・YouTube・Instagram）に登録しました`
      : "全てのハッシュタグが既に登録済みです";

    return NextResponse.json({
      success: true,
      data: {
        created,
        skipped,
        message,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating hashtag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create hashtag" },
      { status: 500 }
    );
  }
}
