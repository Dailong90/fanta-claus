import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

const TABLE_NAME = "gift_categories";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select("id, code, label, points")
    .order("points", { ascending: false })
    .order("label", { ascending: true });

  if (error) {
    console.error("❌ Errore lettura categorie", error);
    return NextResponse.json(
      { error: "Errore lettura categorie" },
      { status: 500 }
    );
  }

  return NextResponse.json({ categories: data ?? [] }, { status: 200 });
}
