import { NextResponse } from "next/server";

// リトライ設定
const MAX_COLLECTION_RETRIES = 3;
const RETRY_DELAY_MS = 10000; // 10秒

// 遅延関数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Vercel Cron Jobsから呼び出される毎日の自動更新API
// 毎日朝9時（日本時間）に実行
export async function GET(request: Request) {
  try {
    // Cron Jobからの呼び出しを検証
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";

    const results = {
      collections: [] as { industryId: number; industryName: string; status: string; videos?: number; retries?: number }[],
      tagging: { processed: 0, tagged: 0 },
      thumbnails: { updated: 0 },
    };

    // 1. 全業種の動画を収集
    console.log("Starting daily data collection...");
    
    // 業種一覧を取得
    const industriesRes = await fetch(`${baseUrl}/api/industries`);
    const industriesData = await industriesRes.json();
    const industries = industriesData.data || [];

    // 各業種の動画を収集（リトライ付き）
    for (const industry of industries) {
      let success = false;
      let lastError = null;
      let retryCount = 0;
      
      for (let attempt = 1; attempt <= MAX_COLLECTION_RETRIES && !success; attempt++) {
        try {
          console.log(`Collecting videos for ${industry.name} (attempt ${attempt}/${MAX_COLLECTION_RETRIES})...`);
          const collectRes = await fetch(`${baseUrl}/api/collect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ industryId: industry.id }),
          });
          const collectData = await collectRes.json();
          
          if (collectData.success) {
            results.collections.push({
              industryId: industry.id,
              industryName: industry.name,
              status: "success",
              videos: collectData.data?.videosNew || 0,
              retries: attempt - 1,
            });
            success = true;
          } else {
            throw new Error(collectData.error || "Collection failed");
          }
        } catch (error) {
          lastError = error;
          retryCount = attempt;
          console.error(`Error collecting for ${industry.name} (attempt ${attempt}):`, error);
          
          if (attempt < MAX_COLLECTION_RETRIES) {
            console.log(`Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
            await delay(RETRY_DELAY_MS);
          }
        }
      }
      
      if (!success) {
        results.collections.push({
          industryId: industry.id,
          industryName: industry.name,
          status: "failed",
          retries: retryCount,
        });
        console.error(`Failed to collect for ${industry.name} after ${MAX_COLLECTION_RETRIES} attempts`);
      }
      
      // API制限を避けるため少し待機
      await delay(2000);
    }

    // 2. 全動画のタグ付けを実行
    console.log("Starting auto-tagging...");
    try {
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
      console.error("Error during tagging:", error);
    }

    // 3. サムネイルを更新
    console.log("Updating thumbnails...");
    let totalUpdated = 0;
    for (let i = 0; i < 40; i++) {
      try {
        const thumbRes = await fetch(`${baseUrl}/api/videos/update-thumbnails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const thumbData = await thumbRes.json();
        if (thumbData.updated === 0) break;
        totalUpdated += thumbData.updated;
        await delay(500);
      } catch (error) {
        console.error("Error updating thumbnails:", error);
        break;
      }
    }
    results.thumbnails.updated = totalUpdated;

    // 4. ベンチマークを再計算
    console.log("Recalculating benchmarks...");
    try {
      await fetch(`${baseUrl}/api/benchmarks/recalculate`, { method: "POST" });
    } catch (error) {
      console.error("Error recalculating benchmarks:", error);
    }

    // 5. 失敗した収集があれば再度リトライ
    const failedCollections = results.collections.filter(c => c.status === "failed");
    if (failedCollections.length > 0) {
      console.log(`Retrying ${failedCollections.length} failed collections...`);
      await delay(30000); // 30秒待機
      
      for (const failed of failedCollections) {
        try {
          console.log(`Final retry for ${failed.industryName}...`);
          const collectRes = await fetch(`${baseUrl}/api/collect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ industryId: failed.industryId }),
          });
          const collectData = await collectRes.json();
          
          if (collectData.success) {
            // 成功した場合、結果を更新
            const index = results.collections.findIndex(c => c.industryId === failed.industryId);
            if (index !== -1) {
              results.collections[index] = {
                ...results.collections[index],
                status: "success_on_final_retry",
                videos: collectData.data?.videosNew || 0,
              };
            }
          }
        } catch (error) {
          console.error(`Final retry failed for ${failed.industryName}:`, error);
        }
        await delay(5000);
      }
    }

    console.log("Daily update completed:", results);

    return NextResponse.json({
      success: true,
      message: "Daily update completed",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in daily update:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run daily update" },
      { status: 500 }
    );
  }
}

// Vercel Cron Jobsの設定
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5分のタイムアウト
