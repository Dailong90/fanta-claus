import { api, ApiError, json, readBody, onlyFields } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { userClient } from "@/lib/supabase/server";
import { rpcFailure } from "@/lib/edition";
import { parseEdition, parseAdminEdition } from "@/lib/identity-contracts";
export const GET = api(async () => {
  await requireAdmin(); const client = await userClient(); const { data, error } = await client.rpc("admin_registration");
  if (error) rpcFailure(error); return json(parseAdminEdition(data));
});
export const POST = api(async (req: Request) => {
  await requireAdmin(); const body = await readBody(req); onlyFields(body, ["confirmation"]);
  if (body.confirmation !== "ATTIVA 2026") throw new ApiError(400, "Conferma esplicita richiesta.");
  const client = await userClient(); const { data, error } = await client.rpc("activate_current_edition", { p_confirmation: body.confirmation });
  if (error) rpcFailure(error); return json(parseEdition(data));
});
export const PATCH = api(async (req: Request) => {
  await requireAdmin(); const body = await readBody(req); onlyFields(body, ["open", "closesAt"]);
  if (typeof body.open !== "boolean" || (body.closesAt !== null && (typeof body.closesAt !== "string" || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(body.closesAt) || !Number.isFinite(Date.parse(body.closesAt))))) throw new ApiError(400, "Configurazione iscrizioni non valida.");
  const client = await userClient(); const { data, error } = await client.rpc("configure_registration", { p_open: body.open, p_closes_at: body.closesAt });
  if (error) rpcFailure(error); return json(parseAdminEdition(data));
});
