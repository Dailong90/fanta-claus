import { api, json } from "@/lib/api";
import supabaseAdmin from "@/lib/supabaseAdmin";

const TABLE_NAME = "gift_categories";

export const GET = api(async () => {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select("id, code, label, points")
    .order("points", { ascending: false })
    .order("label", { ascending: true });

  if (error) {
    return json(
      { error: "Errore lettura categorie" },
      500
    );
  }

  return json({ categories: data ?? [] }, 200);
});
