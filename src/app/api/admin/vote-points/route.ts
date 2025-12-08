import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

type VoteType = "best_wrapping" | "worst_wrapping" | "most_fitting";

type VotePointsConfig = Record<VoteType, number>;

const DEFAULT_POINTS: VotePointsConfig = {
  best_wrapping: 0,
  worst_wrapping: 0,
  most_fitting: 0,
};

const SETTINGS_KEY = "vote_points";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("game_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle<{ value: VotePointsConfig }>();

  if (error) {
    console.error("❌ Errore lettura vote_points", error);
    return NextResponse.json(
      { votePoints: DEFAULT_POINTS },
      { status: 200 }
    );
  }

  if (!data?.value) {
    return NextResponse.json(
      { votePoints: DEFAULT_POINTS },
      { status: 200 }
    );
  }

  return NextResponse.json({ votePoints: data.value }, { status: 200 });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON non valido" },
      { status: 400 }
    );
  }

  const input = body as Partial<VotePointsConfig>;

  const normalized: VotePointsConfig = {
    best_wrapping: Number(input.best_wrapping ?? 0) || 0,
    worst_wrapping: Number(input.worst_wrapping ?? 0) || 0,
    most_fitting: Number(input.most_fitting ?? 0) || 0,
  };

  const { error } = await supabaseAdmin
    .from("game_settings")
    .upsert(
      {
        key: SETTINGS_KEY,
        value: normalized,
      },
      { onConflict: "key" }
    );

  if (error) {
    console.error("❌ Errore salvataggio vote_points", error);
    return NextResponse.json(
      { error: "Errore salvataggio punti votazioni" },
      { status: 500 }
    );
  }

  return NextResponse.json({ votePoints: normalized }, { status: 200 });
}
