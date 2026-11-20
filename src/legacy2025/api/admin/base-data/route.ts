import { json } from "@/lib/api";
import { requireAdmin } from "@/legacy2025/auth";
import { api } from "@/lib/api";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const GET = api(async () => {
  const me = await requireAdmin();

  // Tutti i giocatori
  const { data: players, error: playersError } = await supabaseAdmin
    .from("players")
    .select("owner_id, name")
    .order("name", { ascending: true });

  if (playersError || !players) {
    return json(
      { error: "Errore caricamento players" },
      500
    );
  }

  // Tutte le categorie
  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("gift_categories")
    .select("id, code, label, points")
    .order("points", { ascending: false });

  if (categoriesError || !categories) {
    return json(
      { error: "Errore caricamento categorie" },
      500
    );
  }

  return json({
    currentAdminName: me.name,
    players,
    categories,
  });
});
