import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkFreeTrialExpired, PLAN_CONFIGS, PlanType } from "@/lib/plan-limits";

// セッショントークンを生成
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// POST /api/auth/login - ログイン処理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "ユーザー名とパスワードを入力してください" },
        { status: 400 }
      );
    }

    // DBからユーザーを検索
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "ユーザー名またはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    // パスワード検証
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "ユーザー名またはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    // Freeプランの有効期限チェック
    const userPlan = (user.plan || "free") as PlanType;
    const isExpired = await checkFreeTrialExpired(user.id, userPlan, user.createdAt);
    if (isExpired) {
      return NextResponse.json(
        {
          success: false,
          error: "Freeプランの試用期間（7日間）が終了しました。プランのアップグレードについては管理者にお問い合わせください。",
          expired: true,
        },
        { status: 403 }
      );
    }

    // 最終ログイン日時を更新
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionToken = generateSessionToken();
    const planConfig = PLAN_CONFIGS[userPlan];

    // セッション情報をJSON形式でエンコード（ユーザーID、ロール、プラン含む）
    const sessionData = JSON.stringify({
      token: sessionToken,
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role,
      plan: userPlan,
      planLabel: planConfig.label,
    });

    const encodedSession = Buffer.from(sessionData).toString("base64");

    // Cookieにセッショントークンを設定
    const cookieStore = await cookies();
    cookieStore.set("session_token", encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7日間
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "ログインに成功しました",
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
        plan: userPlan,
        planLabel: planConfig.label,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "ログイン処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
