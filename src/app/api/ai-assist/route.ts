import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkAnalysisUsage, logUsage, PlanType } from "@/lib/plan-limits";

// OpenAI clientは遅延初期化（ビルド時のエラーを回避）
let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });
  }
  return openaiClient;
}

// POST /api/ai-assist - AIによるデータ分析と提案を生成
export async function POST(request: NextRequest) {
  try {
    // セッション確認とプラン制限チェック
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { plan: true, role: true },
    });
    const userPlan = (userRecord?.plan || "free") as PlanType;

    // マスター管理者以外はプラン制限チェック
    if (userRecord?.role !== "master_admin") {
      const usageCheck = await checkAnalysisUsage(session.userId, userPlan);
      if (!usageCheck.allowed) {
        return NextResponse.json({
          success: false,
          error: usageCheck.message,
          usageInfo: {
            currentCount: usageCheck.currentCount,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
          },
        }, { status: 429 });
      }
    }

    const body = await request.json();
    const { type, industryId, data, platform } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: "type is required" },
        { status: 400 }
      );
    }

    let prompt = "";
    let systemPrompt = "";

    const platformLabel = platform === "instagram" ? "Instagram Reels" : platform === "youtube" ? "YouTube Shorts" : "TikTok";

    if (type === "dashboard") {
      // ダッシュボード用の分析
      systemPrompt = `あなたはSNSショート動画（TikTok / YouTube Shorts / Instagram Reels）の専門アナリストです。
データを分析し、業種に特化した具体的で実用的なアドバイスを提供してください。
回答は日本語で、300文字程度で簡潔にまとめてください。
箇条書きは使わず、自然な文章で回答してください。`;

      const industry = industryId
        ? await prisma.industry.findUnique({ where: { id: parseInt(industryId) } })
        : null;

      prompt = `以下の${platformLabel}動画分析データに基づいて、${industry?.name || "この業種"}で伸びる投稿の特徴と改善提案をまとめてください。

【データサマリー】
- 総動画数: ${data.totalVideos}件
- 平均エンゲージメント率: ${(data.avgEngagementRate * 100).toFixed(2)}%
- 総再生数: ${data.totalViews.toLocaleString()}回

【コンテンツタイプ別ER】
${data.contentTypeStats?.map((s: { type: string; avgEngagement: number; count: number }) => `- ${s.type}: ${(s.avgEngagement * 100).toFixed(2)}% (${s.count}件)`).join("\n") || "データなし"}

【フック別再生数】
${data.hookTypeStats?.map((s: { type: string; totalViews: number; count: number }) => `- ${s.type}: ${s.totalViews.toLocaleString()}回 (${s.count}件)`).join("\n") || "データなし"}

【動画尺別ER】
${data.durationStats?.map((s: { category: string; avgEngagement: number; count: number }) => `- ${s.category}: ${(s.avgEngagement * 100).toFixed(2)}% (${s.count}件)`).join("\n") || "データなし"}

上記データから読み取れる傾向と、この業種で成功するための具体的なアドバイスを提供してください。`;

    } else if (type === "ranking") {
      // ランキング用の詳細分析
      const industry = industryId
        ? await prisma.industry.findUnique({ where: { id: parseInt(industryId) } })
        : null;

      const industryName = industry?.name || "全業種";

      systemPrompt = `あなたはSNSショート動画（TikTok / YouTube Shorts / Instagram Reels）の専門アナリストです。
以下に提供するデータをもとに、再生数・エンゲージメントが高い投稿の傾向を多角的に分析してください。
曖昧な一般論ではなく、提供データの数値・事例を引用しながら説明してください。
回答はMarkdown形式で、見出し（##, ###）を使って構造的に出力してください。
定量的な根拠（数値・比率・順位）を必ず含めてください。
データが不足している項目は「データ不足のため推定」と明記し、一般的な知見で補足してください。

【重要な出力ルール】
- LaTeX数式（\\frac, \\times, $...$, $$...$$など）は絶対に使わないでください。計算式はプレーンテキストで「A / B」「A × B」のように書いてください。
- 比較データがある場合はMarkdownテーブル（| ヘッダー | ... | の形式）を積極的に使ってください。
- 数値は「12,345回」「3.5%」のように読みやすい形式で記載してください。
- 箇条書きには「-」を使い、番号付きリストには「1. 2. 3. ...」を使ってください。`;

      // 投稿データを整形
      // likes/commentsが取得できているデータの割合を計算
      const allVideos = data.allVideos || [];
      const videosWithLikes = allVideos.filter((v: { likeCount: number }) => v.likeCount > 0).length;
      const videosWithComments = allVideos.filter((v: { commentCount: number }) => v.commentCount > 0).length;
      const hasEngagementData = videosWithLikes > allVideos.length * 0.1; // 10%以上にデータがあれば有効

      const videoDataList = allVideos.map((v: {
        description: string;
        viewCount: number;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        engagementRate: number;
        videoDurationSeconds: number;
        contentType?: string;
        hookType?: string;
        authorUsername: string;
        postedAt: string;
        hashtags?: string[];
        platform?: string;
      }, i: number) => {
        const hashtags = v.hashtags?.join(", ") || "なし";
        const postedAtStr = v.postedAt && !v.postedAt.includes("1970") && v.postedAt !== "null" 
          ? v.postedAt 
          : "取得不可";
        const likesStr = v.likeCount > 0 ? v.likeCount.toLocaleString() : "取得不可";
        const commentsStr = v.commentCount > 0 ? v.commentCount.toLocaleString() : "取得不可";
        const sharesStr = v.shareCount > 0 ? v.shareCount.toLocaleString() : "取得不可";
        const erStr = v.engagementRate > 0 ? `${(v.engagementRate * 100).toFixed(2)}%` : "算出不可";
        return `${i + 1}. タイトル/キャプション: ${v.description?.substring(0, 120) || "なし"}
   - プラットフォーム: ${platformLabel}
   - 投稿日時: ${postedAtStr}
   - ハッシュタグ: ${hashtags}
   - 動画尺: ${v.videoDurationSeconds || 0}秒
   - 再生回数: ${v.viewCount?.toLocaleString() || 0}
   - いいね数: ${likesStr}
   - コメント数: ${commentsStr}
   - シェア/保存数: ${sharesStr}
   - エンゲージメント率: ${erStr}
   - 投稿者: @${v.authorUsername || "不明"}
   - コンテンツタイプ: ${v.contentType || "未分類"}
   - フック: ${v.hookType || "未分類"}`;
      }).join("\n\n") || "データなし";

      const dataQualityNote = !hasEngagementData 
        ? `\n\n※ 注意: いいね数・コメント数のデータが大部分の動画で取得できていません（${videosWithLikes}/${allVideos.length}件のみ取得済み）。エンゲージメント分析は再生数ベースで行い、いいね数等が取得できている動画のデータも参考にしてください。`
        : "";

      prompt = `━━━━━━━━━━━━━━━━━━━━━━━
■ 分析対象データ
━━━━━━━━━━━━━━━━━━━━━━━
プラットフォーム: ${platformLabel}
業種: ${industryName}
データ件数: ${data.allVideos?.length || 0}件

${videoDataList}

━━━━━━━━━━━━━━━━━━━━━━━
■ 分析の指示
━━━━━━━━━━━━━━━━━━━━━━━
以下の観点すべてについて、データに基づいた具体的な分析を行ってください。

### 1. 全体サマリー
- データ全体の概況（投稿数、平均再生数、エンゲージメント率の中央値など）
- 特に突出して成果が高い投稿のトップ5とその共通点

### 2. コンテンツ内容の傾向分析
- 高再生・高エンゲージメント投稿に共通するテーマ・ジャンル
- 低パフォーマンス投稿と比較した際の内容面の違い
- 「バズった」投稿に見られるストーリー構成・情報提供の型（例：問題提起→解決、ビフォーアフター、意外性のあるオチなど）

### 3. フォーマット・演出の傾向分析
- 最適な動画尺（秒数別のパフォーマンス比較）
- 冒頭0〜3秒の掴み（フック）のパターン分析
- テロップ・テキストの使い方の傾向
- BGM / トレンドサウンドの影響度

### 4. 投稿タイミングの傾向
- 曜日別・時間帯別のパフォーマンス差
- 最も効果的な投稿タイミングの推定

### 5. ハッシュタグ・キャプションの傾向
- 高パフォーマンス投稿で使われているハッシュタグの共通点
- キャプションの長さ・トーン・CTA（行動喚起）の有無とパフォーマンスの関係

### 6. エンゲージメント構造の分析
- 再生数に対するいいね率・コメント率・シェア/保存率の分布
- 「再生は多いがエンゲージメントが低い」投稿と「再生もエンゲージメントも高い」投稿の違い
- コメントが多い投稿に見られる特徴（議論を呼ぶ要素、質問形式の活用など）

### 7. プラットフォーム別の差異
- ${platformLabel}で特に有効な手法の特徴

### 8. 実行可能なアクションプラン
上記分析をふまえ、今後の投稿戦略を以下の形式で提案してください：
- **すぐやるべきこと**（次の投稿から実践できる具体策を3つ）
- **短期施策**（1〜2週間で試すA/Bテスト案を2つ）
- **中期施策**（1〜3ヶ月のコンテンツ戦略の方向性）

最後に、分析の確度を上げるために追加で必要なデータがあれば提案してください。${dataQualityNote}`;

    } else {
      return NextResponse.json(
        { success: false, error: "Invalid type. Use 'dashboard' or 'ranking'" },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    // ランキング分析はmax_tokensを大きくする
    const maxTokens = type === "ranking" ? 8000 : 500;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const analysis = completion.choices[0]?.message?.content || "分析を生成できませんでした。";

    // AI分析結果をDBに保存
    try {
      await prisma.aiAnalysis.create({
        data: {
          type,
          platform: platform || 'tiktok',
          industryId: industryId ? parseInt(industryId) : null,
          analysis,
        },
      });
    } catch (saveError) {
      console.error('AI分析結果の保存に失敗:', saveError);
    }

    // 使用量ログを記録
    await logUsage(session.userId, "analysis", platform || "tiktok", industryId ? parseInt(industryId) : undefined, `type: ${type}`);

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        generatedAt: new Date().toISOString(),
        type,
        industryId: industryId || null,
      },
    });
  } catch (error) {
    console.error("Error generating AI assist:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to generate AI analysis: ${errorMessage}` },
      { status: 500 }
    );
  }
}
