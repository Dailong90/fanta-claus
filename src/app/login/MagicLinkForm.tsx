"use client";
import { useState } from "react";
import { Alert, Button, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from "@mui/material";
import { requestJson } from "@/lib/clientApi";
import { isObject } from "@/lib/contracts";
export default function MagicLinkForm({ registrationsOpen, invalidLink }: { registrationsOpen: boolean; invalidLink: boolean }) {
  const [email, setEmail] = useState(""); const [intent, setIntent] = useState("login");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState(invalidLink ? "Link scaduto, già utilizzato o non valido. Richiedi un nuovo link." : "");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage(""); setError("");
    try {
      const message = await requestJson("/api/auth/magic-link", value => {
        if (!isObject(value) || value.ok !== true || typeof value.message !== "string") throw new Error("Risposta non valida."); return value.message;
      }, { method: "POST", body: JSON.stringify({ email, intent }) }); setMessage(message);
    } catch (error) { setError(error instanceof Error ? error.message : "Invio non riuscito."); }
    finally { setBusy(false); }
  }
  return <Stack component="form" onSubmit={submit} spacing={2}>
    <Typography>Nessuna password: ti invieremo un link per verificare l’email e accedere.</Typography>
    <RadioGroup aria-label="Tipo di accesso" value={intent} onChange={event => setIntent(event.target.value)}>
      <FormControlLabel value="login" control={<Radio disabled={busy} />} label="Ho già un account" />
      <FormControlLabel value="register" control={<Radio disabled={busy || !registrationsOpen} />} label="Crea un nuovo account" />
    </RadioGroup>
    {!registrationsOpen && <Alert severity="info">Le nuove iscrizioni sono chiuse. L’accesso agli account esistenti resta disponibile.</Alert>}
    <TextField type="email" label="Email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 254 } }} />
    <Button type="submit" variant="contained" disabled={busy}>{busy ? "Invio in corso…" : "Invia link di accesso"}</Button>
    {message && <Alert severity="success" role="status">{message}</Alert>}{error && <Alert severity="error">{error}</Alert>}
    <Typography variant="body2">La creazione dell’account e l’iscrizione al 2026 sono due passaggi distinti. Completa il profilo e conferma l’iscrizione dopo l’accesso.</Typography>
  </Stack>;
}
