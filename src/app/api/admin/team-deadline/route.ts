// src/app/api/admin/team-deadline/route.ts
import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

const KEY = "team_lock_deadline";

type GameSettingRow = {
  key: string;
  value: {
    deadlineIso?: string | null;
  } | null;
};

type PostBody = {
  deadlineIso: string | null;
};

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("game_settings")
    .select("key, value")
    .eq("key", KEY)
    .maybeSingle<GameSettingRow>();

  if (error && error.code !== "PGRST116") {
    console.error("❌ Errore lettura team_lock_deadline", error);
    return NextResponse.json(
      { error: "Errore lettura termine ultimo" },
      { status: 500 }
    );
  }

  const deadlineIso =
    data?.value && typeof data.value.deadlineIso === "string"
      ? data.value.deadlineIso
      : null;

  return NextResponse.json({ deadlineIso });
}

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json(
      { error: "Body non valido" },
      { status: 400 }
    );
  }

  const { deadlineIso } = body;

  // Se deadlineIso è null → cancello l'impostazione
  if (!deadlineIso) {
    const { error } = await supabaseAdmin
      .from("game_settings")
      .delete()
      .eq("key", KEY);

    if (error) {
      console.error("❌ Errore delete team_lock_deadline", error);
      return NextResponse.json(
        { error: "Errore salvataggio termine ultimo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deadlineIso: null });
  }

  // Salvo / aggiorno
  const { data, error } = await supabaseAdmin
    .from("game_settings")
    .upsert(
      {
        key: KEY,
        value: { deadlineIso },
      },
      { onConflict: "key" }
    )
    .select("key, value")
    .maybeSingle<GameSettingRow>();

  if (error || !data) {
    console.error("❌ Errore upsert team_lock_deadline", error);
    return NextResponse.json(
      { error: "Errore salvataggio termine ultimo" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    deadlineIso: data.value?.deadlineIso ?? null,
  });
}
