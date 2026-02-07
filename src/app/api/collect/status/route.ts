import { NextRequest, NextResponse } from "next/server";

// GET /api/collect/status?runId=xxx - Apifyジョブの進行状況を確認
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json(
        { success: false, error: "runIdが必要です" },
        { status: 400 }
      );
    }

    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
    if (!APIFY_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: "APIFY_API_TOKENが設定されていません" },
        { status: 500 }
      );
    }

    // Apify Run APIでステータスを確認
    const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`;
    const response = await fetch(statusUrl);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Apifyステータス確認エラー: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const run = data.data;

    // Apifyのステータス: READY, RUNNING, SUCCEEDED, FAILED, ABORTING, ABORTED, TIMED-OUT
    const status = run?.status;
    const isFinished = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status);
    const isSuccess = status === "SUCCEEDED";

    return NextResponse.json({
      success: true,
      data: {
        runId,
        status,
        isFinished,
        isSuccess,
        datasetId: run?.defaultDatasetId || null,
        startedAt: run?.startedAt,
        finishedAt: run?.finishedAt,
      },
    });
  } catch (error) {
    console.error("Error checking Apify status:", error);
    return NextResponse.json(
      { success: false, error: `ステータス確認に失敗しました: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
