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
  // 🔓 ADMIN: vediamo SEMPRE i voti, anche se non pubblicati
  const { data, error } = await supabaseAdmin
    .from("package_votes")
    .select("target_owner_id, vote_type");

  if (error) {
    console.error("❌ Errore lettura voti speciali (admin)", error);
    return NextResponse.json(
      { error: "Errore lettura voti speciali" },
      { status: 500 }
    );
  }

  const rows =
    (data as { target_owner_id: string; vote_type: VoteType }[]) ?? [];

  const counts: Record<VoteType, Record<string, number>> = {
    best_wrapping: {},
    worst_wrapping: {},
    most_fitting: {},
  };

  for (const row of rows) {
    const cat = row.vote_type;
    const ownerId = row.target_owner_id;
    if (!cat || !ownerId) continue;

    counts[cat][ownerId] = (counts[cat][ownerId] ?? 0) + 1;
  }

  function pickWinners(cat: VoteType): AwardWinner[] {
    const entries = Object.entries(counts[cat]); // [ownerId, votes]
    if (entries.length === 0) return [];

    let maxVotes = 0;
    for (const [, v] of entries) {
      if (v > maxVotes) maxVotes = v;
    }
    if (maxVotes === 0) return [];

    return entries
      .filter(([, v]) => v === maxVotes)
      .map(([ownerId, v]) => ({
        ownerId,
        ownerName: findParticipantName(ownerId),
        votes: v,
      }));
  }

  const result: AwardsSummary = {
    best_wrapping: pickWinners("best_wrapping"),
    worst_wrapping: pickWinners("worst_wrapping"),
    most_fitting: pickWinners("most_fitting"),
  };

  return NextResponse.json(result, { status: 200 });
}
