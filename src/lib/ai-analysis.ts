import prisma from "@/lib/prisma";

/**
 * 最新のAI分析結果をDBから取得する
 */
export async function getLatestAiAnalysis(
  type: string,
  platform: string,
  industryId: string | null
): Promise<string | null> {
  try {
    const where: Record<string, unknown> = { type, platform };
    if (industryId && industryId !== "all") {
      where.industryId = parseInt(industryId);
    } else {
      where.industryId = null;
    }

    const analysis = await prisma.aiAnalysis.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });

    return analysis?.analysis || null;
  } catch (error) {
    console.error("Failed to fetch AI analysis:", error);
    return null;
  }
}
