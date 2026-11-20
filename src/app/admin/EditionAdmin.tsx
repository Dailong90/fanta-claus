"use client";
import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { requestJson } from "@/lib/clientApi";
import { parseEdition, parseAdminEdition, type AdminEdition, type Participant } from "@/lib/identity-contracts";
export default function EditionAdmin({ initialEdition, initialParticipants }: { initialEdition: AdminEdition; initialParticipants: Participant[] }) {
  const [edition, setEdition] = useState(initialEdition); const [confirmation, setConfirmation] = useState(""); const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function mutate(method: "POST" | "PATCH", body: unknown) {
    if (busy) return; setBusy(true); setMessage(""); setError("");
    try {
      if (method === "POST") { const status = await requestJson("/api/admin/edition", parseEdition, { method, body: JSON.stringify(body) }); setEdition(current => ({ ...current, ...status })); }
      else setEdition(await requestJson("/api/admin/edition", parseAdminEdition, { method, body: JSON.stringify(body) }));
      setMessage("Configurazione salvata.");
    }
    catch (error) { setError(error instanceof Error ? error.message : "Salvataggio non riuscito."); } finally { setBusy(false); }
  }
  return <Stack spacing={3}>
    <Alert severity={edition.active ? "success" : "info"}>{edition.active ? "Edizione 2026 attivata." : "Edizione 2026 inattiva. Attivare soltanto dopo il collaudo."}</Alert>
    {!edition.active && <Stack component="form" spacing={2} onSubmit={event => { event.preventDefault(); void mutate("POST", { confirmation }); }}>
      <TextField label="Scrivi ATTIVA 2026 per confermare" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} />
      <Button type="submit" disabled={busy || confirmation !== "ATTIVA 2026"}>Attiva manualmente l’edizione 2026</Button>
    </Stack>}
    <Typography>Iscrizioni: {edition.registrationsOpen ? "aperte" : "chiuse"}. L’accesso degli account esistenti resta disponibile.</Typography>
    <Typography>Chiusura configurata (UTC): {edition.closesAt ? new Date(edition.closesAt).toISOString() : "nessuna"}.</Typography>
    {edition.locked && <Alert severity="info">Nuove iscrizioni bloccate definitivamente per questa partita.</Alert>}
    <Stack component="form" spacing={2} onSubmit={event => { event.preventDefault(); if (deadline && Number.isFinite(Date.parse(deadline))) void mutate("PATCH", { open: true, closesAt: new Date(deadline).toISOString() }); }}>
      <TextField required type="datetime-local" label="Nuova chiusura iscrizioni (ora del dispositivo)" value={deadline} onChange={event => setDeadline(event.target.value)} disabled={busy || !edition.active} slotProps={{ inputLabel: { shrink: true } }} />
      <Button type="submit" disabled={busy || !edition.active || !deadline || edition.locked}>Apri / aggiorna le iscrizioni</Button>
      <Button onClick={() => void mutate("PATCH", { open: false, closesAt: null })} disabled={busy}>Chiudi le iscrizioni</Button>
    </Stack>
    {message && <Alert severity="success" role="status">{message}</Alert>}{error && <Alert severity="error">{error}</Alert>}
    <Typography component="h2" variant="h6">Partecipanti iscritti al 2026</Typography>
    {initialParticipants.length === 0 && <Typography>Nessun partecipante iscritto.</Typography>}
    {initialParticipants.map(participant => <NameCorrection key={participant.userId} participant={participant} />)}
    <Typography variant="body2">Il ruolo è limitato al 2026. Le assegnazioni Secret Santa non sono accessibili dal pannello. Squadre, sorteggio, voti e classifica saranno introdotti nei blocchi successivi.</Typography>
  </Stack>;
}
function NameCorrection({ participant }: { participant: Participant }) {
  const [firstName, setFirstName] = useState(participant.firstName); const [lastName, setLastName] = useState(participant.lastName);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { await requestJson("/api/admin/participants", () => undefined, { method: "PATCH", body: JSON.stringify({ userId: participant.userId, firstName, lastName }) }); setMessage("Nome corretto."); }
    catch (error) { setError(error instanceof Error ? error.message : "Correzione non riuscita."); } finally { setBusy(false); }
  }
  return <Stack component="form" spacing={1} onSubmit={submit}>
    <TextField label={`Nome di ${participant.firstName} ${participant.lastName}`} required value={firstName} onChange={event => setFirstName(event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 80 } }} />
    <TextField label={`Cognome di ${participant.firstName} ${participant.lastName}`} required value={lastName} onChange={event => setLastName(event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 80 } }} />
    <Button type="submit" disabled={busy}>Correggi nome e cognome</Button>{message && <Alert role="status" severity="success">{message}</Alert>}{error && <Alert severity="error">{error}</Alert>}
  </Stack>;
}
