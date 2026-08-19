import { NextResponse } from "next/server";

export const COOKIE_NAME = "fs_auth";

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedToken(): Promise<string> {
  const password = process.env.DASHBOARD_PASSWORD ?? "";
  return sha256(password);
}

export async function tokenForPassword(password: string): Promise<string> {
  return sha256(password);
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function requireAuth(req: Request): Promise<NextResponse | null> {
  const cookieValue = readCookie(req, COOKIE_NAME);
  const expected = await expectedToken();
  if (!cookieValue || cookieValue !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
