import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session";
import supabaseAdmin from "@/lib/supabaseAdmin";

type GiftRow = {
  santa_owner_id: string;
  receiver_owner_id: string | null;
  category_id: string;
  bonus_points: number;
};

type PlayerRow = {
  owner_id: string;
  is_admin: boolean;
};

async function ensureAdmin() {
  const session = await getSessionFromCookies();
  if (!session) {
    return { ok: false as const, reason: "no-session" };
  }

  const { data: me, error } = await supabaseAdmin
    .from("players")
    .select("owner_id, is_admin")
    .eq("owner_id", session.ownerId)
    .maybeSingle<PlayerRow>();

  if (error || !me || !me.is_admin) {
    return { ok: false as const, reason: "not-admin" };
  }

  return { ok: true as const, admin: me };
}

// GET /api/admin/gifts → restituisce tutti i regali (per admin UI)
export async function GET() {
  const check = await ensureAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("gifts")
    .select("santa_owner_id, receiver_owner_id, category_id, bonus_points");

  if (error) {
    console.error("❌ Errore GET /api/admin/gifts", error);
    return NextResponse.json(
      { error: "Errore caricamento gifts" },
      { status: 500 }
    );
  }

  return NextResponse.json({ gifts: data ?? [] });
}

// POST /api/admin/gifts
// body: { santa_owner_id, category_id, bonus_points?, receiver_owner_id? }
export async function POST(req: NextRequest) {
  const check = await ensureAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const santa_owner_id = String(body.santa_owner_id ?? "").trim();
    const category_id = String(body.category_id ?? "").trim();
    const bonus_points_raw = body.bonus_points;
    const receiver_owner_id_raw = body.receiver_owner_id;

    if (!santa_owner_id || !category_id) {
      return NextResponse.json(
        { error: "santa_owner_id e category_id sono obbligatori" },
        { status: 400 }
      );
    }

    const bonus_points = Number.isFinite(Number(bonus_points_raw))
      ? Number(bonus_points_raw)
      : 0;

    const receiver_owner_id =
      receiver_owner_id_raw && String(receiver_owner_id_raw).trim().length > 0
        ? String(receiver_owner_id_raw).trim()
        : null;

    const payload: GiftRow = {
      santa_owner_id,
      receiver_owner_id,
      category_id,
      bonus_points,
    };

    const { error } = await supabaseAdmin
      .from("gifts")
      .upsert(payload, { onConflict: "santa_owner_id" }); // 1 regalo per santa

    if (error) {
      console.error("❌ Errore POST /api/admin/gifts", error);
      return NextResponse.json(
        { error: "Errore salvataggio gift" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Eccezione POST /api/admin/gifts", err);
    return NextResponse.json(
      { error: "Errore interno" },
      { status: 500 }
    );
  }
}
