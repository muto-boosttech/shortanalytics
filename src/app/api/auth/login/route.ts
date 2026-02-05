import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// 認証情報（環境変数から取得、フォールバックとしてハードコード）
const VALID_USERNAME = process.env.AUTH_USERNAME || "BoosttechTikTok";
const VALID_PASSWORD = process.env.AUTH_PASSWORD || "BoosttechTikTok";

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

    // 認証チェック
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const sessionToken = generateSessionToken();
      
      // Cookieにセッショントークンを設定
      const cookieStore = await cookies();
      cookieStore.set("session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7日間
        path: "/",
      });

      return NextResponse.json({
        success: true,
        message: "ログインに成功しました",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "ユーザー名またはパスワードが正しくありません" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "ログイン処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
