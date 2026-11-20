import { api, ApiError, json, onlyFields, readBody, textField } from "@/lib/api";
import { requireAccount } from "@/lib/auth";
import { isAvatar, parseAccount } from "@/lib/identity-contracts";
import { userClient } from "@/lib/supabase/server";
import { rpcFailure } from "@/lib/edition";
export const GET = api(async () => json(await requireAccount()));
export const POST = api(async (req: Request) => {
  await requireAccount(); const body = await readBody(req); onlyFields(body, ["firstName", "lastName", "avatarId"]);
  const firstName = textField(body.firstName, "nome", 80); const lastName = textField(body.lastName, "cognome", 80);
  if (!isAvatar(body.avatarId) || /[\u0000-\u001f\u007f]/.test(firstName + lastName)) throw new ApiError(400, "Profilo non valido.");
  const client = await userClient(); const { data, error } = await client.rpc("create_profile", { p_first_name: firstName, p_last_name: lastName, p_avatar_id: body.avatarId });
  if (error) rpcFailure(error); return json(parseAccount(data));
});
export const PATCH = api(async (req: Request) => {
  await requireAccount(); const body = await readBody(req); onlyFields(body, ["avatarId"]);
  if (!isAvatar(body.avatarId)) throw new ApiError(400, "Avatar non valido.");
  const client = await userClient(); const { data, error } = await client.rpc("set_avatar", { p_avatar_id: body.avatarId });
  if (error) rpcFailure(error); return json(parseAccount(data));
});
