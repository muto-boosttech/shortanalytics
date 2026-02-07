import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getLatestAiAnalysis } from "@/lib/ai-analysis";
import { extractMarkdownTables, extractMarkdownSections, markdownToPlainText } from "@/lib/markdown-to-text";
import { getSession } from "@/lib/session";
import { checkExportUsage, logUsage, PlanType } from "@/lib/plan-limits";
import PptxGenJS from "pptxgenjs";

// ===== Brand Constants =====
const BRAND_NAME = "BOOSTTECH";
const BRAND_SUBTITLE = "\u7e26\u578b\u30b7\u30e7\u30fc\u30c8\u52d5\u753b\u5206\u6790";

// ===== Color Palette (Green-based) =====
const C = {
  primary: "10B981",
  primaryDark: "059669",
  primaryDeep: "047857",
  primaryLight: "D1FAE5",
  primaryPale: "ECFDF5",
  textDark: "111827",
  textMedium: "374151",
  textLight: "6B7280",
  textMuted: "9CA3AF",
  bgWhite: "FFFFFF",
  bgLight: "F9FAFB",
  bgCard: "F3F4F6",
  border: "E5E7EB",
  accentBlue: "3B82F6",
  accentPink: "EC4899",
  accentAmber: "F59E0B",
  white: "FFFFFF",
  emerald200: "A7F3D0",
};

// Fetch thumbnail as base64 data URL
async function fetchThumbnailBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// GET /api/export/pptx
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
      await logUsage(session.userId, "export", sp.get("platform") || "tiktok", undefined, `pptx:${sp.get("type") || "ranking"}`);
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "ranking";
    const industryId = searchParams.get("industry_id");
    const platform = searchParams.get("platform") || "tiktok";
    const industryName = searchParams.get("industry_name") || "全業種";

    if (type === "ranking") {
      return await exportRankingPPTX(industryId, platform, industryName);
    } else {
      return await exportDashboardPPTX(industryId, platform, industryName);
    }
  } catch (error) {
    console.error("Error exporting PPTX:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export PPTX" },
      { status: 500 }
    );
  }
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

/**
 * AI analysis slides
 */
