import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// POST /api/auth/logout - ログアウト処理
export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session_token");

    return NextResponse.json({
      success: true,
      message: "ログアウトしました",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "ログアウト処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
