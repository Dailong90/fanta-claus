"use client";
import EditionFrame from "@/components/EditionFrame";
import { Alert, Button } from "@mui/material";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <EditionFrame title="Servizio non disponibile"><Alert severity="error">Non è stato possibile caricare i dati. Riprova tra poco.</Alert><Button onClick={reset}>Riprova</Button></EditionFrame>;
}
