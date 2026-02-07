import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { checkFreeTrialExpired, PLAN_CONFIGS, PlanType } from "@/lib/plan-limits";

// セッションデータを解析するヘルパー
function parseSession(sessionCookie: string | undefined) {
  if (!sessionCookie) return null;
  try {
    const decoded = Buffer.from(sessionCookie, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// GET /api/auth/check - 認証状態を確認
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");

    const session = parseSession(sessionToken?.value);

    if (session?.userId) {
      // DBからユーザーの最新プラン情報を取得
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { plan: true, isActive: true, createdAt: true },
      });

      if (!user || !user.isActive) {
        return NextResponse.json({ authenticated: false });
      }

      const userPlan = (user.plan || "free") as PlanType;
      const planConfig = PLAN_CONFIGS[userPlan];

      // Freeプランの有効期限チェック
      const isExpired = await checkFreeTrialExpired(session.userId, userPlan, user.createdAt);
      if (isExpired) {
        // セッションを無効化
        cookieStore.delete("session_token");
        return NextResponse.json({
          authenticated: false,
          expired: true,
          message: "Freeプランの試用期間（7日間）が終了しました。",
        });
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: session.userId,
          username: session.username,
          displayName: session.displayName,
          role: session.role,
          plan: userPlan,
          planLabel: planConfig.label,
        },
      });
    } else {
      return NextResponse.json({
        authenticated: false,
      });
    }
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({
      authenticated: false,
    });
  }
}
