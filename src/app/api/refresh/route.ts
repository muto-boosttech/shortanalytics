import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { checkRefreshUsage, logUsage, PlanType } from "@/lib/plan-limits";

// 遅延関数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// POST /api/refresh - 手動データ更新API
// ダッシュボード・ランキング・データ収集画面から呼び出される
export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
    }

    // ユーザーのプランを取得
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { plan: true, role: true },
    });
    const plan = (user?.plan || "free") as PlanType;

    const body = await request.json();
    const { type, platform, industryId } = body;
    // type: "full" | "collect" | "tag" | "thumbnail" | "benchmark"
    // platform: "tiktok" | "youtube" | "instagram" (optional)
    // industryId: number (optional, for targeted collection)

    // マスター管理者は制限なし
    if (user?.role !== "master_admin") {
      // データ更新のプラン制限チェック（collect/fullの場合）
      if (type === "full" || type === "collect") {
        if (platform && industryId) {
          const usageCheck = await checkRefreshUsage(session.userId, plan, platform, parseInt(industryId));
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
      }
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || "http://localhost:3000";

    const results: {
      collections: Array<{ industryId: number; industryName: string; platform: string; status: string; videos?: number }>;
      tagging: { processed: number; tagged: number };
      thumbnails: { updated: number };
      benchmarks: boolean;
    } = {
      collections: [],
      tagging: { processed: 0, tagged: 0 },
      thumbnails: { updated: 0 },
      benchmarks: false,
    };

    // ===== データ収集 =====
    if (type === "full" || type === "collect") {
      // 業種一覧を取得
      const industriesRes = await fetch(`${baseUrl}/api/industries`);
      const industriesData = await industriesRes.json();
      let industries = industriesData.data || [];

      // 特定業種のみ指定された場合
      if (industryId) {
        industries = industries.filter((i: { id: number }) => i.id === parseInt(industryId));
      }

      // プラットフォーム指定（指定なしの場合は全プラットフォーム）
      const platforms = platform ? [platform] : ["tiktok", "youtube", "instagram"];

      for (const ind of industries) {
        for (const plat of platforms) {
          // 各媒体×カテゴリごとにプラン制限チェック（マスター管理者以外）
          if (user?.role !== "master_admin") {
            const usageCheck = await checkRefreshUsage(session.userId, plan, plat, ind.id);
            if (!usageCheck.allowed) {
              results.collections.push({
                industryId: ind.id,
                industryName: ind.name,
                platform: plat,
                status: "limit_reached",
              });
              continue;
            }
          }

          try {
            const endpoint =
              plat === "instagram"
                ? "/api/collect-instagram"
                : plat === "youtube"
                ? "/api/collect-youtube"
                : "/api/collect";

            console.log(`[Manual Refresh] Collecting ${plat} for ${ind.name}...`);
            const collectRes = await fetch(`${baseUrl}${endpoint}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ industryId: ind.id }),
            });
            const collectData = await collectRes.json();

            results.collections.push({
              industryId: ind.id,
              industryName: ind.name,
              platform: plat,
              status: collectData.success ? "success" : "failed",
              videos: collectData.data?.videosNew || 0,
            });

            // 成功した場合、使用量ログを記録
            if (collectData.success) {
              await logUsage(session.userId, "refresh", plat, ind.id, `videos: ${collectData.data?.videosNew || 0}`);
            }
          } catch (error) {
            console.error(`[Manual Refresh] Error collecting ${plat} for ${ind.name}:`, error);
            results.collections.push({
              industryId: ind.id,
              industryName: ind.name,
              platform: plat,
              status: "failed",
            });
          }
          await delay(1000);
        }
      }
    }

    // ===== タグ付け =====
    if (type === "full" || type === "tag") {
      try {
        console.log("[Manual Refresh] Starting auto-tagging...");
        // 既存タグを削除
        await fetch(`${baseUrl}/api/videos/auto-tag`, { method: "DELETE" });
        // 新しいタグを付与
        const tagRes = await fetch(`${baseUrl}/api/videos/auto-tag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const tagData = await tagRes.json();
        results.tagging = tagData.data || { processed: 0, tagged: 0 };
      } catch (error) {
        console.error("[Manual Refresh] Error during tagging:", error);
      }
    }

    // ===== サムネイル更新 =====
    if (type === "full" || type === "thumbnail") {
      try {
        console.log("[Manual Refresh] Updating thumbnails...");
        let totalUpdated = 0;
        for (let i = 0; i < 20; i++) {
          const thumbRes = await fetch(`${baseUrl}/api/videos/update-thumbnails`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const thumbData = await thumbRes.json();
          if (thumbData.updated === 0) break;
          totalUpdated += thumbData.updated;
          await delay(300);
        }
        results.thumbnails.updated = totalUpdated;
      } catch (error) {
        console.error("[Manual Refresh] Error updating thumbnails:", error);
      }
    }

    // ===== ベンチマーク再計算 =====
    if (type === "full" || type === "benchmark") {
      try {
        console.log("[Manual Refresh] Recalculating benchmarks...");
        await fetch(`${baseUrl}/api/benchmarks/recalculate`, { method: "POST" });
        results.benchmarks = true;
      } catch (error) {
        console.error("[Manual Refresh] Error recalculating benchmarks:", error);
      }
    }

    console.log("[Manual Refresh] Completed:", results);

    return NextResponse.json({
      success: true,
      message: "データ更新が完了しました",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manual Refresh] Error:", error);
    return NextResponse.json(
      { success: false, error: "データ更新に失敗しました" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
