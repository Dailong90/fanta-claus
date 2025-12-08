import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

type VoteType = "best_wrapping" | "worst_wrapping" | "most_fitting";

type VotePayload = {
  voter_owner_id: string;   // chi vota
  target_owner_id: string;  // autore del pacco
  vote_type: VoteType;
};

type VoteRow = {
  voter_owner_id: string;
  target_owner_id: string;
  vote_type: VoteType;
};

// 🔹 Salva / aggiorna un voto
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VotePayload;
    const { voter_owner_id, target_owner_id, vote_type } = body;

    if (!voter_owner_id || !target_owner_id || !vote_type) {
      return NextResponse.json(
        { error: "Dati mancanti" },
        { status: 400 }
      );
    }

    if (voter_owner_id === target_owner_id) {
      return NextResponse.json(
        { error: "Non puoi votare il tuo stesso pacco" },
        { status: 400 }
      );
    }

    if (
      vote_type !== "best_wrapping" &&
      vote_type !== "worst_wrapping" &&
      vote_type !== "most_fitting"
    ) {
      return NextResponse.json(
        { error: "Tipo di voto non valido" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("package_votes")
      .upsert(
        {
          voter_owner_id,
          target_owner_id,
          vote_type,
        },
        {
          onConflict: "voter_owner_id,vote_type",
        }
      );

    if (error) {
      console.error("❌ Errore salvataggio voto", error);
      return NextResponse.json(
        { error: "Errore salvataggio voto" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Errore runtime voto", err);
    return NextResponse.json(
      { error: "Errore inatteso" },
      { status: 500 }
    );
  }
}

// 🔹 Restituisce i voti di un determinato giocatore (voter)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const voterId = url.searchParams.get("voter_owner_id");

    if (!voterId) {
      return NextResponse.json(
        { error: "voter_owner_id mancante" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("package_votes")
      .select("voter_owner_id, target_owner_id, vote_type")
      .eq("voter_owner_id", voterId);

    if (error) {
      console.error("❌ Errore lettura voti", error);
      return NextResponse.json(
        { error: "Errore caricamento voti" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      votes: (data ?? []) as VoteRow[],
    });
  } catch (err) {
    console.error("Errore runtime GET voti", err);
    return NextResponse.json(
      { error: "Errore inatteso" },
      { status: 500 }
    );
  }
}
