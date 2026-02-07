import { cookies } from "next/headers";

export interface SessionUser {
  userId: number;
  username: string;
  displayName: string;
  role: "master_admin" | "admin" | "viewer";
  plan?: "free" | "starter" | "premium" | "max";
  planLabel?: string;
}

// セッションデータを解析するヘルパー
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");
    if (!sessionToken?.value) return null;

    const decoded = Buffer.from(sessionToken.value, "base64").toString("utf-8");
    const session = JSON.parse(decoded);

    if (session?.userId) {
      return {
        userId: session.userId,
        username: session.username,
        displayName: session.displayName || session.username,
        role: session.role,
        plan: session.plan || "free",
        planLabel: session.planLabel || "Free",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// マスター管理者かチェック
export function isMasterAdmin(session: SessionUser | null): boolean {
  return session?.role === "master_admin";
}

// 管理者以上かチェック
export function isAdmin(session: SessionUser | null): boolean {
  return session?.role === "master_admin" || session?.role === "admin";
}
