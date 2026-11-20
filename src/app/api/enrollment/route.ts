import { api, json, onlyFields, readBody } from "@/lib/api";
import { requireAccount } from "@/lib/auth";
import { userClient } from "@/lib/supabase/server";
import { parseAccount } from "@/lib/identity-contracts";
import { rpcFailure } from "@/lib/edition";
export const POST = api(async (req: Request) => {
  await requireAccount(); onlyFields(await readBody(req), []);
  const client = await userClient(); const { data, error } = await client.rpc("join_current_edition");
  if (error) rpcFailure(error); return json(parseAccount(data));
});
