import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { participants } from "@/data/participants";

type VoteType = "best_wrapping" | "worst_wrapping" | "most_fitting";

type AwardWinner = {
  ownerId: string;
  ownerName: string;
  votes: number;
};

type AwardsSummary = {
  best_wrapping: AwardWinner[];
  worst_wrapping: AwardWinner[];
  most_fitting: AwardWinner[];
};

// 🔹 ricava il nome del partecipante da participants.ts
function findParticipantName(ownerId: string): string {
  const list = participants as { id: string; name: string }[];
  const p = list.find((pt) => pt.id === ownerId);
  return p?.name ?? "Partecipante sconosciuto";
}

export async function GET() {
  // leggiamo TUTTI i voti dalla tabella package_votes
  const { data, error } = await supabaseAdmin
    .from("package_votes")
    .select("target_owner_id, vote_type");

  if (error) {
    console.error("❌ Errore lettura voti speciali", error);
    return NextResponse.json(
      { error: "Errore lettura voti speciali" },
      { status: 500 }
    );
  }

  const rows =
    (data as { target_owner_id: string; vote_type: VoteType }[]) ?? [];

  // counts[category][ownerId] = numero voti
  const counts: Record<VoteType, Record<string, number>> = {
    best_wrapping: {},
    worst_wrapping: {},
    most_fitting: {},
  };

  for (const row of rows) {
    const cat = row.vote_type;
    const ownerId = row.target_owner_id;
    if (!cat || !ownerId) continue;

    if (!counts[cat]) counts[cat] = {};
    counts[cat][ownerId] = (counts[cat][ownerId] ?? 0) + 1;
  }

  function pickWinners(cat: VoteType): AwardWinner[] {
    const byOwner = counts[cat];
    const entries = Object.entries(byOwner);
    if (entries.length === 0) return [];

    // Trova il numero massimo di voti
    let maxVotes = 0;
    for (const [, v] of entries) {
      if (v > maxVotes) maxVotes = v;
    }

    if (maxVotes === 0) return [];

    // Prendi TUTTI quelli che hanno maxVotes
    const winners: AwardWinner[] = entries
      .filter(([, v]) => v === maxVotes)
      .map(([ownerId, v]) => ({
        ownerId,
        ownerName: findParticipantName(ownerId),
        votes: v,
      }));

    return winners;
  }

  const result: AwardsSummary = {
    best_wrapping: pickWinners("best_wrapping"),
    worst_wrapping: pickWinners("worst_wrapping"),
    most_fitting: pickWinners("most_fitting"),
  };

  return NextResponse.json(result, { status: 200 });
}
