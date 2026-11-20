"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { notifyAuthChanged, requestJson } from "@/lib/clientApi";
export default function ConfirmLink({ tokenHash }: { tokenHash: string | null }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  async function confirm() {
    if (!tokenHash || busy) return; setBusy(true); setError(""); window.history.replaceState(null, "", "/auth/confirm");
    try {
      await requestJson("/api/auth/confirm", () => undefined, { method: "POST", body: JSON.stringify({ tokenHash }) });
      notifyAuthChanged(); router.replace("/profilo"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Accesso non riuscito."); setBusy(false); }
  }
  return <Stack spacing={2}>
    {tokenHash ? <><Typography>Prosegui soltanto se hai richiesto tu questo link. Il link può essere utilizzato una sola volta.</Typography><Button variant="contained" disabled={busy} onClick={confirm}>{busy ? "Accesso in corso…" : "Conferma e accedi"}</Button></> : <Alert severity="error">Link scaduto o non valido.</Alert>}
    {error && <Alert severity="error">{error}</Alert>}<Link href="/login">Richiedi un nuovo link</Link>
  </Stack>;
}
