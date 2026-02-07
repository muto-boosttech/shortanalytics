import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getLatestAiAnalysis } from "@/lib/ai-analysis";
import { getSession } from "@/lib/session";
import { checkExportUsage, logUsage, PlanType } from "@/lib/plan-limits";
import { extractMarkdownTables, extractMarkdownSections, markdownToPlainText } from "@/lib/markdown-to-text";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

// ===== Brand Constants =====
const BRAND_NAME = "BOOSTTECH";
const BRAND_SUBTITLE = "縦型ショート動画分析";

// ===== Color Palette (Green-based) =====
const COLORS = {
  // Primary greens
  primary: [16, 185, 129] as [number, number, number],       // #10B981 - Emerald 500
  primaryDark: [5, 150, 105] as [number, number, number],     // #059669 - Emerald 600
  primaryDeep: [4, 120, 87] as [number, number, number],      // #047857 - Emerald 700
  primaryLight: [209, 250, 229] as [number, number, number],  // #D1FAE5 - Emerald 100
  primaryPale: [236, 253, 245] as [number, number, number],   // #ECFDF5 - Emerald 50

  // Neutrals
  textDark: [17, 24, 39] as [number, number, number],         // #111827 - Gray 900
  textMedium: [55, 65, 81] as [number, number, number],       // #374151 - Gray 700
  textLight: [107, 114, 128] as [number, number, number],     // #6B7280 - Gray 500
  textMuted: [156, 163, 175] as [number, number, number],     // #9CA3AF - Gray 400

  // Backgrounds
  bgWhite: [255, 255, 255] as [number, number, number],
  bgLight: [249, 250, 251] as [number, number, number],       // #F9FAFB - Gray 50
  bgCard: [243, 244, 246] as [number, number, number],        // #F3F4F6 - Gray 100
  border: [229, 231, 235] as [number, number, number],        // #E5E7EB - Gray 200

  // Accent
  accentBlue: [59, 130, 246] as [number, number, number],     // #3B82F6
  accentRed: [239, 68, 68] as [number, number, number],       // #EF4444
  accentAmber: [245, 158, 11] as [number, number, number],    // #F59E0B
  white: [255, 255, 255] as [number, number, number],
};

// Page dimensions
const PAGE = {
  a4w: 210,
  a4h: 297,
  marginLeft: 18,
  marginRight: 18,
  marginTop: 20,
  marginBottom: 15,
  contentWidth: 174, // 210 - 18 - 18
  // Landscape
  lw: 297,
  lh: 210,
  lMarginLeft: 15,
  lMarginRight: 15,
  lContentWidth: 267, // 297 - 15 - 15
};

// Load Japanese font
let fontLoaded = false;
let fontBase64 = "";

function loadFont() {
  if (fontLoaded) return;
  try {
    const fontPath = path.join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.ttf");
    const fontBuffer = fs.readFileSync(fontPath);
    fontBase64 = fontBuffer.toString("base64");
    fontLoaded = true;
  } catch (e) {
    console.error("Failed to load Japanese font:", e);
  }
}

function setupJapaneseFont(doc: jsPDF) {
  loadFont();
  if (fontBase64) {
    doc.addFileToVFS("NotoSansJP-Regular.ttf", fontBase64);
    doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
    doc.setFont("NotoSansJP");
  }
}

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

// GET /api/export/pdf
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

      // 使用量ログを記録
      const searchParamsForLog = request.nextUrl.searchParams;
      await logUsage(session.userId, "export", searchParamsForLog.get("platform") || "tiktok", undefined, `pdf:${searchParamsForLog.get("type") || "ranking"}`);
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "ranking";
    const industryId = searchParams.get("industry_id");
    const platform = searchParams.get("platform") || "tiktok";
    const industryName = searchParams.get("industry_name") || "全業種";

    if (type === "ranking") {
      return await exportRankingPDF(industryId, platform, industryName);
    } else {
      return await exportDashboardPDF(industryId, platform, industryName);
    }
  } catch (error) {
    console.error("Error exporting PDF:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export PDF" },
      { status: 500 }
    );
  }
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

// ===== Shared Drawing Helpers =====

