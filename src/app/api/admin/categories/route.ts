import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

const TABLE_NAME = "gift_categories";

type CategoryPayload = {
  id?: string;
  code: string;
  label: string;
  points: number;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CategoryPayload;

  const { code, label, points } = body;

  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .insert({ code, label, points })
    .select()
    .single();

  if (error) {
    console.error("❌ Errore creazione categoria", error);
    return NextResponse.json(
      { error: "Errore creazione categoria" },
      { status: 500 }
    );
  }

  return NextResponse.json({ category: data }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as CategoryPayload;

  if (!body.id) {
    return NextResponse.json(
      { error: "ID categoria mancante" },
      { status: 400 }
    );
  }

  const { id, code, label, points } = body;

  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .update({ code, label, points })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ Errore aggiornamento categoria", error);
    return NextResponse.json(
      { error: "Errore aggiornamento categoria" },
      { status: 500 }
    );
  }

  return NextResponse.json({ category: data }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID categoria mancante" },
      { status: 400 }
    );
  }

  // 🔍 Controllo se la categoria è usata in almeno un regalo
  const { data: usedGifts, error: giftsError } = await supabaseAdmin
    .from("gifts")
    .select("id")
    .eq("category_id", id)
    .limit(1);

  if (giftsError) {
    console.error("❌ Errore controllo dipendenze gifts", giftsError);
    return NextResponse.json(
      { error: "Errore nel controllo dei regali collegati" },
      { status: 500 }
    );
  }

  if (usedGifts && usedGifts.length > 0) {
    // categoria in uso → blocco cancellazione
    return NextResponse.json(
      {
        error:
          "Non puoi eliminare questa categoria perché è già stata usata in almeno un regalo.",
      },
      { status: 409 }
    );
  }

  // ✅ nessun regalo collegato → posso cancellare
  const { error } = await supabaseAdmin
    .from(TABLE_NAME)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ Errore eliminazione categoria", error);
    return NextResponse.json(
      { error: "Errore eliminazione categoria" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

