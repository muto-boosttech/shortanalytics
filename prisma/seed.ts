import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 10業種の定義
const industries = [
  { name: "美容・コスメ", slug: "beauty-cosmetics" },
  { name: "飲食・グルメ", slug: "food-gourmet" },
  { name: "ファッション", slug: "fashion" },
  { name: "フィットネス", slug: "fitness" },
  { name: "不動産", slug: "real-estate" },
  { name: "教育", slug: "education" },
  { name: "医療", slug: "healthcare" },
  { name: "EC・D2C", slug: "ec-d2c" },
  { name: "旅行", slug: "travel" },
  { name: "エンタメ", slug: "entertainment" },
];

// 各業種のハッシュタグ（各6つ）
const industryHashtags: Record<string, string[]> = {
  "beauty-cosmetics": ["美容", "コスメ", "スキンケア", "メイク", "美肌", "化粧品"],
  "food-gourmet": ["グルメ", "食べ歩き", "おうちごはん", "レシピ", "料理", "カフェ"],
  "fashion": ["ファッション", "コーデ", "OOTD", "プチプラ", "トレンド", "着回し"],
  "fitness": ["フィットネス", "筋トレ", "ダイエット", "ワークアウト", "ジム", "ボディメイク"],
  "real-estate": ["不動産", "マイホーム", "賃貸", "物件紹介", "インテリア", "ルームツアー"],
  "education": ["教育", "勉強", "学習", "資格", "英語", "受験"],
  "healthcare": ["医療", "健康", "ヘルスケア", "病院", "医師", "予防"],
  "ec-d2c": ["EC", "通販", "ショッピング", "おすすめ商品", "レビュー", "購入品"],
  "travel": ["旅行", "観光", "トラベル", "絶景", "国内旅行", "海外旅行"],
  "entertainment": ["エンタメ", "お笑い", "ダンス", "音楽", "映画", "ゲーム"],
};

// コンテンツタイプ
const contentTypes = ["チュートリアル", "レビュー", "Vlog", "ビフォーアフター", "ランキング", "Q&A", "ハウツー", "商品紹介"];

// フックタイプ
const hookTypes = ["質問形式", "衝撃的事実", "ビフォーアフター", "カウントダウン", "ストーリー導入", "問題提起", "比較"];

// パフォーマータイプ
const performerTypes = ["顔出し", "顔なし", "アバター", "テキストのみ", "商品のみ"];

// トーン
const tones = ["カジュアル", "プロフェッショナル", "ユーモア", "感動", "教育的"];

// CTAタイプ
const ctaTypes = ["フォロー促進", "いいね促進", "コメント促進", "シェア促進", "リンク誘導", "なし"];

