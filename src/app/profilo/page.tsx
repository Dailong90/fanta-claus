import { redirect } from "next/navigation";
import ProfiloClientShell from "./ProfiloClientShell";
import { getSessionFromCookies } from "@/lib/session";

export default async function ProfiloPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    // Nessuna sessione → vai alla login
    redirect("/login");
  }

  const playerId = session.ownerId;

  return <ProfiloClientShell playerId={playerId} />;
}
