// src/app/api/admin/reset-game/route.ts
import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

/**
 * Reset dati di gioco:
 * - cancella tutte le squadre (tabella `teams`)
 * - cancella tutti i voti sui pacchi (tabella `package_votes`)
 *
 * NON tocca:
 * - profili / players
 * - impostazioni di gioco (game_settings)
 * - categorie, regali, ecc.
 */
export async function POST() {
  try {
    // 1) Cancello tutte le squadre
    //    WHERE owner_id IS NOT NULL serve solo per avere una WHERE clause
    const { error: teamsError } = await supabaseAdmin
      .from("teams")
      .delete()
      .not("owner_id", "is", null);

    if (teamsError) {
      console.error("❌ Errore pulizia tabella teams", teamsError);
      return NextResponse.json(
        { error: "Errore pulizia tabella teams" },
        { status: 500 }
      );
    }

    // 2) Cancello tutti i voti sui pacchi
    //    stessa logica: WHERE voter_owner_id IS NOT NULL
    const { error: votesError } = await supabaseAdmin
      .from("package_votes")
      .delete()
      .not("voter_owner_id", "is", null);

    if (votesError) {
      console.error("❌ Errore pulizia tabella package_votes", votesError);
      return NextResponse.json(
        { error: "Errore pulizia tabella package_votes" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          "Reset completato: squadre (teams) e voti (package_votes) sono stati azzerati.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Errore inatteso in reset-game", err);
    return NextResponse.json(
      { error: "Errore inatteso durante il reset dei dati di gioco." },
      { status: 500 }
    );
  }
}
