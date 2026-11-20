import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { rpcFailure } from "@/lib/edition";
import { userClient } from "@/lib/supabase/server";
import { parseParticipants, parseAdminEdition } from "@/lib/identity-contracts";
import EditionFrame from "@/components/EditionFrame";
import EditionAdmin from "./EditionAdmin";
export default async function AdminPage() {
  const account = await currentAccount(); if (!account) redirect("/login"); if (!account.isAdmin) redirect("/profilo");
  const client = await userClient(); const { data, error } = await client.rpc("admin_participants"); if (error) rpcFailure(error);
  const registration = await client.rpc("admin_registration"); if (registration.error) rpcFailure(registration.error);
  return <EditionFrame title="Amministrazione"><EditionAdmin initialEdition={parseAdminEdition(registration.data)} initialParticipants={parseParticipants(data)} /></EditionFrame>;
}
