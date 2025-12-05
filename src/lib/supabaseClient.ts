// src/lib/supabaseClient.ts  (o il tuo path attuale)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // Questo log lo vedi in console del browser (build dev) o server (build prod)
  console.error(
    "[Supabase] Env mancanti",
    { supabaseUrl, supabaseAnonKeyPresent: !!supabaseAnonKey }
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
