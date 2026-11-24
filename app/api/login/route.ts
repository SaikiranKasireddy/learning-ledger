import { NextResponse } from "next/server";
import { COOKIE, MAX_AGE, checkPassword, createToken } from "@/lib/session";

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  const expected = process.env.APP_PASSWORD;
  if (!secret || secret.length < 16 || !expected) {
    return NextResponse.json(
      { error: "The server is missing APP_PASSWORD or SESSION_SECRET (16+ characters)." },
      { status: 500 }
    );
  }

  let body: { password?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // fall through with an empty body
  }

  const ok = typeof body.password === "string" && (await checkPassword(body.password, expected, secret));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600)); // slows down guessing
    return NextResponse.json({ error: "That password is not right." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}
