import { api, json } from "@/lib/api";
import { loadAwards } from "@/lib/awards";
export const GET = api(async () => json(await loadAwards()));