/** Draw the branded header bar at the top of a page */
function drawHeader(doc: jsPDF, isLandscape: boolean = false) {
  const w = isLandscape ? PAGE.lw : PAGE.a4w;
  const ml = isLandscape ? PAGE.lMarginLeft : PAGE.marginLeft;

  // Top accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, 3, "F");

  // Brand name
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text(BRAND_NAME, ml, 10);

  // Subtitle
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textLight);
  doc.text(BRAND_SUBTITLE, ml + doc.getTextWidth(BRAND_NAME) + 3, 10);
}

/** Draw a cover/title page */
function drawCoverPage(
  doc: jsPDF,
  title: string,
  subtitle: string,
  dateStr: string,
  isLandscape: boolean = false
) {
  const w = isLandscape ? PAGE.lw : PAGE.a4w;
  const h = isLandscape ? PAGE.lh : PAGE.a4h;
  const cx = w / 2;

  // Full green gradient background (top half)
  doc.setFillColor(...COLORS.primaryDeep);
  doc.rect(0, 0, w, h * 0.55, "F");

  // Lighter overlay strip
  doc.setFillColor(...COLORS.primaryDark);
  doc.rect(0, h * 0.38, w, h * 0.17, "F");

  // Brand name - large white
  doc.setFontSize(32);
  doc.setTextColor(...COLORS.white);
  doc.text(BRAND_NAME, cx, h * 0.22, { align: "center" });

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(167, 243, 208); // Emerald 200
  doc.text(BRAND_SUBTITLE, cx, h * 0.28, { align: "center" });

  // Decorative line
  doc.setDrawColor(...COLORS.white);
  doc.setLineWidth(0.3);
  doc.line(cx - 40, h * 0.32, cx + 40, h * 0.32);

  // Report title
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.white);
  doc.text(title, cx, h * 0.42, { align: "center" });

  // Subtitle info
  doc.setFontSize(13);
  doc.setTextColor(167, 243, 208);
  doc.text(subtitle, cx, h * 0.48, { align: "center" });

  // Bottom section - white
  // Date
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textLight);
  doc.text(`作成日: ${dateStr}`, cx, h * 0.65, { align: "center" });

  // Footer brand
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`${BRAND_NAME} ${BRAND_SUBTITLE}`, cx, h * 0.92, { align: "center" });
}

/** Draw section title with green accent */
function drawSectionTitle(doc: jsPDF, title: string, y: number, ml: number = PAGE.marginLeft): number {
  // Green accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(ml, y - 4, 3, 6, "F");

  doc.setFontSize(13);
  doc.setTextColor(...COLORS.textDark);
  doc.text(title, ml + 6, y);

  // Subtle line under title
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(ml, y + 3, ml + (doc.internal.pageSize.width === PAGE.lw ? PAGE.lContentWidth : PAGE.contentWidth), y + 3);

  return y + 10;
}

/** Draw page footer */
function drawFooter(doc: jsPDF, pageNum: number, totalPages: number, isLandscape: boolean = false) {
  const w = isLandscape ? PAGE.lw : PAGE.a4w;
  const h = isLandscape ? PAGE.lh : PAGE.a4h;

  // Bottom line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(PAGE.marginLeft, h - 10, w - PAGE.marginRight, h - 10);

  // Brand on left
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.textMuted);
  const ml = isLandscape ? PAGE.lMarginLeft : PAGE.marginLeft;
  doc.text(`${BRAND_NAME} ${BRAND_SUBTITLE}`, ml, h - 6);

  // Page number on right
  doc.text(`${pageNum} / ${totalPages}`, w - (isLandscape ? PAGE.lMarginRight : PAGE.marginRight), h - 6, { align: "right" });
}

/** Draw a KPI card */
function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accentColor: [number, number, number] = COLORS.primary
) {
  // Card background
  doc.setFillColor(...COLORS.bgWhite);
  doc.roundedRect(x, y, w, h, 2, 2, "F");

  // Card border
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "S");

  // Top accent line
  doc.setFillColor(...accentColor);
  doc.rect(x, y, w, 1.5, "F");

  // Label
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textLight);
  doc.text(label, x + w / 2, y + 8, { align: "center" });

  // Value
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.textDark);
  doc.text(value, x + w / 2, y + 17, { align: "center" });
}

