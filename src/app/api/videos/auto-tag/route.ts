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
  if (!seconds) return "〜60秒";
  if (seconds <= 15) return "〜15秒";
  if (seconds <= 30) return "〜30秒";
  if (seconds <= 60) return "〜60秒";
  return "60秒以上";
}

// DELETE /api/videos/auto-tag - 全タグを削除
export async function DELETE() {
  try {
    const result = await prisma.videoTag.deleteMany({});
    return NextResponse.json({
      success: true,
      message: `${result.count}件のタグを削除しました`,
      deleted: result.count,
    });
  } catch (error) {
    console.error("Error deleting tags:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete tags" },
      { status: 500 }
    );
  }
}

// PUT /api/videos/auto-tag - 既存タグの動画尺カテゴリを再計算
export async function PUT() {
  try {
    // 全てのvideo_tagsを取得して動画尺カテゴリを更新
    const videoTags = await prisma.videoTag.findMany({
      include: {
        video: true,
      },
    });

    let updated = 0;
    for (const tag of videoTags) {
      const newDurationCategory = getDurationCategory(tag.video.videoDurationSeconds);
      if (tag.durationCategory !== newDurationCategory) {
        await prisma.videoTag.update({
          where: { id: tag.id },
          data: { durationCategory: newDurationCategory },
        });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: videoTags.length,
        updated,
      },
    });
  } catch (error) {
    console.error("Error updating duration categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update duration categories" },
      { status: 500 }
    );
  }
}

// 業種とハッシュタグのマッピング
const industryHashtagMapping: Record<number, string[]> = {
  11: ["フィットネス", "筋トレ", "ダイエット", "ジム", "ワークアウト", "ボディメイク", "bodymakeup", "body", "workout", "fitness"],
  12: ["エンタメ", "お笑い", "ダンス", "映画", "音楽", "ゲーム", "entertainment", "dance", "music", "game"],
  13: ["ファッション", "OOTD", "コーデ", "着回し", "プチプラ", "トレンド", "fashion", "outfit", "style"],
  14: ["不動産", "マイホーム", "賃貸", "ルームツアー", "インテリア", "物件", "realestate", "room", "interior"],
  15: ["教育", "勉強", "学習", "英語", "受験", "資格", "study", "education", "learning"],
  16: ["EC", "ショッピング", "購入品", "通販", "レビュー", "おすすめ商品", "shopping", "review"],
  17: ["グルメ", "料理", "レシピ", "カフェ", "食べ歩き", "おうちごはん", "food", "recipe", "cafe"],
  18: ["美容", "コスメ", "スキンケア", "メイク", "美肌", "化粧品", "beauty", "skincare", "makeup"],
  19: ["旅行", "トラベル", "国内旅行", "海外旅行", "観光", "絶景", "travel", "trip", "tourism"],
  20: ["医療", "健康", "ヘルスケア", "病院", "予防", "医師", "health", "medical", "healthcare"],
};

function detectIndustryFromHashtags(hashtags: string[]): number | null {
  const hashtagsLower = hashtags.map(h => h.toLowerCase());
  
  for (const [industryId, keywords] of Object.entries(industryHashtagMapping)) {
    for (const keyword of keywords) {
      if (hashtagsLower.some(h => h.includes(keyword.toLowerCase()))) {
        return parseInt(industryId);
      }
    }
  }
  return null;
}

// POST /api/videos/auto-tag - 動画に自動タグ付け
export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // bodyがない場合は空オブジェクト
    }
    const { videoIds, industryId } = body as { videoIds?: number[]; industryId?: number };

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

      // 業種を決定（指定があればそれを使用、なければハッシュタグから推定）
      let targetIndustryId = industryId;
      if (!targetIndustryId) {
        const hashtags = Array.isArray(video.hashtags) ? video.hashtags : [];
        targetIndustryId = detectIndustryFromHashtags(hashtags) || 11; // デフォルトはフィットネス
      }

      // 既存のタグを確認
      const existingTag = await prisma.videoTag.findFirst({
        where: {
          videoId: video.id,
          industryId: targetIndustryId,
        },
      });

      if (existingTag) {
        results.skipped++;
        continue;
      }

      const text = `${video.description || ""} ${Array.isArray(video.hashtags) ? video.hashtags.join(" ") : ""}`;

      const contentType = detectTag(text, contentTypeRules);
      const hookType = detectTag(text, hookTypeRules);
      const performerType = detectTag(text, performerTypeRules);
      const tone = detectTag(text, toneRules);
      const ctaType = detectTag(text, ctaTypeRules);
      const durationCategory = getDurationCategory(video.videoDurationSeconds);

      await prisma.videoTag.create({
        data: {
          videoId: video.id,
          industryId: targetIndustryId,
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
