import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/migrate - DBマイグレーション実行
export async function POST() {
  try {
    const results: string[] = [];

    // planカラムの追加
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free' NOT NULL`);
      results.push("Added plan column to users");
    } catch (e: unknown) {
      results.push(`plan column: ${e instanceof Error ? e.message : "error"}`);
    }

    // usage_logsテーブルの作成
    try {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        platform VARCHAR(20),
        industry_id INTEGER,
        detail TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`);
      results.push("Created usage_logs table");
    } catch (e: unknown) {
      results.push(`usage_logs: ${e instanceof Error ? e.message : "error"}`);
    }

    // インデックスの作成
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_usage_logs_user_action_date ON usage_logs(user_id, action_type, created_at)`);
      results.push("Created index");
    } catch (e: unknown) {
      results.push(`index: ${e instanceof Error ? e.message : "error"}`);
    }

    // マスター管理者をmaxプランに設定
    try {
      await prisma.$executeRawUnsafe(`UPDATE users SET plan = 'max' WHERE role = 'master_admin'`);
      results.push("Set master admin to max plan");
    } catch (e: unknown) {
      results.push(`update: ${e instanceof Error ? e.message : "error"}`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ success: false, error: "Migration failed" }, { status: 500 });
  }
}
