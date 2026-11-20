import { json } from "@/lib/api";
export async function retiredLegacyRoute() {
  return json({ error: "Flusso 2025 ritirato. Le nuove fasi di gioco 2026 non sono ancora disponibili." }, 410);
}
