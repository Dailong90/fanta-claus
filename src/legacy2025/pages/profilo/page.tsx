import { redirect } from "next/navigation";
import ProfiloClientShell from "@/app/profilo/ProfiloClientShell";
import { currentPlayer } from "@/legacy2025/auth";
export default async function ProfiloPage() {
  const player = await currentPlayer();
  if (!player) redirect("/login");
  return <ProfiloClientShell playerId={player.ownerId} initialName={player.name} initialIsAdmin={player.isAdmin} />;
}
