import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PlanType, PLAN_CONFIGS } from "@/lib/plan-limits";

// POST /api/auth/signup - セルフサインアップ（LP経由）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, displayName, email, plan, company } = body;

    // バリデーション
    if (!username || !password || !displayName || !email || !plan) {
      return NextResponse.json(
        { error: "必須項目をすべて入力してください" },
        { status: 400 }
      );
    }

    // ユーザーIDの長さチェック
    if (username.length < 4) {
      return NextResponse.json(
        { error: "ユーザーIDは4文字以上で入力してください" },
        { status: 400 }
      );
    }

    // パスワードの長さチェック
    if (password.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上で入力してください" },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // プランの有効性チェック
    const validPlans: PlanType[] = ["free", "starter", "premium", "max"];
    if (!validPlans.includes(plan as PlanType)) {
      return NextResponse.json(
        { error: "無効なプランが選択されています" },
        { status: 400 }
      );
    }

    // ユーザーIDの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "このユーザーIDは既に使用されています" },
        { status: 409 }
      );
    }

    // メールアドレスの重複チェック
    const existingEmail = await prisma.user.findFirst({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        displayName,
        email,
        role: "user",
        plan: plan as string,
        isActive: true,
      },
    });

    const planConfig = PLAN_CONFIGS[plan as PlanType];

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        plan: planConfig.label,
        planName: plan,
        message: `${planConfig.label}プランでアカウントが作成されました`,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "アカウント作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
