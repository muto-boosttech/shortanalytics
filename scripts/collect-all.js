// 全業種のデータ収集状況を確認し、不足分を収集するスクリプト
const BASE_URL = "https://tategatashort-analytics.com";

async function checkAndCollect() {
  // 1. 全業種の情報を取得
  console.log("=== 全業種のデータ状況を確認 ===\n");
  const industriesRes = await fetch(`${BASE_URL}/api/industries`);
  const industriesData = await industriesRes.json();
  const industries = industriesData.data;

  // 2. 各業種・各プラットフォームの動画数を確認
  const platforms = ["tiktok", "youtube", "instagram"];
  const needsCollection = [];

  for (const industry of industries) {
    for (const platform of platforms) {
      const videosRes = await fetch(
        `${BASE_URL}/api/videos?industry_id=${industry.id}&platform=${platform}&limit=1`
      );
      const videosData = await videosRes.json();
      const count = videosData.pagination?.total || 0;
      const status = count > 10 ? "✅" : count > 0 ? "⚠️" : "❌";
      console.log(`${status} ${industry.name} (${platform}): ${count}件`);
      
      if (count < 10) {
        needsCollection.push({ industry, platform, currentCount: count });
      }
    }
  }

  console.log(`\n=== データ収集が必要な業種/プラットフォーム: ${needsCollection.length}件 ===\n`);
  for (const item of needsCollection) {
    console.log(`- ${item.industry.name} (${item.platform}): 現在${item.currentCount}件`);
  }

  // 3. 各業種のハッシュタグを確認
  console.log("\n=== 各業種のハッシュタグ確認 ===\n");
  for (const item of needsCollection) {
    const hashtagsRes = await fetch(
      `${BASE_URL}/api/industries/${item.industry.id}/hashtags?platform=${item.platform}`
    );
    // ハッシュタグAPIがない場合はスキップ
    if (!hashtagsRes.ok) {
      console.log(`${item.industry.name} (${item.platform}): ハッシュタグAPI未対応`);
    }
  }

  return needsCollection;
}

async function startCollection(industryId, platform) {
  const endpoint = platform === "instagram" 
    ? "/api/collect-instagram" 
    : platform === "youtube" 
    ? "/api/collect-youtube" 
    : "/api/collect";

  console.log(`\n>>> ${platform} 収集開始 (industry_id=${industryId})`);
  
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ industryId }),
  });
  
  const data = await res.json();
  
  if (!data.success) {
    console.log(`  ❌ エラー: ${data.error}`);
    return null;
  }

  const { runId, collectionLogId } = data.data;
  console.log(`  ✅ ジョブ開始: runId=${runId}`);
  return { runId, collectionLogId, platform };
}

async function waitForCompletion(runId) {
  const maxWait = 10 * 60 * 1000; // 10分
  const interval = 10000; // 10秒
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, interval));
    
    const res = await fetch(`${BASE_URL}/api/collect/status?runId=${runId}`);
    const data = await res.json();
    
    if (data.success && data.data.isFinished) {
      return data.data;
    }
    
    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`  ⏳ ${elapsed}秒経過...\r`);
  }
  
  return { isFinished: false, isSuccess: false };
}

async function completeCollection(runId, collectionLogId, platform) {
  const res = await fetch(`${BASE_URL}/api/collect/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId, collectionLogId, platform }),
  });
  
  const data = await res.json();
  return data;
}

async function main() {
  const needsCollection = await checkAndCollect();
  
  if (needsCollection.length === 0) {
    console.log("\n全業種のデータが揃っています。");
    return;
  }

  console.log("\n=== データ収集を開始 ===\n");

  for (const item of needsCollection) {
    const job = await startCollection(item.industry.id, item.platform);
    if (!job) continue;

    console.log(`  ポーリング中...`);
    const status = await waitForCompletion(job.runId);
    
    if (!status.isFinished) {
      console.log(`  ⏰ タイムアウト: ${item.industry.name} (${item.platform})`);
      continue;
    }
    
    if (!status.isSuccess) {
      console.log(`  ❌ Apifyジョブ失敗: ${item.industry.name} (${item.platform})`);
      continue;
    }
    
    console.log(`  データ保存中...`);
    const result = await completeCollection(job.runId, job.collectionLogId, job.platform);
    
    if (result.success) {
      console.log(`  ✅ 完了: ${result.data.videosCollected}件 (新規${result.data.videosNew}, 更新${result.data.videosUpdated})`);
    } else {
      console.log(`  ❌ 保存エラー: ${result.error}`);
    }
  }

  // タギング実行
  console.log("\n=== タギング実行 ===\n");
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

  // ベンチマーク再計算
  console.log("\n=== ベンチマーク再計算 ===\n");
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

  console.log("\n=== 全処理完了 ===");
}

main().catch(console.error);
