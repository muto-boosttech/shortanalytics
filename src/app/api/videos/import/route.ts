import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parse } from "csv-parse/sync";

interface CSVRow {
  tiktok_video_id?: string;
  video_url?: string;
  description?: string;
  hashtags?: string;
  view_count?: string;
  like_count?: string;
  comment_count?: string;
  share_count?: string;
  video_duration_seconds?: string;
  author_username?: string;
  author_follower_count?: string;
  posted_at?: string;
  thumbnail_url?: string;
}

// POST /api/videos/import - CSVから動画をインポート
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const source = (formData.get("source") as string) || "csv_import";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "CSV file is required" },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    // CSVをパース
    let records: CSVRow[];
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid CSV format" },
        { status: 400 }
      );
    }

    const results = {
      total: records.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // ヘッダー行を考慮

      // tiktok_video_idは必須
      if (!row.tiktok_video_id) {
        results.errors.push(`Row ${rowNum}: tiktok_video_id is required`);
        results.skipped++;
        continue;
      }

      try {
        // 数値の変換
        const viewCount = parseInt(row.view_count || "0") || 0;
        const likeCount = parseInt(row.like_count || "0") || 0;
        const commentCount = parseInt(row.comment_count || "0") || 0;
        const shareCount = parseInt(row.share_count || "0") || 0;
        const videoDurationSeconds = row.video_duration_seconds
          ? parseInt(row.video_duration_seconds)
          : null;
        const authorFollowerCount = row.author_follower_count
          ? parseInt(row.author_follower_count)
          : null;

        // エンゲージメント率の計算
        const engagementRate =
          viewCount > 0 ? (likeCount + commentCount + shareCount) / viewCount : 0;

        // 日付の変換
        let postedAt: Date | null = null;
        if (row.posted_at) {
          const parsed = new Date(row.posted_at);
          if (!isNaN(parsed.getTime())) {
            postedAt = parsed;
          }
        }

        // ハッシュタグの処理
        let hashtags: string | null = null;
        if (row.hashtags) {
          // カンマ区切りまたはスペース区切りを配列に変換
          const hashtagArray = row.hashtags
            .split(/[,\s]+/)
            .map((h) => h.trim().replace(/^#/, ""))
            .filter((h) => h.length > 0);
          hashtags = JSON.stringify(hashtagArray);
        }

        // UPSERTを実行
        const existing = await prisma.video.findUnique({
          where: { tiktokVideoId: row.tiktok_video_id },
        });

        if (existing) {
          await prisma.video.update({
            where: { tiktokVideoId: row.tiktok_video_id },
            data: {
              videoUrl: row.video_url || existing.videoUrl,
              description: row.description || existing.description,
              hashtags: hashtags || existing.hashtags,
              viewCount,
              likeCount,
              commentCount,
              shareCount,
              engagementRate,
              videoDurationSeconds:
                videoDurationSeconds ?? existing.videoDurationSeconds,
              authorUsername: row.author_username || existing.authorUsername,
              authorFollowerCount:
                authorFollowerCount ?? existing.authorFollowerCount,
              postedAt: postedAt || existing.postedAt,
              thumbnailUrl: row.thumbnail_url || existing.thumbnailUrl,
              collectedAt: new Date(),
            },
          });
          results.updated++;
        } else {
          await prisma.video.create({
            data: {
              tiktokVideoId: row.tiktok_video_id,
              videoUrl: row.video_url || null,
              description: row.description || null,
              hashtags,
              viewCount,
              likeCount,
              commentCount,
              shareCount,
              engagementRate,
              videoDurationSeconds,
              authorUsername: row.author_username || null,
              authorFollowerCount,
              postedAt,
              thumbnailUrl: row.thumbnail_url || null,
              collectedAt: new Date(),
              source,
            },
          });
          results.imported++;
        }
      } catch (rowError) {
        results.errors.push(`Row ${rowNum}: ${(rowError as Error).message}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error importing videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import videos" },
      { status: 500 }
    );
  }
}
