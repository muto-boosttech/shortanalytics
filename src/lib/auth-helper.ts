import { cookies } from "next/headers";

export interface SessionData {
  userId: number;
  username: string;
  displayName: string;
  role: string;
}

// セッションデータを解析するヘルパー
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");
    if (!sessionToken?.value) return null;

    const decoded = Buffer.from(sessionToken.value, "base64").toString("utf-8");
    const session = JSON.parse(decoded);

    if (!session?.userId) return null;
    return session as SessionData;
  } catch {
    return null;
  }
}
