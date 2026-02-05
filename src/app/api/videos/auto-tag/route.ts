import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// キーワードルールベースの自動タグ付け
const contentTypeRules: Record<string, string[]> = {
  "チュートリアル": ["やり方", "方法", "教える", "解説", "ハウツー", "How to", "tutorial"],
  "レビュー": ["レビュー", "正直", "使ってみた", "買ってみた", "感想", "review"],
  "Vlog": ["vlog", "日常", "1日", "ルーティン", "routine"],
  "ビフォーアフター": ["ビフォーアフター", "before", "after", "変化", "変身"],
  "ランキング": ["TOP", "ランキング", "BEST", "おすすめ", "選"],
  "Q&A": ["Q&A", "質問", "答え", "回答"],
  "ハウツー": ["コツ", "ポイント", "秘訣", "tips"],
  "商品紹介": ["紹介", "商品", "アイテム", "購入品", "買った"],
};

const hookTypeRules: Record<string, string[]> = {
  "質問形式": ["？", "知ってる", "わかる", "なぜ", "どうして"],
  "衝撃的事実": ["実は", "驚き", "衝撃", "知らない", "秘密"],
  "ビフォーアフター": ["ビフォー", "アフター", "before", "after"],
  "カウントダウン": ["TOP", "第", "位", "ランキング"],
  "ストーリー導入": ["ある日", "実は", "今日は", "この前"],
  "問題提起": ["悩み", "困った", "問題", "解決"],
  "比較": ["vs", "比較", "違い", "どっち"],
};

const performerTypeRules: Record<string, string[]> = {
  "顔出し": ["私", "僕", "俺", "自分"],
  "顔なし": ["手元", "商品だけ"],
  "テキストのみ": ["テキスト"],
  "商品のみ": ["商品紹介", "アイテム"],
};

const toneRules: Record<string, string[]> = {
  "カジュアル": ["笑", "w", "！", "〜"],
  "プロフェッショナル": ["専門", "プロ", "解説"],
  "ユーモア": ["笑", "爆笑", "面白い", "ネタ"],
  "感動": ["泣", "感動", "涙", "エモい"],
  "教育的": ["学び", "勉強", "知識", "教える"],
};

const ctaTypeRules: Record<string, string[]> = {
  "フォロー促進": ["フォロー", "follow"],
  "いいね促進": ["いいね", "like", "❤"],
  "コメント促進": ["コメント", "教えて", "聞かせて"],
  "シェア促進": ["シェア", "share", "広めて"],
  "リンク誘導": ["リンク", "プロフィール", "詳細は"],
};

function detectTag(text: string, rules: Record<string, string[]>): string | null {
  const lowerText = text.toLowerCase();
  for (const [tag, keywords] of Object.entries(rules)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return tag;
      }
    }
  }
  return null;
}

function getDurationCategory(seconds: number | null): string {
  if (!seconds) return "medium";
  if (seconds <= 15) return "short";
  if (seconds <= 30) return "medium";
  return "long";
}

// POST /api/videos/auto-tag - 動画に自動タグ付け
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoIds, industryId } = body;

    if (!industryId) {
      return NextResponse.json(
        { success: false, error: "Industry ID is required" },
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

    // 対象動画を取得
    let videos;
    if (videoIds && Array.isArray(videoIds) && videoIds.length > 0) {
      videos = await prisma.video.findMany({
        where: { id: { in: videoIds } },
      });
    } else {
      // videoIdsが指定されていない場合は、タグがない動画を対象
      videos = await prisma.video.findMany({
        where: {
          videoTags: {
            none: {},
          },
        },
      });
    }

    const results = {
      processed: 0,
      tagged: 0,
      skipped: 0,
    };

    for (const video of videos) {
      results.processed++;

      // 既存のタグを確認
      const existingTag = await prisma.videoTag.findFirst({
        where: {
          videoId: video.id,
          industryId,
        },
      });

      if (existingTag) {
        results.skipped++;
        continue;
      }

      const text = `${video.description || ""} ${video.hashtags || ""}`;

      const contentType = detectTag(text, contentTypeRules);
      const hookType = detectTag(text, hookTypeRules);
      const performerType = detectTag(text, performerTypeRules);
      const tone = detectTag(text, toneRules);
      const ctaType = detectTag(text, ctaTypeRules);
      const durationCategory = getDurationCategory(video.videoDurationSeconds);

      await prisma.videoTag.create({
        data: {
          videoId: video.id,
          industryId,
          contentType,
          hookType,
          durationCategory,
          performerType,
          tone,
          ctaType,
        },
      });

      results.tagged++;
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error auto-tagging videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to auto-tag videos" },
      { status: 500 }
    );
  }
}
