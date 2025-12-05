import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Invalida il cookie di sessione
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0, // scade subito
  });

  return res;
}
