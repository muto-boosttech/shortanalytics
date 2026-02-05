# SHORTBOOSTER Creative Analyzer

TikTokクリエイティブ分析ダッシュボードのバックエンドAPI

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **ORM**: Prisma 5
- **Database**: SQLite
- **External API**: Apify TikTok Hashtag Scraper

## データベース構成

7テーブル構成:

| テーブル名 | 説明 |
|-----------|------|
| `industries` | 業種マスタ（10業種） |
| `industry_hashtags` | 業種別ハッシュタグ（各6つ） |
| `videos` | 動画データ |
| `video_tags` | 動画タグ（分析用） |
| `benchmarks` | ベンチマークデータ |
| `collection_logs` | 収集ログ |
| `profiles` | ユーザープロファイル |

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# データベースのマイグレーション
npx prisma migrate dev

# シードデータの投入
npx tsx prisma/seed.ts

# 開発サーバーの起動
pnpm dev
```

## 環境変数

`.env` ファイルに以下を設定:

```env
DATABASE_URL="file:./dev.db"
APIFY_API_TOKEN="your_apify_token_here"
```

## API エンドポイント一覧

### 業種 (Industries)

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/industries` | 全業種を取得 |
| POST | `/api/industries` | 新規業種を作成 |

### ハッシュタグ (Hashtags)

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/industries/[id]/hashtags` | 業種のハッシュタグ一覧 |
| POST | `/api/industries/[id]/hashtags` | ハッシュタグを追加 |
| GET | `/api/industries/[id]/hashtags/[hashtagId]` | 特定のハッシュタグを取得 |
| PATCH | `/api/industries/[id]/hashtags/[hashtagId]` | ハッシュタグを更新 |
| DELETE | `/api/industries/[id]/hashtags/[hashtagId]` | ハッシュタグを削除 |

### 動画 (Videos)

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/videos` | 動画一覧（フィルタ+ソート+ページネーション） |
| GET | `/api/videos/[id]` | 動画詳細 |
| DELETE | `/api/videos/[id]` | 動画を削除 |
| POST | `/api/videos/auto-tag` | 自動タグ付け（キーワードルールベース） |
| POST | `/api/videos/import` | CSVインポート |

### Apify連携

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/collect` | TikTok動画を収集 |

### ダッシュボード・分析

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/dashboard` | KPI+グラフ集計 |
| GET | `/api/benchmarks` | ベンチマークデータ |
| POST | `/api/benchmarks/recalculate` | ベンチマーク再計算 |
| GET | `/api/collection-logs` | 収集ログ一覧 |

## API 詳細

### GET /api/videos

クエリパラメータ:

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `page` | number | ページ番号（デフォルト: 1） |
| `limit` | number | 1ページあたりの件数（デフォルト: 20） |
| `industry_id` | number | 業種ID |
| `author_username` | string | 投稿者名（部分一致） |
| `source` | string | ソース（seed/apify/csv_import） |
| `min_view_count` | number | 最小視聴数 |
| `max_view_count` | number | 最大視聴数 |
| `min_engagement_rate` | number | 最小エンゲージメント率 |
| `max_engagement_rate` | number | 最大エンゲージメント率 |
| `min_duration` | number | 最小動画時間（秒） |
| `max_duration` | number | 最大動画時間（秒） |
| `content_type` | string | コンテンツタイプ |
| `hook_type` | string | フックタイプ |
| `duration_category` | string | 動画時間カテゴリ（short/medium/long） |
| `search` | string | 検索キーワード |
| `sort_by` | string | ソートフィールド |
| `sort_order` | string | ソート順（asc/desc） |

### POST /api/collect

リクエストボディ:

```json
{
  "hashtags": ["美容", "コスメ"],
  "industryId": 1,
  "resultsPerPage": 30
}
```

レスポンス:

```json
{
  "success": true,
  "data": {
    "collectionLogId": 1,
    "videosCollected": 30,
    "videosNew": 25,
    "videosUpdated": 5
  }
}
```

### GET /api/dashboard

クエリパラメータ:

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `industry_id` | number | 業種ID（オプション） |
| `period` | number | 期間（日数、デフォルト: 30） |

レスポンス:

```json
{
  "success": true,
  "data": {
    "kpi": {
      "totalVideos": 200,
      "totalViews": 1000000000,
      "avgEngagementRate": 0.08,
      "medianViewCount": 500000
    },
    "charts": {
      "contentTypeStats": [...],
      "hookTypeStats": [...],
      "durationCategoryStats": [...],
      "dailyTrend": [...]
    },
    "topVideos": {
      "byViews": [...],
      "byEngagement": [...]
    }
  }
}
```

## シードデータ

### 10業種

1. 美容・コスメ
2. 飲食・グルメ
3. ファッション
4. フィットネス
5. 不動産
6. 教育
7. 医療
8. EC・D2C
9. 旅行
10. エンタメ

### 各業種のハッシュタグ（各6つ）

例: 美容・コスメ → 美容, コスメ, スキンケア, メイク, 美肌, 化粧品

### ダミー動画

- 200件のダミー動画データ
- 各動画にvideo_tagsを付与
- 各業種にbenchmarksを生成

## 自動タグ付けルール

キーワードベースで以下のタグを自動付与:

- **コンテンツタイプ**: チュートリアル, レビュー, Vlog, ビフォーアフター, ランキング, Q&A, ハウツー, 商品紹介
- **フックタイプ**: 質問形式, 衝撃的事実, ビフォーアフター, カウントダウン, ストーリー導入, 問題提起, 比較
- **パフォーマータイプ**: 顔出し, 顔なし, アバター, テキストのみ, 商品のみ
- **トーン**: カジュアル, プロフェッショナル, ユーモア, 感動, 教育的
- **CTAタイプ**: フォロー促進, いいね促進, コメント促進, シェア促進, リンク誘導, なし

## ライセンス

MIT
