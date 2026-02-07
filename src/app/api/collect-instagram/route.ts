import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/collect-instagram - Apify Instagram Hashtag Scraperを非同期で開始
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { hashtags, industryId, maxResults = 30, apiToken } = body;

    const APIFY_API_TOKEN = apiToken || process.env.APIFY_API_TOKEN;

    if (!APIFY_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_TOKENが設定されていません。" },
        { status: 500 }
      );
    }

    // 業種の存在確認とハッシュタグ取得
    let industry = null;
    if (industryId) {
      industry = await prisma.industry.findUnique({
        where: { id: industryId },
        include: {
          hashtags: {
            where: { isActive: true, platform: "instagram" },
          },
        },
      });

      if (!industry) {
        return NextResponse.json(
          { success: false, error: "業種が見つかりません" },
          { status: 404 }
        );
      }

      if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
        hashtags = industry.hashtags.map((h: { hashtag: string }) => h.hashtag);
      }
    }

    if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return NextResponse.json(
        { success: false, error: "ハッシュタグの配列が必要です" },
        { status: 400 }
      );
    }

    // 収集ログを作成
    const collectionLog = await prisma.collectionLog.create({
      data: {
        industryId: industryId || null,
        hashtag: hashtags.join(", "),
        status: "running",
        startedAt: new Date(),
        platform: "instagram",
      },
    });

    // Apifyジョブを非同期で開始
    const apifyUrl = `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/runs?token=${APIFY_API_TOKEN}`;

    const apifyResponse = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hashtags: hashtags.map((h: string) => h.replace(/^#/, "")),
        resultsType: "reels",
        resultsLimit: maxResults,
      }),
    });

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      await prisma.collectionLog.update({
        where: { id: collectionLog.id },
        data: { status: "failed", completedAt: new Date(), errorMessage: `Apify APIエラー: ${apifyResponse.status}` },
      });
      return NextResponse.json(
        { success: false, error: `Apify APIエラー: ${apifyResponse.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const runData = await apifyResponse.json();
    const runId = runData.data?.id;

    if (!runId) {
      await prisma.collectionLog.update({
        where: { id: collectionLog.id },
        data: { status: "failed", completedAt: new Date(), errorMessage: "Apify runId取得失敗" },
      });
      return NextResponse.json(
        { success: false, error: "Apifyジョブの開始に失敗しました" },
        { status: 500 }
      );
    }

    await prisma.collectionLog.update({
      where: { id: collectionLog.id },
      data: { apifyRunId: runId },
    });

    return NextResponse.json({
      success: true,
      data: {
        collectionLogId: collectionLog.id,
        runId,
        status: "running",
        platform: "instagram",
        message: "Instagram Reels収集ジョブを開始しました。",
      },
    });
  } catch (error) {
    console.error("Error starting Instagram collection:", error);
    return NextResponse.json(
      { success: false, error: `Instagram収集の開始に失敗しました: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