function addAiAnalysisSlides(pptx: PptxGenJS, analysisText: string) {
  const sections = extractMarkdownSections(analysisText);
  const tables = extractMarkdownTables(analysisText);
  let tableIdx = 0;

  const titleSlide = pptx.addSlide();
  titleSlide.background = { fill: C.primaryDeep };
  titleSlide.addText("AI Analysis Report", {
    x: 0.5, y: 2.0, w: 9, h: 1,
    fontSize: 32, color: C.white, bold: true, align: "center",
    fontFace: "Helvetica",
  });
  titleSlide.addText(`Powered by ${BRAND_NAME} AI`, {
    x: 0.5, y: 3.2, w: 9, h: 0.5,
    fontSize: 14, color: C.emerald200, align: "center",
    fontFace: "Helvetica",
  });

  if (sections.length === 0) {
    const plainText = markdownToPlainText(analysisText);
    const chunkSize = 1200;
    for (let i = 0; i < plainText.length; i += chunkSize) {
      const chunk = plainText.substring(i, i + chunkSize);
      const slide = pptx.addSlide();
      slide.addText("AI Analysis", {
        x: 0.3, y: 0.1, w: 9.4, h: 0.4,
        fontSize: 16, color: C.primaryDark, bold: true,
        fontFace: "Helvetica",
      });
      slide.addText(chunk, {
        x: 0.3, y: 0.6, w: 9.4, h: 4.5,
        fontSize: 9, color: C.textMedium,
        fontFace: "Helvetica",
        valign: "top",
        wrap: true,
      });
    }
    return;
  }

  let currentSlide: PptxGenJS.Slide | null = null;
  let currentSlideY = 0.6;
  const maxY = 4.8;

  for (const section of sections) {
    const sectionHasTable = section.content.includes("|") && section.content.includes("---");
    const plainContent = markdownToPlainText(
      section.content.replace(/\|[^\n]+\|/g, "").replace(/\n{3,}/g, "\n\n")
    ).trim();

    const estimatedHeight = (sectionHasTable ? 2.5 : 0) + (plainContent.length > 0 ? Math.ceil(plainContent.length / 120) * 0.25 + 0.5 : 0) + 0.5;

    if (!currentSlide || currentSlideY + estimatedHeight > maxY) {
      currentSlide = pptx.addSlide();
      currentSlideY = 0.1;
      currentSlide.addText("AI Analysis", {
        x: 0.3, y: currentSlideY, w: 9.4, h: 0.35,
        fontSize: 14, color: C.primaryDark, bold: true,
        fontFace: "Helvetica",
      });
      currentSlideY = 0.5;
    }

    const titleFontSize = section.level <= 2 ? 12 : 10;
    currentSlide.addText(section.title, {
      x: 0.3, y: currentSlideY, w: 9.4, h: 0.3,
      fontSize: titleFontSize, color: C.textDark, bold: true,
      fontFace: "Helvetica",
    });
    currentSlideY += 0.35;

    if (sectionHasTable && tableIdx < tables.length) {
      const table = tables[tableIdx];
      tableIdx++;

      const tableRows: PptxGenJS.TableRow[] = [];
      tableRows.push(
        table.headers.map((h) => ({
          text: h,
          options: {
            bold: true,
            color: C.white,
            fill: { color: C.primaryDark },
            fontSize: 8,
            align: "center" as const,
          },
        }))
      );
      table.rows.forEach((row, rIdx) => {
        const bgColor = rIdx % 2 === 0 ? C.primaryPale : C.bgWhite;
        tableRows.push(
          row.map((cell) => ({
            text: cell,
            options: {
              fontSize: 8,
              color: C.textMedium,
              fill: { color: bgColor },
            },
          }))
        );
      });

      const colCount = table.headers.length;
      const colW = colCount > 0 ? 9.0 / colCount : 2.0;

      currentSlide.addTable(tableRows, {
        x: 0.3,
        y: currentSlideY,
        w: 9.4,
        colW: Array(colCount).fill(colW),
        border: { type: "solid", pt: 0.5, color: C.border },
        rowH: 0.28,
        autoPage: false,
      });

      currentSlideY += (tableRows.length + 1) * 0.28 + 0.2;
    }

    if (plainContent) {
      const maxChars = 500;
      const displayText = plainContent.length > maxChars
        ? plainContent.substring(0, maxChars) + "..."
        : plainContent;
      const textHeight = Math.max(0.4, Math.ceil(displayText.length / 120) * 0.2);

      currentSlide.addText(displayText, {
        x: 0.3, y: currentSlideY, w: 9.4, h: textHeight,
        fontSize: 8, color: C.textLight,
        fontFace: "Helvetica",
        valign: "top",
        wrap: true,
      });
      currentSlideY += textHeight + 0.15;
    }
  }
}

