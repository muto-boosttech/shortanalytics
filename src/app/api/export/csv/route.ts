import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getLatestAiAnalysis } from "@/lib/ai-analysis";
import { markdownToPlainText } from "@/lib/markdown-to-text";
import { getSession } from "@/lib/session";
import { checkExportUsage, logUsage, PlanType } from "@/lib/plan-limits";

// GET /api/export/csv - BOOSTTECH 縦型ショート動画分析 データCSVエクスポート
export async function GET(request: NextRequest) {
  try {
    // セッション確認とプラン制限チェック
    const session = await getSession();
    if (session) {
      const userRecord = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { plan: true, role: true },
      });
      const userPlan = (userRecord?.plan || "free") as PlanType;

      if (userRecord?.role !== "master_admin") {
        const usageCheck = await checkExportUsage(session.userId, userPlan);
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

      const sp = request.nextUrl.searchParams;
      await logUsage(session.userId, "export", sp.get("platform") || "tiktok", undefined, `csv:${sp.get("type") || "ranking"}`);
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "ranking"; // 'ranking' | 'dashboard'
    const industryId = searchParams.get("industry_id");
    const platform = searchParams.get("platform") || "tiktok";
    const sortBy = searchParams.get("sortBy") || "viewCount";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (type === "ranking") {
      return await exportRankingCSV(industryId, platform, sortBy, sortOrder);
    } else {
      return await exportDashboardCSV(industryId, platform);
    }
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export CSV" },
      { status: 500 }
    );
  }
}