// ===== AI Analysis Pages =====

function addAiAnalysisPages(doc: jsPDF, analysisText: string) {
  doc.addPage();
  const ml = PAGE.marginLeft;
  const mr = PAGE.marginRight;
  const contentW = PAGE.contentWidth;

  drawHeader(doc);
  let currentY = 20;

  // Section title
  currentY = drawSectionTitle(doc, "AI分析レポート", currentY, ml);
  currentY += 2;

  const sections = extractMarkdownSections(analysisText);
  const tables = extractMarkdownTables(analysisText);
  let tableIdx = 0;

  for (const section of sections) {
    if (currentY > 260) {
      doc.addPage();
      drawHeader(doc);
      currentY = 20;
    }

    // Section title with level-based styling
    const fontSize = section.level <= 2 ? 11 : 9;
    doc.setFontSize(fontSize);
    doc.setTextColor(...COLORS.primaryDark);
    doc.text(section.title, ml, currentY);
    currentY += fontSize <= 9 ? 5 : 7;

    // Table rendering
    const sectionHasTable = section.content.includes("|") && section.content.includes("---");
    if (sectionHasTable && tableIdx < tables.length) {
      const table = tables[tableIdx];
      tableIdx++;

      if (currentY > 230) {
        doc.addPage();
        drawHeader(doc);
        currentY = 20;
      }

      autoTable(doc, {
        startY: currentY,
        head: [table.headers],
        body: table.rows,
        styles: {
          font: "NotoSansJP",
          fontSize: 7,
          cellPadding: 2.5,
          lineColor: COLORS.border,
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: COLORS.primaryDark,
          textColor: COLORS.white,
          fontSize: 7.5,
          fontStyle: "normal",
          font: "NotoSansJP",
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 7,
          textColor: COLORS.textMedium,
          font: "NotoSansJP",
        },
        alternateRowStyles: {
          fillColor: COLORS.primaryPale,
        },
        margin: { left: ml, right: mr },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // Text content
    const contentWithoutTables = section.content
      .replace(/\|[^\n]+\|/g, "")
      .replace(/\n{3,}/g, "\n\n");
    const plainText = markdownToPlainText(contentWithoutTables).trim();

    if (plainText) {
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textMedium);

      const maxWidth = contentW;
      const textLines = doc.splitTextToSize(plainText, maxWidth);

      for (const textLine of textLines) {
        if (currentY > 275) {
          doc.addPage();
          drawHeader(doc);
          currentY = 20;
        }
        doc.text(textLine, ml, currentY);
        currentY += 4.2;
      }
      currentY += 4;
    }
  }

  // Fallback: no sections extracted
  if (sections.length === 0 && analysisText) {
    const plainText = markdownToPlainText(analysisText);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMedium);
    const maxWidth = contentW;
    const textLines = doc.splitTextToSize(plainText, maxWidth);

    for (const textLine of textLines) {
      if (currentY > 275) {
        doc.addPage();
        drawHeader(doc);
        currentY = 20;
      }
      doc.text(textLine, ml, currentY);
      currentY += 4.2;
    }
  }
}

// ===== Ranking PDF =====

async function exportRankingPDF(
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
    take: 50,
    include: {
      videoTags: { include: { industry: true } },
    },
  });

  // Fetch thumbnails in parallel
  const thumbnailMap: Record<number, string> = {};
  const thumbnailPromises = videos.map(async (v, idx) => {
    if (v.thumbnailUrl) {
      const data = await fetchThumbnailBase64(v.thumbnailUrl);
      if (data) thumbnailMap[idx] = data;
    }
  });
  await Promise.all(thumbnailPromises);

  // Fetch AI analysis
  const aiAnalysis = await getLatestAiAnalysis("ranking", platform, industryId);

  const platformLabel = platform === "tiktok" ? "TikTok" : platform === "youtube" ? "YouTube" : "Instagram";
  const dateStr = new Date().toLocaleDateString("ja-JP");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  setupJapaneseFont(doc);

  // ===== Cover Page =====
  drawCoverPage(
    doc,
    "ランキングレポート",
    `${platformLabel} / ${industryName}`,
    dateStr,
    true
  );

  // ===== Data Table Page =====
  doc.addPage();
  drawHeader(doc, true);

  let currentY = 16;
  currentY = drawSectionTitle(doc, `${platformLabel} ランキング TOP${videos.length}`, currentY, PAGE.lMarginLeft);

  const tableData = videos.map((v, idx) => {
    const duration = v.videoDurationSeconds
      ? `${Math.floor(v.videoDurationSeconds / 60)}:${(v.videoDurationSeconds % 60).toString().padStart(2, "0")}`
      : "-";
    const tag = v.videoTags?.[0];
    return [
      idx + 1,
      "",
      `@${v.authorUsername}`.substring(0, 18),
      (v.description || "").substring(0, 45),
      formatNum(v.viewCount),
      formatNum(v.likeCount),
      `${(v.engagementRate * 100).toFixed(1)}%`,
      duration,
      tag?.contentType || "-",
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["#", "サムネイル", "投稿者", "説明", "再生数", "いいね", "ER", "尺", "類型"]],
    body: tableData,
    styles: {
      font: "NotoSansJP",
      fontSize: 7,
      minCellHeight: 14,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      lineColor: COLORS.border,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: COLORS.primaryDark,
      textColor: COLORS.white,
      fontSize: 8,
      fontStyle: "normal",
      font: "NotoSansJP",
      minCellHeight: 10,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 7,
      textColor: COLORS.textMedium,
      font: "NotoSansJP",
    },
    alternateRowStyles: {
      fillColor: COLORS.primaryPale,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center", valign: "middle", fontStyle: "bold" },
      1: { cellWidth: 20, halign: "center", valign: "middle" },
      2: { cellWidth: 28 },
      3: { cellWidth: 65 },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 14, halign: "center" },
      8: { cellWidth: 25 },
    },
    margin: { left: PAGE.lMarginLeft, right: PAGE.lMarginRight },
    didDrawCell: (data: { section: string; column: { index: number }; row: { index: number }; cell: { x: number; y: number; width: number; height: number } }) => {
      if (data.section === "body" && data.column.index === 1) {
        const rowIdx = data.row.index;
        const thumbData = thumbnailMap[rowIdx];
        if (thumbData) {
          const cellX = data.cell.x;
          const cellY = data.cell.y;
          const cellH = data.cell.height;
          const imgH = cellH - 2;
          const imgW = imgH * (9 / 16);
          const imgX = cellX + (data.cell.width - imgW) / 2;
          const imgY = cellY + 1;
          try {
            doc.addImage(thumbData, "JPEG", imgX, imgY, imgW, imgH);
          } catch {
            // Skip if image fails
          }
        }
      }
    },
    didDrawPage: () => {
      drawHeader(doc, true);
    },
  });

  // Add AI Analysis pages if available
  if (aiAnalysis) {
    addAiAnalysisPages(doc, aiAnalysis);
  }

  // Update footer page numbers (skip cover page = page 1)
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i === 1) continue; // Skip cover page footer
    drawFooter(doc, i - 1, pageCount - 1, i <= (doc.getNumberOfPages() - (aiAnalysis ? 1 : 0)) ? true : false);
  }

  const pdfOutput = doc.output("arraybuffer");

  return new NextResponse(new Uint8Array(pdfOutput), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ranking_${platform}_${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}

// ===== Dashboard PDF =====

async function exportDashboardPDF(
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
  const totalShares = videos.reduce((s, v) => s + v.shareCount, 0);
  const avgER = totalVideos > 0
    ? videos.reduce((s, v) => s + v.engagementRate, 0) / totalVideos
    : 0;

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

  // Fetch thumbnails for top 10 videos
  const top10 = videos.slice(0, 10);
  const thumbnailMap: Record<number, string> = {};
  const thumbnailPromises = top10.map(async (v, idx) => {
    if (v.thumbnailUrl) {
      const data = await fetchThumbnailBase64(v.thumbnailUrl);
      if (data) thumbnailMap[idx] = data;
    }
  });
  await Promise.all(thumbnailPromises);

  // Fetch AI analysis
  const aiAnalysis = await getLatestAiAnalysis("dashboard", platform, industryId);

  const platformLabel = platform === "tiktok" ? "TikTok" : platform === "youtube" ? "YouTube" : "Instagram";
  const dateStr = new Date().toLocaleDateString("ja-JP");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  setupJapaneseFont(doc);

  // ===== Cover Page =====
  drawCoverPage(
    doc,
    "ダッシュボードレポート",
    `${platformLabel} / ${industryName}`,
    dateStr,
    false
  );

  // ===== KPI Summary Page =====
  doc.addPage();
  drawHeader(doc);
  let currentY = 20;

  currentY = drawSectionTitle(doc, "KPIサマリー", currentY);

  const kpiItems = [
    { label: "総動画数", value: totalVideos.toLocaleString(), color: COLORS.primary },
    { label: "総再生数", value: formatNum(totalViews), color: COLORS.accentBlue },
    { label: "総いいね数", value: formatNum(totalLikes), color: [236, 72, 153] as [number, number, number] },
    { label: "総コメント数", value: formatNum(totalComments), color: COLORS.accentAmber },
    { label: "総シェア数", value: formatNum(totalShares), color: [139, 92, 246] as [number, number, number] },
    { label: "平均ER", value: `${(avgER * 100).toFixed(2)}%`, color: COLORS.primaryDark },
  ];

  const kpiCardW = 52;
  const kpiCardH = 24;
  const kpiGap = 6;

  kpiItems.forEach((kpi, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = PAGE.marginLeft + col * (kpiCardW + kpiGap);
    const y = currentY + row * (kpiCardH + kpiGap);

    drawKpiCard(doc, x, y, kpiCardW, kpiCardH, kpi.label, kpi.value, kpi.color as [number, number, number]);
  });

  currentY += 2 * (kpiCardH + kpiGap) + 6;

  // ===== Stats Tables =====
  const drawStatsTable = (title: string, stats: Record<string, { count: number; totalViews: number; totalER: number }>) => {
    if (currentY > 235) {
      doc.addPage();
      drawHeader(doc);
      currentY = 20;
    }

    currentY = drawSectionTitle(doc, title, currentY);

    const rows = Object.entries(stats)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, s]) => [
        type,
        s.count.toString(),
        formatNum(s.totalViews),
        `${((s.totalER / s.count) * 100).toFixed(2)}%`,
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [["タイプ", "件数", "総再生数", "平均ER"]],
      body: rows,
      styles: {
        font: "NotoSansJP",
        fontSize: 8,
        cellPadding: 3,
        lineColor: COLORS.border,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: COLORS.primaryDark,
        textColor: COLORS.white,
        fontSize: 8.5,
        fontStyle: "normal",
        font: "NotoSansJP",
        cellPadding: 3.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: COLORS.textMedium,
        font: "NotoSansJP",
      },
      alternateRowStyles: {
        fillColor: COLORS.primaryPale,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: "right" },
        2: { cellWidth: 45, halign: "right" },
        3: { cellWidth: 35, halign: "right" },
      },
      margin: { left: PAGE.marginLeft, right: PAGE.marginRight },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 12;
  };

  drawStatsTable("コンテンツ類型別分析", contentTypeStats);
  drawStatsTable("フックタイプ別分析", hookTypeStats);
  drawStatsTable("動画尺別分析", durationStats);

  // ===== Top 10 Videos with Thumbnails =====
  if (top10.length > 0) {
    doc.addPage();
    drawHeader(doc);
    currentY = 20;
    currentY = drawSectionTitle(doc, "トップ10動画", currentY);

    for (let i = 0; i < top10.length; i++) {
      if (currentY > 258) {
        doc.addPage();
        drawHeader(doc);
        currentY = 20;
        currentY = drawSectionTitle(doc, "トップ10動画（続き）", currentY);
      }

      const v = top10[i];
      const tag = v.videoTags?.[0];
      const cardH = 24;
      const cardW = PAGE.contentWidth;

      // Card background with subtle border
      doc.setFillColor(...(i % 2 === 0 ? COLORS.bgWhite : COLORS.primaryPale));
      doc.roundedRect(PAGE.marginLeft, currentY, cardW, cardH, 2, 2, "F");
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(PAGE.marginLeft, currentY, cardW, cardH, 2, 2, "S");

      // Rank badge
      const badgeX = PAGE.marginLeft + 2;
      const badgeY = currentY + 2;
      const badgeColor = i < 3 ? COLORS.primary : COLORS.textLight;
      doc.setFillColor(...badgeColor);
      doc.roundedRect(badgeX, badgeY, 10, 10, 1.5, 1.5, "F");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.white);
      doc.text(`${i + 1}`, badgeX + 5, badgeY + 7, { align: "center" });

      // Thumbnail
      const thumbX = PAGE.marginLeft + 15;
      const thumbData = thumbnailMap[i];
      if (thumbData) {
        try {
          doc.addImage(thumbData, "JPEG", thumbX, currentY + 1.5, 11.8, 21);
        } catch {
          doc.setFillColor(...COLORS.bgCard);
          doc.rect(thumbX, currentY + 1.5, 11.8, 21, "F");
        }
      } else {
        doc.setFillColor(...COLORS.bgCard);
        doc.rect(thumbX, currentY + 1.5, 11.8, 21, "F");
        doc.setFontSize(5);
        doc.setTextColor(...COLORS.textMuted);
        doc.text("No Image", thumbX + 2, currentY + 12);
      }

      // Content area
      const contentX = thumbX + 15;

      // Author
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textDark);
      doc.text(`@${v.authorUsername || "unknown"}`, contentX, currentY + 7);

      // Description
      doc.setFontSize(6.5);
      doc.setTextColor(...COLORS.textLight);
      doc.text((v.description || "").substring(0, 75), contentX, currentY + 12);

      // Stats row
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.textMedium);
      const statsY = currentY + 18;
      doc.text(`再生: ${formatNum(v.viewCount)}`, contentX, statsY);
      doc.text(`いいね: ${formatNum(v.likeCount)}`, contentX + 30, statsY);
      doc.text(`ER: ${(v.engagementRate * 100).toFixed(1)}%`, contentX + 58, statsY);

      if (tag?.contentType) {
        // Content type badge
        const typeText = tag.contentType;
        doc.setFillColor(...COLORS.primaryLight);
        const typeW = doc.getTextWidth(typeText) + 4;
        doc.roundedRect(contentX + 82, statsY - 3, typeW, 5, 1, 1, "F");
        doc.setFontSize(6);
        doc.setTextColor(...COLORS.primaryDark);
        doc.text(typeText, contentX + 84, statsY);
      }

      if (v.videoDurationSeconds) {
        const dur = `${Math.floor(v.videoDurationSeconds / 60)}:${(v.videoDurationSeconds % 60).toString().padStart(2, "0")}`;
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.textLight);
        doc.text(`尺: ${dur}`, contentX + 110, statsY);
      }

      // ER indicator on the right
      const erX = PAGE.marginLeft + cardW - 18;
      const erY = currentY + 5;
      const erColor = v.engagementRate * 100 >= 10
        ? COLORS.primary
        : v.engagementRate * 100 >= 5
          ? COLORS.accentBlue
          : COLORS.textLight;
      doc.setFillColor(...erColor);
      doc.roundedRect(erX, erY, 14, 14, 2, 2, "F");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.white);
      doc.text(`${(v.engagementRate * 100).toFixed(1)}%`, erX + 7, erY + 6, { align: "center" });
      doc.setFontSize(5.5);
      doc.text("ER", erX + 7, erY + 10.5, { align: "center" });

      currentY += cardH + 3;
    }
  }

  // Add AI Analysis pages if available
  if (aiAnalysis) {
    addAiAnalysisPages(doc, aiAnalysis);
  }

  // Footer on all pages except cover
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, i - 1, pageCount - 1, false);
  }

  const pdfOutput = doc.output("arraybuffer");

  return new NextResponse(new Uint8Array(pdfOutput), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dashboard_${platform}_${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}
