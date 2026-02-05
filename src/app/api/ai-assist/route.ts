import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

// OpenAI clientは遅延初期化（ビルド時のエラーを回避）
let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!openaiClient) {
    // OpenAIクライアントを初期化
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
    const body = await request.json();
    const { type, industryId, data } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: "type is required" },
        { status: 400 }
      );
    }

    let prompt = "";
    let systemPrompt = "";

    if (type === "dashboard") {
      // ダッシュボード用の分析
      systemPrompt = `あなたはTikTokマーケティングの専門家です。
データを分析し、業種に特化した具体的で実用的なアドバイスを提供してください。
回答は日本語で、300文字程度で簡潔にまとめてください。
箇条書きは使わず、自然な文章で回答してください。`;

      const industry = industryId
        ? await prisma.industry.findUnique({ where: { id: parseInt(industryId) } })
        : null;

      prompt = `以下のTikTok動画分析データに基づいて、${industry?.name || "この業種"}で伸びる投稿の特徴と改善提案をまとめてください。

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
      // ランキング用の分析
      systemPrompt = `あなたはTikTokマーケティングの専門家です。
トップ動画の共通点を分析し、成功パターンを抽出してください。
回答は日本語で、300文字程度で簡潔にまとめてください。
箇条書きは使わず、自然な文章で回答してください。`;

      const industry = industryId
        ? await prisma.industry.findUnique({ where: { id: parseInt(industryId) } })
        : null;

      prompt = `以下のTikTokランキング上位動画のデータに基づいて、${industry?.name || "この業種"}で成功している動画の共通点と特徴を分析してください。

【トップ動画データ】
${data.topVideos?.slice(0, 5).map((v: { 
  description: string; 
  viewCount: number; 
  engagementRate: number; 
  videoDurationSeconds: number;
  contentType?: string;
  hookType?: string;
}, i: number) => `
${i + 1}位:
- 説明: ${v.description?.substring(0, 50) || "なし"}...
- 再生数: ${v.viewCount.toLocaleString()}回
- ER: ${(v.engagementRate * 100).toFixed(2)}%
- 動画尺: ${v.videoDurationSeconds}秒
- コンテンツタイプ: ${v.contentType || "未分類"}
- フック: ${v.hookType || "未分類"}
`).join("\n") || "データなし"}

上記のトップ動画から読み取れる成功パターンと、再現するためのポイントを提供してください。`;

    } else {
      return NextResponse.json(
        { success: false, error: "Invalid type. Use 'dashboard' or 'ranking'" },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const analysis = completion.choices[0]?.message?.content || "分析を生成できませんでした。";

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
