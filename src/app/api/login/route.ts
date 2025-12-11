import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { createSessionCookie } from "@/lib/session";

type PlayerRow = {
  owner_id: string;
  access_code: string;
  display_name: string | null;
  is_admin: boolean;
};

// POST /api/login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = (body.code ?? "").toString().trim();

    if (!rawCode) {
      return NextResponse.json(
        { ok: false, error: "Codice obbligatorio." },
        { status: 400 }
      );
    }

    // Normalizziamo il codice (es. maiuscolo)
    const code = rawCode.toUpperCase();

    const { data, error } = await supabaseAdmin
      .from("players")
      .select("owner_id, display_name, is_admin")
      .eq("access_code", code)
      .maybeSingle<PlayerRow>();

    if (error) {
      console.error("❌ Errore Supabase /api/login", error);
      return NextResponse.json(
        { ok: false, error: "Errore interno, riprova tra poco." },
        { status: 500 }
      );
    }

    if (!data) {
      // Codice non valido
      return NextResponse.json(
        { ok: false, error: "Codice non valido." },
        { status: 401 }
      );
    }

    // 👉 crea il cookie di sessione
    const sessionCookie = await createSessionCookie(data.owner_id);

    const res = NextResponse.json({
      ok: true,
      playerId: data.owner_id,
      name: data.display_name ?? data.owner_id,
      isAdmin: !!data.is_admin,
    });

    res.cookies.set(sessionCookie);

    return res;
  } catch (err) {
    console.error("❌ Eccezione /api/login", err);
    return NextResponse.json(
      { ok: false, error: "Errore interno, riprova tra poco." },
      { status: 500 }
    );
  }
}
