import db from "@/lib/supabaseAdmin";
import { api, ApiError, json, readBody, textField, onlyFields, isRecord } from "@/lib/api";
import { createSessionCookie } from "@/lib/session";
import { allowLogin } from "@/lib/loginLimiter";
export const POST = api(async (req: Request) => {
  const body = await readBody(req); onlyFields(body, ["code"]);
  const code = textField(body.code, "code", 10).toUpperCase();
  if (!allowLogin(code)) {
    const response = json({ error: "Troppi tentativi. Riprova tra un minuto." }, 429);
    response.headers.set("Retry-After", "60"); return response;
  }
  const { data, error } = await db.from("players").select("owner_id, display_name, is_admin").eq("access_code", code).maybeSingle();
  if (error) throw new ApiError(503, "Accesso temporaneamente non disponibile.");
  if (!data) throw new ApiError(401, "Codice non valido.");
  if (!isRecord(data) || typeof data.owner_id !== "string" || !data.owner_id.trim() || typeof data.is_admin !== "boolean") throw new ApiError(503, "Accesso temporaneamente non disponibile.");
  const response = json({ ok: true });
  response.cookies.set(await createSessionCookie(data.owner_id));
  return response;
});