async function exportRankingCSV(
  industryId: string | null,
  platform: string,
  sortBy: string,
  sortOrder: string
) {
  const where: Record<string, unknown> = { platform };
  if (industryId && industryId !== "all") {
    where.videoTags = { some: { industryId: parseInt(industryId) } };
  }

  const orderBy: Record<string, string> = {};
  orderBy[sortBy] = sortOrder;

  const videos = await prisma.video.findMany({
    where,
    orderBy,
    take: 500,
    include: {
      videoTags: {
        include: { industry: true },
      },
    },
  });

  // Fetch AI analysis
  const aiAnalysis = await getLatestAiAnalysis("ranking", platform, industryId);

  // BOM for Excel compatibility
  const BOM = "\uFEFF";
  const headers = [
    "順位",
    "投稿者",
    "説明",
    "ハッシュタグ",
    "再生数",
    "いいね数",
    "コメント数",
    "シェア数",
    "ER(%)",
    "動画尺(秒)",
    "コンテンツ類型",
    "フックタイプ",
    "業種",
    "プラットフォーム",
    "投稿日",
    "動画URL",
    "サムネイルURL",
  ];

  const rows = videos.map((v, i) => {
    const tag = v.videoTags?.[0];
    return [
      i + 1,
      `@${v.authorUsername}`,
      `"${(v.description || "").replace(/"/g, '""')}"`,
      `"${Array.isArray(v.hashtags) ? v.hashtags.join(", ") : ""}"`,
      v.viewCount,
      v.likeCount,
      v.commentCount,
      v.shareCount,
      (v.engagementRate * 100).toFixed(2),
      v.videoDurationSeconds || "",
      tag?.contentType || "",
      tag?.hookType || "",
      tag?.industry?.name || "",
      v.platform,
      v.postedAt ? new Date(v.postedAt).toISOString().split("T")[0] : "",
      v.videoUrl || "",
      v.thumbnailUrl || "",
    ].join(",");
  });

  let csv = BOM + headers.join(",") + "\n" + rows.join("\n");

  // Add AI Analysis section if available
  if (aiAnalysis) {
    csv += "\n\n";
    csv += "=== AI分析レポート ===\n";
    const plainText = markdownToPlainText(aiAnalysis);
    // Escape CSV: wrap each line in quotes to handle commas
    const analysisLines = plainText.split("\n");
    for (const line of analysisLines) {
      csv += `"${line.replace(/"/g, '""')}"\n`;
    }
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ranking_${platform}_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

async function exportDashboardCSV(
  industryId: string | null,
  platform: string
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const where: Record<string, unknown> = {
    platform,
    postedAt: { gte: startDate },
  };
  if (industryId && industryId !== "all") {
    where.videoTags = { some: { industryId: parseInt(industryId) } };
  }

  const videos = await prisma.video.findMany({
    where,
    include: { videoTags: true },
  });

  const totalVideos = videos.length;
  const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);
  const totalShares = videos.reduce((s, v) => s + v.shareCount, 0);
  const avgER = totalVideos > 0
    ? videos.reduce((s, v) => s + v.engagementRate, 0) / totalVideos
    : 0;

  // コンテンツタイプ別集計
  const contentTypeStats: Record<string, { count: number; totalViews: number; totalER: number }> = {};
  const hookTypeStats: Record<string, { count: number; totalViews: number; totalER: number }> = {};
  const durationStats: Record<string, { count: number; totalViews: number; totalER: number }> = {};

  for (const video of videos) {
    for (const tag of video.videoTags) {
      if (tag.contentType) {
        if (!contentTypeStats[tag.contentType]) contentTypeStats[tag.contentType] = { count: 0, totalViews: 0, totalER: 0 };
        contentTypeStats[tag.contentType].count++;
        contentTypeStats[tag.contentType].totalViews += video.viewCount;
        contentTypeStats[tag.contentType].totalER += video.engagementRate;
      }
      if (tag.hookType) {
        if (!hookTypeStats[tag.hookType]) hookTypeStats[tag.hookType] = { count: 0, totalViews: 0, totalER: 0 };
        hookTypeStats[tag.hookType].count++;
        hookTypeStats[tag.hookType].totalViews += video.viewCount;
        hookTypeStats[tag.hookType].totalER += video.engagementRate;
      }
      if (tag.durationCategory) {
        if (!durationStats[tag.durationCategory]) durationStats[tag.durationCategory] = { count: 0, totalViews: 0, totalER: 0 };
        durationStats[tag.durationCategory].count++;
        durationStats[tag.durationCategory].totalViews += video.viewCount;
        durationStats[tag.durationCategory].totalER += video.engagementRate;
      }
    }
  }

  // Fetch AI analysis
  const aiAnalysis = await getLatestAiAnalysis("dashboard", platform, industryId);

  const BOM = "\uFEFF";
  let csv = BOM;

  // KPIセクション
  csv += "=== KPIサマリー ===\n";
  csv += "指標,値\n";
  csv += `総動画数,${totalVideos}\n`;
  csv += `総再生数,${totalViews}\n`;
  csv += `総いいね数,${totalLikes}\n`;
  csv += `総コメント数,${totalComments}\n`;
  csv += `総シェア数,${totalShares}\n`;
  csv += `平均ER(%),${(avgER * 100).toFixed(2)}\n`;
  csv += "\n";

  // コンテンツタイプ別
  csv += "=== コンテンツ類型別 ===\n";
  csv += "類型,件数,総再生数,平均ER(%)\n";
  for (const [type, stats] of Object.entries(contentTypeStats)) {
    csv += `${type},${stats.count},${stats.totalViews},${((stats.totalER / stats.count) * 100).toFixed(2)}\n`;
  }
  csv += "\n";

  // フックタイプ別
  csv += "=== フックタイプ別 ===\n";
  csv += "タイプ,件数,総再生数,平均ER(%)\n";
  for (const [type, stats] of Object.entries(hookTypeStats)) {
    csv += `${type},${stats.count},${stats.totalViews},${((stats.totalER / stats.count) * 100).toFixed(2)}\n`;
  }
  csv += "\n";

  // 動画尺別
  csv += "=== 動画尺別 ===\n";
  csv += "カテゴリ,件数,総再生数,平均ER(%)\n";
  for (const [cat, stats] of Object.entries(durationStats)) {
    csv += `${cat},${stats.count},${stats.totalViews},${((stats.totalER / stats.count) * 100).toFixed(2)}\n`;
  }

  // Add AI Analysis section if available
  if (aiAnalysis) {
    csv += "\n";
    csv += "=== AI分析レポート ===\n";
    const plainText = markdownToPlainText(aiAnalysis);
    const analysisLines = plainText.split("\n");
    for (const line of analysisLines) {
      csv += `"${line.replace(/"/g, '""')}"\n`;
    }
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dashboard_${platform}_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
