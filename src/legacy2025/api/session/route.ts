import { api, json } from "@/lib/api";
import { currentPlayer } from "@/legacy2025/auth";
export const GET = api(async () => json({ player: await currentPlayer() }));
