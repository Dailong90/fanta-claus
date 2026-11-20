import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { currentEdition } from "@/lib/edition";
import EditionFrame from "@/components/EditionFrame";
import ProfileEditor from "./ProfileEditor";
export default async function ProfiloPage() {
  const account = await currentAccount(); if (!account) redirect("/login");
  return <EditionFrame title="Il tuo profilo"><ProfileEditor initialAccount={account} edition={await currentEdition()} /></EditionFrame>;
}
