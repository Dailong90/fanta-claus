import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

type PublishRequest = {
  published: boolean;
};

type GameSettingRow = {
  key: string;
  value: { published: boolean };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PublishRequest;

    // Validazione
    if (typeof body.published !== "boolean") {
      return NextResponse.json(
        { error: "Campo 'published' mancante o non valido." },
        { status: 400 }
      );
    }

    // Aggiorna o crea la voce nelle impostazioni di gioco
    const { error } = await supabaseAdmin
      .from("game_settings")
      .upsert({
        key: "leaderboard_published",
        value: { published: body.published },
      } satisfies GameSettingRow);

    if (error) {
      return NextResponse.json(
        { error: "Errore aggiornamento impostazione classifica." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      published: body.published,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Errore sconosciuto";

    return NextResponse.json(
      { error: "Errore di parsing richiesta: " + message },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("game_settings")
      .select("key, value")
      .eq("key", "leaderboard_published")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Errore lettura stato pubblicazione." },
        { status: 500 }
      );
    }

    const published =
      data?.value?.published === true ? true : false;

    return NextResponse.json({ published });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Errore sconosciuto";

    return NextResponse.json(
      { error: "Errore recupero stato: " + message },
      { status: 500 }
    );
  }
}