async function exportRankingPPTX(
  industryId: string | null,
  platform: string,
  industryName: string
) {
  const where: Record<string, unknown> = { platform };
  if (industryId && industryId !== "all") {
    where.videoTags = { some: { industryId: parseInt(industryId) } };
  }

  const videos = await prisma.video.findMany({
    where,
    orderBy: { viewCount: "desc" },
    take: 20,
    include: {
      videoTags: { include: { industry: true } },
    },
  });

  const thumbnailMap: Record<number, string> = {};
  const thumbnailPromises = videos.map(async (v, idx) => {
    if (v.thumbnailUrl) {
      const data = await fetchThumbnailBase64(v.thumbnailUrl);
      if (data) thumbnailMap[idx] = data;
    }
  });
  await Promise.all(thumbnailPromises);

  const aiAnalysis = await getLatestAiAnalysis("ranking", platform, industryId);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = BRAND_NAME;
  pptx.title = `Ranking Report - ${platform}`;

  const platformLabel = platform === "tiktok" ? "TikTok" : platform === "youtube" ? "YouTube" : "Instagram";
  const dateStr = new Date().toLocaleDateString("ja-JP");

  // Title slide
  const slide1 = pptx.addSlide();
  slide1.background = { fill: C.primaryDeep };
  slide1.addText(BRAND_NAME, {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 36, color: C.white, bold: true, align: "center",
    fontFace: "Helvetica",
  });
  slide1.addText(BRAND_SUBTITLE, {
    x: 0.5, y: 2.2, w: 9, h: 0.5,
    fontSize: 14, color: C.emerald200, align: "center",
    fontFace: "Helvetica",
  });
  slide1.addText("Ranking Report", {
    x: 0.5, y: 2.9, w: 9, h: 0.6,
    fontSize: 24, color: C.white, align: "center",
    fontFace: "Helvetica",
  });
  slide1.addText(`${platformLabel} / ${industryName}`, {
    x: 0.5, y: 3.5, w: 9, h: 0.5,
    fontSize: 18, color: C.emerald200, align: "center",
    fontFace: "Helvetica",
  });
  slide1.addText(dateStr, {
    x: 0.5, y: 4.2, w: 9, h: 0.4,
    fontSize: 12, color: C.emerald200, align: "center",
    fontFace: "Helvetica",
  });

  // Video cards
  const videosPerSlide = 4;
  for (let pageIdx = 0; pageIdx < Math.ceil(videos.length / videosPerSlide); pageIdx++) {
    const slide = pptx.addSlide();
    slide.addText(`Top ${platformLabel} Videos (${pageIdx * videosPerSlide + 1}-${Math.min((pageIdx + 1) * videosPerSlide, videos.length)})`, {
      x: 0.3, y: 0.1, w: 9.4, h: 0.4,
      fontSize: 16, color: C.primaryDark, bold: true,
      fontFace: "Helvetica",
    });

    const pageVideos = videos.slice(pageIdx * videosPerSlide, (pageIdx + 1) * videosPerSlide);
    pageVideos.forEach((v, idx) => {
      const globalIdx = pageIdx * videosPerSlide + idx;
      const cardY = 0.6 + idx * 1.25;
      const tag = v.videoTags?.[0];

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.3, y: cardY, w: 9.4, h: 1.15,
        fill: { color: globalIdx % 2 === 0 ? C.primaryPale : C.bgWhite },
        rectRadius: 0.05,
        line: { color: C.border, width: 0.5 },
      });

      const thumbData = thumbnailMap[globalIdx];
      if (thumbData) {
        try {
          slide.addImage({
            data: thumbData,
            x: 0.4, y: cardY + 0.08, w: 0.56, h: 1.0,
            rounding: true,
          });
        } catch {
          slide.addShape(pptx.ShapeType.rect, {
            x: 0.4, y: cardY + 0.08, w: 0.56, h: 1.0,
            fill: { color: C.bgCard },
          });
        }
      } else {
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.4, y: cardY + 0.08, w: 0.56, h: 1.0,
          fill: { color: C.bgCard },
        });
      }

      slide.addText(`#${globalIdx + 1}`, {
        x: 1.1, y: cardY + 0.05, w: 0.5, h: 0.3,
        fontSize: 14, color: C.primaryDark, bold: true,
        fontFace: "Helvetica",
      });

      slide.addText(`@${v.authorUsername || "unknown"}`, {
        x: 1.6, y: cardY + 0.05, w: 3.0, h: 0.25,
        fontSize: 10, color: C.textDark, bold: true,
        fontFace: "Helvetica",
      });

      slide.addText((v.description || "").substring(0, 80), {
        x: 1.1, y: cardY + 0.35, w: 5.5, h: 0.3,
        fontSize: 7, color: C.textLight,
        fontFace: "Helvetica",
      });

      const duration = v.videoDurationSeconds
        ? `${Math.floor(v.videoDurationSeconds / 60)}:${(v.videoDurationSeconds % 60).toString().padStart(2, "0")}`
        : "-";

      const statsText = `Views: ${formatNum(v.viewCount)}  |  Likes: ${formatNum(v.likeCount)}  |  ER: ${(v.engagementRate * 100).toFixed(1)}%  |  Duration: ${duration}  |  Type: ${tag?.contentType || "-"}`;
      slide.addText(statsText, {
        x: 1.1, y: cardY + 0.7, w: 7.5, h: 0.3,
        fontSize: 8, color: C.textMedium,
        fontFace: "Helvetica",
      });

      const erColor = v.engagementRate * 100 >= 10 ? C.primary : v.engagementRate * 100 >= 5 ? C.accentBlue : C.textLight;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.8, y: cardY + 0.25, w: 0.8, h: 0.6,
        fill: { color: erColor },
        rectRadius: 0.05,
      });
      slide.addText(`${(v.engagementRate * 100).toFixed(1)}%`, {
        x: 8.8, y: cardY + 0.25, w: 0.8, h: 0.35,
        fontSize: 11, color: C.white, bold: true, align: "center",
        fontFace: "Helvetica",
      });
      slide.addText("ER", {
        x: 8.8, y: cardY + 0.55, w: 0.8, h: 0.2,
        fontSize: 7, color: C.white, align: "center",
        fontFace: "Helvetica",
      });
    });
  }

  if (aiAnalysis) {
    addAiAnalysisSlides(pptx, aiAnalysis);
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="ranking_${platform}_${new Date().toISOString().split("T")[0]}.pptx"`,
    },
  });
}

async function exportDashboardPPTX(
  industryId: string | null,
  platform: string,
  industryName: string
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
    orderBy: { viewCount: "desc" },
  });

  const totalVideos = videos.length;
  const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);
  const avgER = totalVideos > 0
    ? videos.reduce((s, v) => s + v.engagementRate, 0) / totalVideos
    : 0;

  const top8 = videos.slice(0, 8);
  const thumbnailMap: Record<number, string> = {};
  const thumbnailPromises = top8.map(async (v, idx) => {
    if (v.thumbnailUrl) {
      const data = await fetchThumbnailBase64(v.thumbnailUrl);
      if (data) thumbnailMap[idx] = data;
    }
  });
  await Promise.all(thumbnailPromises);

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

  const aiAnalysis = await getLatestAiAnalysis("dashboard", platform, industryId);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = BRAND_NAME;
  pptx.title = `Dashboard Report - ${platform}`;

  const platformLabel = platform === "tiktok" ? "TikTok" : platform === "youtube" ? "YouTube" : "Instagram";
  const dateStr = new Date().toLocaleDateString("ja-JP");

  // Title slide
  const slide1 = pptx.addSlide();
  slide1.background = { fill: C.primaryDeep };
  slide1.addText(BRAND_NAME, {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 36, color: C.white, bold: true, align: "center",
    fontFace: "Helvetica",
  });
  slide1.addText(BRAND_SUBTITLE, {
    x: 0.5, y: 2.2, w: 9, h: 0.5,
    fontSize: 14, color: C.emerald200, align: "center",
    fontFace: "Helvetica",
  });
  slide1.addText("Dashboard Report", {
    x: 0.5, y: 2.9, w: 9, h: 0.6,
    fontSize: 24, color: C.white, align: "center",
  });
  slide1.addText(`${platformLabel} / ${industryName}`, {
    x: 0.5, y: 3.5, w: 9, h: 0.5,
    fontSize: 18, color: C.emerald200, align: "center",
  });
  slide1.addText(dateStr, {
    x: 0.5, y: 4.2, w: 9, h: 0.4,
    fontSize: 12, color: C.emerald200, align: "center",
  });

  // KPI Summary
  const slide2 = pptx.addSlide();
  slide2.addText("KPI Summary", {
    x: 0.5, y: 0.2, w: 9, h: 0.5,
    fontSize: 20, color: C.primaryDark, bold: true,
  });

  const kpiItems = [
    { label: "Total Videos", value: totalVideos.toLocaleString(), color: C.primary },
    { label: "Total Views", value: formatNum(totalViews), color: C.accentBlue },
    { label: "Total Likes", value: formatNum(totalLikes), color: C.accentPink },
    { label: "Total Comments", value: formatNum(totalComments), color: C.accentAmber },
    { label: "Avg ER", value: `${(avgER * 100).toFixed(2)}%`, color: C.primaryDark },
  ];

  kpiItems.forEach((kpi, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.2;
    const y = 1.0 + row * 1.8;

    slide2.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 2.8, h: 1.4,
      fill: { color: C.bgLight },
      rectRadius: 0.1,
    });
    slide2.addText(kpi.label, {
      x: x + 0.2, y: y + 0.2, w: 2.4, h: 0.3,
      fontSize: 11, color: C.textLight,
    });
    slide2.addText(kpi.value, {
      x: x + 0.2, y: y + 0.55, w: 2.4, h: 0.6,
      fontSize: 28, color: kpi.color, bold: true,
    });
  });

  // Top Videos
  if (top8.length > 0) {
    const topSlide = pptx.addSlide();
    topSlide.addText("Top Videos", {
      x: 0.3, y: 0.1, w: 9.4, h: 0.4,
      fontSize: 18, color: C.primaryDark, bold: true,
    });

    top8.forEach((v, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const cardX = 0.3 + col * 2.4;
      const cardY = 0.6 + row * 2.5;

      topSlide.addShape(pptx.ShapeType.roundRect, {
        x: cardX, y: cardY, w: 2.2, h: 2.3,
        fill: { color: C.primaryPale },
        rectRadius: 0.05,
        line: { color: C.border, width: 0.5 },
      });

      const thumbData = thumbnailMap[idx];
      if (thumbData) {
        try {
          topSlide.addImage({
            data: thumbData,
            x: cardX + 0.5, y: cardY + 0.1, w: 0.84, h: 1.5,
            rounding: true,
          });
        } catch {
          topSlide.addShape(pptx.ShapeType.rect, {
            x: cardX + 0.5, y: cardY + 0.1, w: 0.84, h: 1.5,
            fill: { color: C.bgCard },
          });
        }
      } else {
        topSlide.addShape(pptx.ShapeType.rect, {
          x: cardX + 0.5, y: cardY + 0.1, w: 0.84, h: 1.5,
          fill: { color: C.bgCard },
        });
      }

      topSlide.addText(`#${idx + 1}`, {
        x: cardX + 0.05, y: cardY + 0.05, w: 0.4, h: 0.25,
        fontSize: 10, color: C.primaryDark, bold: true,
      });

      topSlide.addText(`@${(v.authorUsername || "unknown").substring(0, 14)}`, {
        x: cardX + 0.05, y: cardY + 1.65, w: 2.1, h: 0.2,
        fontSize: 7, color: C.textDark, bold: true,
      });

      topSlide.addText(`${formatNum(v.viewCount)} views | ER: ${(v.engagementRate * 100).toFixed(1)}%`, {
        x: cardX + 0.05, y: cardY + 1.85, w: 2.1, h: 0.2,
        fontSize: 6, color: C.textLight,
      });

      const tag = v.videoTags?.[0];
      if (tag?.contentType) {
        topSlide.addText(tag.contentType, {
          x: cardX + 0.05, y: cardY + 2.05, w: 1.0, h: 0.18,
          fontSize: 6, color: C.primaryDark,
        });
      }
    });
  }

  // Stats slides
  const addStatsSlide = (title: string, stats: Record<string, { count: number; totalViews: number; totalER: number }>) => {
    const slide = pptx.addSlide();
    slide.addText(title, {
      x: 0.5, y: 0.2, w: 9, h: 0.5,
      fontSize: 20, color: C.primaryDark, bold: true,
    });

    const rows: PptxGenJS.TableRow[] = [];
    rows.push([
      { text: "Type", options: { bold: true, color: C.white, fill: { color: C.primaryDark }, fontSize: 10 } },
      { text: "Count", options: { bold: true, color: C.white, fill: { color: C.primaryDark }, fontSize: 10, align: "right" } },
      { text: "Total Views", options: { bold: true, color: C.white, fill: { color: C.primaryDark }, fontSize: 10, align: "right" } },
      { text: "Avg ER(%)", options: { bold: true, color: C.white, fill: { color: C.primaryDark }, fontSize: 10, align: "right" } },
    ]);

    const sorted = Object.entries(stats).sort((a, b) => b[1].count - a[1].count);
    sorted.forEach(([type, s], idx) => {
      const bgColor = idx % 2 === 0 ? C.primaryPale : C.bgWhite;
      rows.push([
        { text: type, options: { fontSize: 10, fill: { color: bgColor } } },
        { text: s.count.toString(), options: { fontSize: 10, align: "right", fill: { color: bgColor } } },
        { text: formatNum(s.totalViews), options: { fontSize: 10, align: "right", fill: { color: bgColor } } },
        { text: ((s.totalER / s.count) * 100).toFixed(2), options: { fontSize: 10, align: "right", fill: { color: bgColor } } },
      ]);
    });

    slide.addTable(rows, {
      x: 0.5, y: 0.9, w: 9,
      colW: [3.0, 1.5, 2.5, 2.0],
      border: { type: "solid", pt: 0.5, color: C.border },
      rowH: 0.4,
      autoPage: false,
    });
  };

  addStatsSlide("Content Type Analysis", contentTypeStats);
  addStatsSlide("Hook Type Analysis", hookTypeStats);
  addStatsSlide("Duration Analysis", durationStats);

  if (aiAnalysis) {
    addAiAnalysisSlides(pptx, aiAnalysis);
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="dashboard_${platform}_${new Date().toISOString().split("T")[0]}.pptx"`,
    },
  });
}
