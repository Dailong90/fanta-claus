import { api, json } from "@/lib/api";
import { currentPlayer } from "@/lib/auth";
export const GET = api(async () => json({ player: await currentPlayer() }));
