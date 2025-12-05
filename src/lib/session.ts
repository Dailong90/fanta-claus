import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "fanta_session";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

type SessionPayload = {
  ownerId: string;
};

// Crea il cookie di sessione (JWT firmato)
export async function createSessionCookie(ownerId: string) {
  const token = await new SignJWT({ ownerId } as SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);

  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

// Legge il cookie e restituisce la sessione (oppure null)
export async function getSessionFromCookies() {
  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secret);

    if (!payload.ownerId || typeof payload.ownerId !== "string") {
      return null;
    }

    return {
      ownerId: payload.ownerId,
    };
  } catch (err) {
    console.error("❌ Errore verifica JWT", err);
    return null;
  }
}
