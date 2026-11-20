import EditionFrame from "@/components/EditionFrame";
import MagicLinkForm from "./MagicLinkForm";
import { currentEdition } from "@/lib/edition";
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const edition = await currentEdition(); const params = await searchParams;
  return <EditionFrame title="Accedi con la tua email"><MagicLinkForm registrationsOpen={edition.registrationsOpen} invalidLink={params.error === "invalid_link"} /></EditionFrame>;
}
