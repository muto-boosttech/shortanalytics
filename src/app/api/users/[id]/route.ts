import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, isMasterAdmin, isAdmin } from "@/lib/session";
import bcrypt from "bcryptjs";

// PATCH /api/users/[id] - ユーザー更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "無効なユーザーIDです" }, { status: 400 });
    }

    // 対象ユーザーの存在確認
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // 権限チェック: 管理者は自分が作成したユーザーのみ編集可能
    if (!isMasterAdmin(session)) {
      if (targetUser.createdById !== session.userId) {
        return NextResponse.json({ success: false, error: "このユーザーを編集する権限がありません" }, { status: 403 });
      }
    }

    // マスター管理者自身のロール変更は禁止
    if (targetUser.role === "master_admin" && targetUser.id !== session.userId && !isMasterAdmin(session)) {
      return NextResponse.json({ success: false, error: "マスター管理者を編集する権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { displayName, email, role, isActive, password, plan } = body;

    // 更新データの構築
    const updateData: Record<string, unknown> = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // ロール変更はマスター管理者のみ
    if (role !== undefined) {
      if (!isMasterAdmin(session)) {
        return NextResponse.json({ success: false, error: "ロールを変更する権限がありません" }, { status: 403 });
      }
      updateData.role = role;
    }

    // プラン変更はマスター管理者または管理者
    if (plan !== undefined) {
      const validPlans = ["free", "starter", "premium", "max"];
      if (!validPlans.includes(plan)) {
        return NextResponse.json({ success: false, error: "無効なプランです" }, { status: 400 });
      }
      updateData.plan = plan;
    }

    // パスワード変更
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // メール重複チェック
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: "このメールアドレスは既に使用されています" },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { success: false, error: "ユーザーの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - ユーザー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "無効なユーザーIDです" }, { status: 400 });
    }

    // 自分自身は削除不可
    if (userId === session.userId) {
      return NextResponse.json({ success: false, error: "自分自身を削除することはできません" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // マスター管理者の削除は禁止
    if (targetUser.role === "master_admin") {
      return NextResponse.json({ success: false, error: "マスター管理者を削除することはできません" }, { status: 403 });
    }

    // 権限チェック: 管理者は自分が作成したユーザーのみ削除可能
    if (!isMasterAdmin(session)) {
      if (targetUser.createdById !== session.userId) {
        return NextResponse.json({ success: false, error: "このユーザーを削除する権限がありません" }, { status: 403 });
      }
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: "ユーザーを削除しました" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { success: false, error: "ユーザーの削除に失敗しました" },
      { status: 500 }
    );
  }
}
