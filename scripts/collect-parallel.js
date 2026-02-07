// 全業種のデータ収集を並列で実行するスクリプト
const BASE_URL = "https://tategatashort-analytics.com";

// 収集が必要な業種・プラットフォームのリスト
const COLLECTIONS = [
  // TikTok - データ不足分
  { industryId: 19, platform: "tiktok", name: "旅行" },
  { industryId: 20, platform: "tiktok", name: "医療" },
  { industryId: 21, platform: "tiktok", name: "ペット" },
  // Instagram - データ不足分
  { industryId: 11, platform: "instagram", name: "フィットネス" },
  { industryId: 12, platform: "instagram", name: "エンタメ" },
  { industryId: 13, platform: "instagram", name: "ファッション" },
  { industryId: 14, platform: "instagram", name: "不動産" },
  { industryId: 15, platform: "instagram", name: "教育" },
  { industryId: 16, platform: "instagram", name: "EC・D2C" },
  { industryId: 17, platform: "instagram", name: "飲食・グルメ" },
  { industryId: 18, platform: "instagram", name: "美容・コスメ" },
  { industryId: 19, platform: "instagram", name: "旅行" },
  { industryId: 20, platform: "instagram", name: "医療" },
  { industryId: 21, platform: "instagram", name: "ペット" },
  // YouTube - データ不足分
  { industryId: 12, platform: "youtube", name: "エンタメ" },
  { industryId: 13, platform: "youtube", name: "ファッション" },
  { industryId: 14, platform: "youtube", name: "不動産" },
  { industryId: 15, platform: "youtube", name: "教育" },
  { industryId: 16, platform: "youtube", name: "EC・D2C" },
  { industryId: 17, platform: "youtube", name: "飲食・グルメ" },
  { industryId: 18, platform: "youtube", name: "美容・コスメ" },
  { industryId: 19, platform: "youtube", name: "旅行" },
  { industryId: 20, platform: "youtube", name: "医療" },
  { industryId: 21, platform: "youtube", name: "ペット" },
];

async function startCollection(item) {
  const endpoint = item.platform === "instagram"
    ? "/api/collect-instagram"
    : item.platform === "youtube"
    ? "/api/collect-youtube"
    : "/api/collect";

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industryId: item.industryId }),
    });
    const data = await res.json();
    if (!data.success) {
      console.log(`❌ [${item.name}/${item.platform}] 開始エラー: ${data.error}`);
      return null;
    }
    console.log(`✅ [${item.name}/${item.platform}] ジョブ開始: runId=${data.data.runId}`);
    return { ...item, runId: data.data.runId, collectionLogId: data.data.collectionLogId };
  } catch (e) {
    console.log(`❌ [${item.name}/${item.platform}] 通信エラー: ${e.message}`);
    return null;
  }
}

async function waitAndComplete(job) {
  const maxWait = 10 * 60 * 1000;
  const interval = 10000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, interval));
    try {
      const res = await fetch(`${BASE_URL}/api/collect/status?runId=${job.runId}`);
      const data = await res.json();
      if (data.success && data.data.isFinished) {
        if (!data.data.isSuccess) {
          console.log(`❌ [${job.name}/${job.platform}] Apifyジョブ失敗`);
          return null;
        }
        // データ保存
        const completeRes = await fetch(`${BASE_URL}/api/collect/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: job.runId,
            collectionLogId: job.collectionLogId,
            platform: job.platform,
          }),
        });
        const completeData = await completeRes.json();
        if (completeData.success) {
          console.log(`✅ [${job.name}/${job.platform}] 完了: ${completeData.data.videosCollected}件 (新規${completeData.data.videosNew}, 更新${completeData.data.videosUpdated})`);
          return completeData.data;
        } else {
          console.log(`❌ [${job.name}/${job.platform}] 保存エラー: ${completeData.error}`);
          return null;
        }
      }
    } catch (e) {
      // ネットワークエラーは無視して再試行
    }
  }
  console.log(`⏰ [${job.name}/${job.platform}] タイムアウト`);
  return null;
}

async function processBatch(batch, batchName) {
  console.log(`\n=== ${batchName} (${batch.length}件) ===\n`);
  
  // 全ジョブを開始
  const jobs = [];
  for (const item of batch) {
    const job = await startCollection(item);
    if (job) jobs.push(job);
    // Apify APIレート制限回避のため少し待つ
    await new Promise(r => setTimeout(r, 2000));
  }

  if (jobs.length === 0) {
    console.log("開始できたジョブがありません");
    return;
  }

  // 全ジョブの完了を並列で待機
  console.log(`\n${jobs.length}件のジョブを並列で待機中...\n`);
  const results = await Promise.all(jobs.map(job => waitAndComplete(job)));
  
  const success = results.filter(r => r !== null).length;
  console.log(`\n${batchName}: ${success}/${jobs.length}件 成功`);
}

async function main() {
  const startTime = Date.now();

  // TikTokバッチ
  const tiktokBatch = COLLECTIONS.filter(c => c.platform === "tiktok");
  await processBatch(tiktokBatch, "TikTok収集");

  // Instagramバッチ
  const instagramBatch = COLLECTIONS.filter(c => c.platform === "instagram");
  await processBatch(instagramBatch, "Instagram収集");

  // YouTubeバッチ
  const youtubeBatch = COLLECTIONS.filter(c => c.platform === "youtube");
  await processBatch(youtubeBatch, "YouTube収集");

  // タギング実行
  console.log("\n=== タギング実行 ===\n");
  try {
    const tagRes = await fetch(`${BASE_URL}/api/videos/auto-tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const tagData = await tagRes.json();
    if (tagData.success) {
      console.log(`✅ タギング完了: ${tagData.data.tagged}件タグ付与`);
    } else {
      console.log(`❌ タギングエラー: ${tagData.error}`);
    }
  } catch (e) {
    console.log(`❌ タギング通信エラー: ${e.message}`);
  }

  // ベンチマーク再計算
  console.log("\n=== ベンチマーク再計算 ===\n");
  try {
    const bmRes = await fetch(`${BASE_URL}/api/benchmarks/recalculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const bmData = await bmRes.json();
    if (bmData.success) {
      console.log(`✅ ベンチマーク再計算完了: ${bmData.data.recalculated}業種`);
    } else {
      console.log(`❌ ベンチマークエラー: ${bmData.error}`);
    }
  } catch (e) {
    console.log(`❌ ベンチマーク通信エラー: ${e.message}`);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== 全処理完了 (${elapsed}秒) ===`);
}

main().catch(console.error);
