import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

const CAPTAIN_MULTIPLIER = 2;

type TeamRow = {
  owner_id: string;
  members: string[] | null;
  captain_id: string | null;
};

type GiftRow = {
  santa_owner_id: string;
  category_id: string;
  bonus_points: number;
};

type CategoryRow = {
  id: string;
  points: number;
};

type MemberScore = {
  id: string;
  name: string;
  points: number;
  isCaptain: boolean;
};

type TeamScore = {
  ownerId: string;
  ownerName: string;
  totalPoints: number;
  members: MemberScore[];
};

export async function GET() {
  // 1) Squadre
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("owner_id, members, captain_id");

  if (teamsError || !teams) {
    console.error("❌ Errore lettura teams", teamsError);
    return NextResponse.json(
      { error: "Errore caricamento teams" },
      { status: 500 }
    );
  }

  // 2) Giocatori
  const { data: players, error: playersError } = await supabaseAdmin
    .from("players")
    .select("owner_id, name");

  if (playersError || !players) {
    console.error("❌ Errore lettura players", playersError);
    return NextResponse.json(
      { error: "Errore caricamento players" },
      { status: 500 }
    );
  }

  // 3) Regali
  const { data: gifts, error: giftsError } = await supabaseAdmin
    .from("gifts")
    .select("santa_owner_id, category_id, bonus_points");

  if (giftsError || !gifts) {
    console.error("❌ Errore lettura gifts", giftsError);
    return NextResponse.json(
      { error: "Errore caricamento gifts" },
      { status: 500 }
    );
  }

  // 4) Categorie
  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("gift_categories")
    .select("id, points");

  if (categoriesError || !categories) {
    console.error("❌ Errore lettura gift_categories", categoriesError);
    return NextResponse.json(
      { error: "Errore caricamento categorie" },
      { status: 500 }
    );
  }

  // Mappe di appoggio
  const playerNameMap = new Map<string, string>();
  players.forEach((p) => {
    playerNameMap.set(p.owner_id, p.name ?? p.owner_id);
  });

  const categoryPointsMap = new Map<string, number>();
  (categories as CategoryRow[]).forEach((c) => {
    categoryPointsMap.set(c.id, c.points);
  });

  // Punti per ogni "santa" (chi fa il regalo)
  const giftScoreBySanta = new Map<string, number>();
  (gifts as GiftRow[]).forEach((g) => {
    const base = categoryPointsMap.get(g.category_id) ?? 0;
    const total = base + (g.bonus_points ?? 0);
    giftScoreBySanta.set(g.santa_owner_id, total);
  });

  // Calcolo punteggio squadra
  const leaderboard: TeamScore[] = (teams as TeamRow[])
    .map<TeamScore | null>((t) => {
      const members = t.members ?? [];
      if (!Array.isArray(members) || members.length === 0) {
        return null; // squadra vuota → la saltiamo
      }

      const captainId = t.captain_id ?? null;

      const membersDetailed: MemberScore[] = members.map((mid) => {
        const basePts = giftScoreBySanta.get(mid) ?? 0;
        const isCaptain = captainId === mid;
        const pts = isCaptain ? basePts * CAPTAIN_MULTIPLIER : basePts;

        return {
          id: mid,
          name: playerNameMap.get(mid) ?? mid,
          points: pts,
          isCaptain,
        };
      });

      const totalPoints = membersDetailed.reduce(
        (sum, m) => sum + m.points,
        0
      );

      return {
        ownerId: t.owner_id,
        ownerName: playerNameMap.get(t.owner_id) ?? t.owner_id,
        totalPoints,
        members: membersDetailed,
      };
    })
    // rimuove i null in modo tip-safe
    .filter((team): team is TeamScore => team !== null)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json({ teams: leaderboard });
}
