import { api, ApiError, json, readBody, onlyFields, textField } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { userClient } from "@/lib/supabase/server";
import { rpcFailure } from "@/lib/edition";
import { parseParticipants } from "@/lib/identity-contracts";
export const GET = api(async () => {
  await requireAdmin(); const client = await userClient(); const { data, error } = await client.rpc("admin_participants");
  if (error) rpcFailure(error); return json(parseParticipants(data));
});
export const PATCH = api(async (req: Request) => {
  await requireAdmin(); const body = await readBody(req); onlyFields(body, ["userId", "firstName", "lastName"]);
  const userId = textField(body.userId, "utente", 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) throw new ApiError(400, "Utente non valido.");
  const firstName = textField(body.firstName, "nome", 80); const lastName = textField(body.lastName, "cognome", 80);
  if (/[\u0000-\u001f\u007f]/.test(firstName + lastName)) throw new ApiError(400, "Nome non valido.");
  const client = await userClient(); const { error } = await client.rpc("correct_participant_name", { p_user_id: userId, p_first_name: firstName, p_last_name: lastName });
  if (error) rpcFailure(error); return json({ ok: true });
});
