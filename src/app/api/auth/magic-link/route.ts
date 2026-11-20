import { api, ApiError, json, readBody, onlyFields, textField } from "@/lib/api";
import { userClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";
import { currentEdition } from "@/lib/edition";
export const POST = api(async (req: Request) => {
  const body = await readBody(req); onlyFields(body, ["email", "intent"]);
  const email = textField(body.email, "email", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (body.intent !== "login" && body.intent !== "register")) throw new ApiError(400, "Email o modalità di accesso non valida.");
  const register = body.intent === "register";
  if (register && !(await currentEdition()).registrationsOpen) throw new ApiError(403, "Le nuove iscrizioni sono chiuse. Gli account esistenti possono accedere.");
  const client = await userClient(true);
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: register, emailRedirectTo: `${appOrigin()}/auth/confirm` } });
  if (error?.status === 429) throw new ApiError(429, "Troppi invii. Attendi prima di riprovare.");
  if (error && !(body.intent === "login" && ["otp_disabled", "user_not_found", "signup_disabled"].includes(error.code ?? ""))) throw new ApiError(503, "Invio non disponibile. Riprova più tardi.");
  return json({ ok: true, message: "Se l'indirizzo è abilitato, riceverai un link di accesso. Controlla anche lo spam." });
});
