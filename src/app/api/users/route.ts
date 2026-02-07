import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, isMasterAdmin, isAdmin } from "@/lib/session";
import bcrypt from "bcryptjs";

// GET /api/users - ユーザー一覧取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
    }

    // マスター管理者は全ユーザー、管理者は自分が作成したユーザーのみ
    let whereClause = {};
    if (!isMasterAdmin(session)) {
      if (isAdmin(session)) {
        whereClause = { createdById: session.userId };
      } else {
        return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        createdBy: {
          select: { username: true, displayName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { success: false, error: "ユーザー一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/users - ユーザー新規作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, displayName, email, role, plan } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "ユーザー名とパスワードは必須です" },
        { status: 400 }
      );
    }

    // ロールの検証: master_adminはマスター管理者のみ作成可能
    const allowedRoles = isMasterAdmin(session)
      ? ["master_admin", "admin", "viewer"]
      : ["viewer"];

    const assignRole = role || "viewer";
    if (!allowedRoles.includes(assignRole)) {
      return NextResponse.json(
        { success: false, error: "指定されたロールを割り当てる権限がありません" },
        { status: 403 }
      );
    }

    // ユーザー名の重複チェック
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "このユーザー名は既に使用されています" },
        { status: 409 }
      );
    }

    // メールの重複チェック
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: "このメールアドレスは既に使用されています" },
          { status: 409 }
        );
      }
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // プランの検証
    const validPlans = ["free", "starter", "premium", "max"];
    const assignPlan = plan || "free";
    if (!validPlans.includes(assignPlan)) {
      return NextResponse.json(
        { success: false, error: "無効なプランです" },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        displayName: displayName || null,
        email: email || null,
        role: assignRole,
        plan: assignPlan,
        createdById: session.userId,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: newUser });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: "ユーザーの作成に失敗しました" },
      { status: 500 }
    );
  }
}
