import { api, json } from "@/lib/api";
import { requireAdmin } from "@/legacy2025/auth";
import { loadLeaderboard } from "@/lib/leaderboard";
export const GET = api(async (req: Request) => {
  const preview = new URL(req.url).searchParams.get("preview") === "1";
  if (preview) await requireAdmin();
  return json(await loadLeaderboard(preview));
});
