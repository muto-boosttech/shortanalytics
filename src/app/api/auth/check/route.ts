import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/auth/check - 認証状態を確認
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");

    if (sessionToken?.value) {
      return NextResponse.json({
        authenticated: true,
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
