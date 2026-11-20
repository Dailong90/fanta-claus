import { api, json } from "@/lib/api";
import { requireAdmin } from "@/legacy2025/auth";
import { loadAwards } from "@/lib/awards";
export const GET = api(async () => { await requireAdmin(); return json(await loadAwards(true)); });
