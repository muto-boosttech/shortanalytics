const BASE_URL = 'https://tategatashort-analytics.com';

const YOUTUBE_INDUSTRIES = [
  { id: 11, name: 'フィットネス' },
  { id: 12, name: 'エンタメ' },
  { id: 13, name: 'ファッション' },
  { id: 14, name: '不動産' },
  { id: 15, name: '教育' },
  { id: 16, name: 'EC・D2C' },
  { id: 17, name: '飲食・グルメ' },
  { id: 18, name: '美容・コスメ' },
  { id: 19, name: '旅行' },
  { id: 20, name: '医療' },
  { id: 21, name: 'ペット' },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pollStatus(runId, maxWait = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(`${BASE_URL}/api/collect/status?runId=${runId}`);
    const data = await res.json();
    if (data.data?.isFinished) return data.data;
    await sleep(10000);
  }
  return { status: 'TIMEOUT', isSuccess: false };
}

async function collectYouTube(industry) {
  try {
    // ジョブ開始
    const startRes = await fetch(`${BASE_URL}/api/collect-youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industryId: industry.id, maxResults: 30 }),
    });
    const startData = await startRes.json();
    if (!startData.success) {
      console.log(`  ❌ [${industry.name}/youtube] 開始失敗: ${startData.error}`);
      return { success: false, name: industry.name };
    }
    const { runId, collectionLogId } = startData.data;
    console.log(`  ✅ [${industry.name}/youtube] ジョブ開始: runId=${runId}`);
    return { runId, collectionLogId, name: industry.name };
  } catch (e) {
    console.log(`  ❌ [${industry.name}/youtube] エラー: ${e.message}`);
    return { success: false, name: industry.name };
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log(`YouTube収集 (${YOUTUBE_INDUSTRIES.length}件)`);
  console.log('='.repeat(50));

  // 全業種のジョブを並列で開始
  const jobs = await Promise.all(YOUTUBE_INDUSTRIES.map(i => collectYouTube(i)));
  const validJobs = jobs.filter(j => j.runId);

  console.log(`  ${validJobs.length}件のジョブを並列で待機中...`);

  // 並列でポーリング
  const results = await Promise.all(validJobs.map(async (job) => {
    const status = await pollStatus(job.runId);
    if (status.isSuccess) {
      // データ保存
      try {
        const completeRes = await fetch(`${BASE_URL}/api/collect/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId: job.runId, collectionLogId: job.collectionLogId, platform: 'youtube' }),
        });
        const completeData = await completeRes.json();
        if (completeData.success) {
          console.log(`  ✅ [${job.name}/youtube] 完了: ${completeData.data.videosCollected}件 (新規${completeData.data.videosNew}, 更新${completeData.data.videosUpdated})`);
          return { success: true };
        } else {
          console.log(`  ❌ [${job.name}/youtube] 保存エラー: ${completeData.error}`);
          return { success: false };
        }
      } catch (e) {
        console.log(`  ❌ [${job.name}/youtube] 保存エラー: ${e.message}`);
        return { success: false };
      }
    } else {
      console.log(`  ❌ [${job.name}/youtube] Apifyジョブ失敗: ${status.status}`);
      return { success: false };
    }
  }));

  const successCount = results.filter(r => r.success).length;
  console.log(`  結果: ${successCount}/${validJobs.length}件 成功`);

  // タギング実行
  console.log('='.repeat(50));
  console.log('タギング実行');
  console.log('='.repeat(50));
  try {
    const tagRes = await fetch(`${BASE_URL}/api/videos/auto-tag`, { method: 'POST' });
    const tagData = await tagRes.json();
    console.log(`  ✅ タギング完了: ${tagData.data?.tagged || 0}件タグ付与`);
  } catch (e) {
    console.log(`  ❌ タギングエラー: ${e.message}`);
  }

  // ベンチマーク再計算
  console.log('='.repeat(50));
  console.log('ベンチマーク再計算');
  console.log('='.repeat(50));
  try {
    const bmRes = await fetch(`${BASE_URL}/api/benchmarks/recalculate`, { method: 'POST' });
    const bmData = await bmRes.json();
    console.log(`  ✅ ベンチマーク再計算完了: ${bmData.data?.recalculated || 0}業種`);
  } catch (e) {
    console.log(`  ❌ ベンチマークエラー: ${e.message}`);
  }

  console.log('='.repeat(50));
  console.log('完了');
  console.log('='.repeat(50));
}

main().catch(console.error);
