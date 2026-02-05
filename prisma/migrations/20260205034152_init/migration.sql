-- CreateTable
CREATE TABLE "industries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "industry_hashtags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "industry_id" INTEGER NOT NULL,
    "hashtag" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "industry_hashtags_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "videos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tiktok_video_id" TEXT NOT NULL,
    "video_url" TEXT,
    "description" TEXT,
    "hashtags" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" REAL NOT NULL DEFAULT 0,
    "video_duration_seconds" INTEGER,
    "author_username" TEXT,
    "author_follower_count" INTEGER,
    "posted_at" DATETIME,
    "thumbnail_url" TEXT,
    "collected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT
);

-- CreateTable
CREATE TABLE "video_tags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "video_id" INTEGER NOT NULL,
    "industry_id" INTEGER NOT NULL,
    "content_type" TEXT,
    "hook_type" TEXT,
    "duration_category" TEXT,
    "performer_type" TEXT,
    "tone" TEXT,
    "cta_type" TEXT,
    "tagged_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "video_tags_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "video_tags_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "benchmarks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "industry_id" INTEGER NOT NULL,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "avg_engagement_rate" REAL NOT NULL DEFAULT 0,
    "median_view_count" INTEGER NOT NULL DEFAULT 0,
    "top_content_types" TEXT,
    "top_hook_types" TEXT,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "benchmarks_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collection_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "industry_id" INTEGER,
    "hashtag" TEXT,
    "apify_run_id" TEXT,
    "videos_collected" INTEGER NOT NULL DEFAULT 0,
    "videos_new" INTEGER NOT NULL DEFAULT 0,
    "videos_updated" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "error_message" TEXT,
    CONSTRAINT "collection_logs_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "company_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "videos_tiktok_video_id_key" ON "videos"("tiktok_video_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");
