import { api, ApiError, json, readBody, onlyFields, textField } from "@/lib/api";
import { userClient } from "@/lib/supabase/server";
export const POST = api(async (req: Request) => {
  const body = await readBody(req); onlyFields(body, ["tokenHash"]);
  const tokenHash = textField(body.tokenHash, "tokenHash", 512);
  if (!/^[a-zA-Z0-9_-]+$/.test(tokenHash)) throw new ApiError(400, "Link non valido.");
  const client = await userClient(true); const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error) throw new ApiError(400, "Link scaduto, già utilizzato o non valido. Richiedi un nuovo link.");
  return json({ ok: true });
});
