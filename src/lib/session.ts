import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sessionSecret } from "@/lib/serverConfig";

export const SESSION_COOKIE_NAME = "fanta_session";

type SessionPayload = {
  ownerId: string;
};

// Crea il cookie di sessione (JWT firmato)
export async function createSessionCookie(ownerId: string) {
  const token = await new SignJWT({ ownerId } as SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(sessionSecret());

  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  };
}

// Legge il cookie e restituisce la sessione (oppure null)
export async function getSessionFromCookies() {
  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = sessionSecret();
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secret, { algorithms: ["HS256"] });

    if (typeof payload.ownerId !== "string" || !payload.ownerId.trim() || payload.ownerId.length > 200 || typeof payload.exp !== "number") {
      return null;
    }

    return {
      ownerId: payload.ownerId,
    };
  } catch {
    return null;
  }
}
