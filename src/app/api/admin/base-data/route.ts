import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session";
import supabaseAdmin from "@/lib/supabaseAdmin";

type PlayerRow = {
  owner_id: string;
  name: string | null;
  is_admin: boolean;
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Recupero me stesso e verifico is_admin
  const { data: me, error: meError } = await supabaseAdmin
    .from("players")
    .select("owner_id, name, is_admin")
    .eq("owner_id", session.ownerId)
    .maybeSingle<PlayerRow>();

  if (meError || !me || !me.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Tutti i giocatori
  const { data: players, error: playersError } = await supabaseAdmin
    .from("players")
    .select("owner_id, name")
    .order("name", { ascending: true });

  if (playersError || !players) {
    return NextResponse.json(
      { error: "Errore caricamento players" },
      { status: 500 }
    );
  }

  // Tutte le categorie
  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("gift_categories")
    .select("id, code, label, points")
    .order("points", { ascending: false });

  if (categoriesError || !categories) {
    return NextResponse.json(
      { error: "Errore caricamento categorie" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    currentAdminName: me.name ?? me.owner_id,
    players,
    categories,
  });
}
