import { redirect } from "next/navigation";
import EditionFrame from "@/components/EditionFrame";
import ConfirmLink from "./ConfirmLink";
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  if (typeof params.code === "string" && !params.next) redirect(`/auth/callback?code=${encodeURIComponent(params.code)}`);
  const token = typeof params.token_hash === "string" && /^[a-zA-Z0-9_-]{1,512}$/.test(params.token_hash) && !params.next && !params.error ? params.token_hash : null;
  return <EditionFrame title="Conferma l'accesso"><ConfirmLink tokenHash={token} /></EditionFrame>;
}
