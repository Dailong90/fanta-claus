import { api, json } from "@/lib/api";
import { currentEdition } from "@/lib/edition";
export const GET = api(async () => json(await currentEdition()));
