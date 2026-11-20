"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { AVATARS, parseAccount, type Account, type EditionStatus } from "@/lib/identity-contracts";
import { logout, notifyAuthChanged, requestJson } from "@/lib/clientApi";
export default function ProfileEditor({ initialAccount, edition }: { initialAccount: Account; edition: EditionStatus }) {
  const [account, setAccount] = useState(initialAccount); const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState("");
  const [avatarId, setAvatarId] = useState(account.profile?.avatarId ?? "santa");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(""); const router = useRouter();
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setSaved("");
    try {
      const updated = await requestJson("/api/profile", parseAccount, { method: account.profile ? "PATCH" : "POST", body: JSON.stringify(account.profile ? { avatarId } : { firstName, lastName, avatarId }) });
      setAccount(updated); setSaved("Profilo salvato."); notifyAuthChanged();
    } catch (error) { setError(error instanceof Error ? error.message : "Salvataggio non riuscito."); } finally { setBusy(false); }
  }
  async function join() {
    if (busy) return; setBusy(true); setError(""); setSaved("");
    try { setAccount(await requestJson("/api/enrollment", parseAccount, { method: "POST", body: "{}" })); setSaved("Iscrizione al 2026 confermata."); }
    catch (error) { setError(error instanceof Error ? error.message : "Iscrizione non riuscita."); } finally { setBusy(false); }
  }
  async function exit() {
    setBusy(true); setError(""); try { await logout(); router.replace("/login"); router.refresh(); }
    catch { setError("Logout non riuscito. Riprova."); setBusy(false); }
  }
  return <Stack spacing={3}>
    <Typography>Email verificata: {account.email}</Typography>
    <Stack component="form" spacing={2} onSubmit={save}>
      {account.profile ? <><Typography>{account.profile.firstName} {account.profile.lastName}</Typography><Typography variant="body2">Per correggere nome e cognome contatta un amministratore.</Typography></> : <><Typography>Completa il profilo. Dopo il primo salvataggio potrai modificare soltanto l’avatar.</Typography>
        <TextField required label="Nome" autoComplete="given-name" value={firstName} onChange={event => setFirstName(event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 80 } }} />
        <TextField required label="Cognome" autoComplete="family-name" value={lastName} onChange={event => setLastName(event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 80 } }} /></>}
      <TextField select label="Avatar" value={avatarId} onChange={event => { const avatar = AVATARS.find(avatar => avatar.id === event.target.value); if (avatar) setAvatarId(avatar.id); }} disabled={busy}>
        {AVATARS.map(avatar => <MenuItem key={avatar.id} value={avatar.id}>{avatar.symbol} {avatar.label}</MenuItem>)}
      </TextField><Button variant="contained" type="submit" disabled={busy}>Salva profilo</Button>
    </Stack>
    {account.participating ? <Alert severity="success">Sei iscritto all’edizione 2026.</Alert> : <><Alert severity="info">{edition.registrationsOpen ? "Iscrizioni aperte. Conferma la tua partecipazione." : "Iscrizioni chiuse. Il tuo account resta accessibile."}</Alert><Button onClick={join} disabled={busy || !account.profile || !edition.registrationsOpen}>Iscriviti al 2026</Button></>}
    {!edition.active && <Typography>La partita ufficiale non è ancora attiva.</Typography>}
    {saved && <Alert severity="success" role="status">{saved}</Alert>}{error && <Alert severity="error">{error}</Alert>}
    {account.isAdmin && <Link href="/admin">Amministrazione 2026</Link>}<Button disabled={busy} onClick={exit}>Esci</Button>
  </Stack>;
}
