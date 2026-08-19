import { NextResponse } from "next/server";
import { COOKIE_NAME, tokenForPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const correct = process.env.DASHBOARD_PASSWORD ?? "";

  if (!correct) {
    return NextResponse.json({ ok: false, error: "DASHBOARD_PASSWORD not configured" }, { status: 500 });
  }
  if (password !== correct) {
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  const token = await tokenForPassword(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