// ランダム選択ヘルパー
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ランダム整数生成
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ランダム日付生成（過去90日以内）
function randomDate(): Date {
  const now = new Date();
  const daysAgo = randomInt(1, 90);
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

// ダミー動画説明文生成
function generateDescription(industrySlug: string): string {
  const descriptions: Record<string, string[]> = {
    "beauty-cosmetics": [
      "今日のメイクルーティン💄✨ #美容 #コスメ",
      "プチプラコスメで垢抜けメイク！ #メイク #プチプラ",
      "スキンケアの順番、間違ってない？ #スキンケア #美肌",
    ],
    "food-gourmet": [
      "絶品パスタの作り方🍝 #料理 #レシピ",
      "話題のカフェに行ってきた☕ #カフェ #グルメ",
      "5分でできる簡単朝ごはん #おうちごはん #時短",
    ],
    "fashion": [
      "1週間着回しコーデ👗 #ファッション #着回し",
      "今季トレンドアイテム紹介 #トレンド #OOTD",
      "プチプラで高見えコーデ #プチプラ #コーデ",
    ],
    "fitness": [
      "自宅でできる腹筋トレーニング💪 #筋トレ #ダイエット",
      "1ヶ月で-5kg達成した方法 #ダイエット #ボディメイク",
      "朝のストレッチルーティン #フィットネス #健康",
    ],
    "real-estate": [
      "1LDKルームツアー🏠 #ルームツアー #インテリア",
      "賃貸選びのポイント解説 #賃貸 #不動産",
      "狭い部屋を広く見せるコツ #インテリア #収納",
    ],
    "education": [
      "TOEIC900点の勉強法📚 #英語 #勉強",
      "集中力を上げる方法 #学習 #受験",
      "資格試験に受かるコツ #資格 #勉強法",
    ],
    "healthcare": [
      "医師が教える正しい手洗い🏥 #健康 #予防",
      "睡眠の質を上げる方法 #ヘルスケア #健康",
      "肩こり解消ストレッチ #健康 #医療",
    ],
    "ec-d2c": [
      "買ってよかった商品TOP5🛒 #購入品 #おすすめ",
      "正直レビュー！話題の商品 #レビュー #EC",
      "セールで買うべきアイテム #ショッピング #通販",
    ],
    "travel": [
      "京都おすすめスポット🗾 #国内旅行 #観光",
      "海外旅行の持ち物リスト #海外旅行 #トラベル",
      "絶景スポットまとめ #絶景 #旅行",
    ],
    "entertainment": [
      "話題のダンス踊ってみた💃 #ダンス #TikTok",
      "おすすめ映画紹介 #映画 #エンタメ",
      "最新ゲームレビュー #ゲーム #レビュー",
    ],
  };
  return randomChoice(descriptions[industrySlug] || descriptions["entertainment"]);
}

async function main() {
  console.log("🌱 Seeding database...");

  // 既存データを削除
  await prisma.videoTag.deleteMany();
  await prisma.benchmark.deleteMany();
  await prisma.collectionLog.deleteMany();
  await prisma.video.deleteMany();
  await prisma.industryHashtag.deleteMany();
  await prisma.industry.deleteMany();
  await prisma.profile.deleteMany();

  console.log("✅ Cleared existing data");

  // 業種を作成
  const createdIndustries = await Promise.all(
    industries.map((industry) =>
      prisma.industry.create({
        data: industry,
      })
    )
  );
  console.log(`✅ Created ${createdIndustries.length} industries`);

  // 業種別ハッシュタグを作成
  for (const industry of createdIndustries) {
    const hashtags = industryHashtags[industry.slug] || [];
    await Promise.all(
      hashtags.map((hashtag) =>
        prisma.industryHashtag.create({
          data: {
            industryId: industry.id,
            hashtag,
            isActive: true,
          },
        })
      )
    );
  }
  console.log("✅ Created industry hashtags");

  // ダミー動画200件を作成
  const videos = [];
  for (let i = 0; i < 200; i++) {
    const industry = randomChoice(createdIndustries);
    const viewCount = randomInt(1000, 10000000);
    const likeCount = randomInt(Math.floor(viewCount * 0.01), Math.floor(viewCount * 0.15));
    const commentCount = randomInt(Math.floor(likeCount * 0.01), Math.floor(likeCount * 0.1));
    const shareCount = randomInt(Math.floor(likeCount * 0.005), Math.floor(likeCount * 0.05));
    const engagementRate = (likeCount + commentCount + shareCount) / viewCount;
    const duration = randomInt(5, 180);
    const hashtags = industryHashtags[industry.slug] || [];

    const video = await prisma.video.create({
      data: {
        tiktokVideoId: `dummy_video_${i + 1}_${Date.now()}`,
        videoUrl: `https://www.tiktok.com/@user${randomInt(1, 1000)}/video/${randomInt(1000000000, 9999999999)}`,
        description: generateDescription(industry.slug),
        hashtags: JSON.stringify(hashtags.slice(0, randomInt(2, 4))),
        viewCount,
        likeCount,
        commentCount,
        shareCount,
        engagementRate,
        videoDurationSeconds: duration,
        authorUsername: `creator_${randomInt(1, 500)}`,
        authorFollowerCount: randomInt(1000, 5000000),
        postedAt: randomDate(),
        thumbnailUrl: `https://p16-sign-sg.tiktokcdn.com/obj/dummy-thumbnail-${i + 1}.jpeg`,
        collectedAt: new Date(),
        source: "seed",
      },
    });
    videos.push({ video, industry });
  }
  console.log(`✅ Created ${videos.length} dummy videos`);

  // video_tagsを作成
  for (const { video, industry } of videos) {
    const duration = video.videoDurationSeconds || 30;
    let durationCategory = "medium";
    if (duration <= 15) durationCategory = "short";
    else if (duration > 30) durationCategory = "long";

    await prisma.videoTag.create({
      data: {
        videoId: video.id,
        industryId: industry.id,
        contentType: randomChoice(contentTypes),
        hookType: randomChoice(hookTypes),
        durationCategory,
        performerType: randomChoice(performerTypes),
        tone: randomChoice(tones),
        ctaType: randomChoice(ctaTypes),
      },
    });
  }
  console.log("✅ Created video tags");

  // benchmarksを作成（各業種に1つ）
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const industry of createdIndustries) {
    // 業種に紐づく動画を取得
    const industryVideos = videos.filter((v) => v.industry.id === industry.id);
    const engagementRates = industryVideos.map((v) => v.video.engagementRate);
    const viewCounts = industryVideos.map((v) => v.video.viewCount).sort((a, b) => a - b);

    const avgEngagementRate =
      engagementRates.length > 0
        ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
        : 0;
    const medianViewCount =
      viewCounts.length > 0 ? viewCounts[Math.floor(viewCounts.length / 2)] : 0;

    // コンテンツタイプとフックタイプの集計
    const contentTypeCounts: Record<string, number> = {};
    const hookTypeCounts: Record<string, number> = {};

    for (const { video } of industryVideos) {
      const tag = await prisma.videoTag.findFirst({
        where: { videoId: video.id },
      });
      if (tag) {
        if (tag.contentType) {
          contentTypeCounts[tag.contentType] = (contentTypeCounts[tag.contentType] || 0) + 1;
        }
        if (tag.hookType) {
          hookTypeCounts[tag.hookType] = (hookTypeCounts[tag.hookType] || 0) + 1;
        }
      }
    }

    const topContentTypes = Object.entries(contentTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    const topHookTypes = Object.entries(hookTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    await prisma.benchmark.create({
      data: {
        industryId: industry.id,
        periodStart,
        periodEnd,
        avgEngagementRate,
        medianViewCount,
        topContentTypes: JSON.stringify(topContentTypes),
        topHookTypes: JSON.stringify(topHookTypes),
        sampleSize: industryVideos.length,
      },
    });
  }
  console.log("✅ Created benchmarks");

  // サンプルプロファイルを作成
  await prisma.profile.create({
    data: {
      email: "demo@shortbooster.com",
      displayName: "デモユーザー",
      companyName: "SHORTBOOSTER Inc.",
    },
  });
  console.log("✅ Created sample profile");

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
