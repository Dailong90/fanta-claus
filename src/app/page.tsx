import Link from "next/link";
import EditionFrame from "@/components/EditionFrame";
import { currentEdition } from "@/lib/edition";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const edition = await currentEdition();
  return <EditionFrame title="Il Natale torna in gioco">
    <p>{edition.active ? "Edizione 2026 attivata." : "Stiamo preparando l'edizione 2026. La partita ufficiale non è ancora attiva."}</p>
    <p>{edition.registrationsOpen ? "Le iscrizioni sono aperte: crea un account e iscriviti dal profilo." : "Le nuove iscrizioni sono chiuse. Se hai già un account puoi sempre accedere."}</p>
    <p><Link href="/login">Accedi con la tua email</Link></p><p><Link href="/profilo">Vai al profilo</Link></p>
    <p>Le fasi di gioco saranno disponibili dopo la preparazione e il collaudo.</p>
  </EditionFrame>;
}
