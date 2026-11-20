"use client";
import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import type { Participant } from "@/data/participants";
import { VOTE_TYPES, type VoteType } from "@/lib/votes";
import { parseVotesResponse } from "@/lib/contracts";
import { requestJson } from "@/lib/clientApi";
type Votes = Record<VoteType, string | null>;
const empty: Votes = { best_wrapping: null, worst_wrapping: null, most_fitting: null };
const labels: Record<VoteType, string> = { best_wrapping: "Pacco meglio realizzato", worst_wrapping: "Pacco peggio realizzato", most_fitting: "Pacco più azzeccato" };
export default function VotingPanel({ playerId, participants }: { playerId: string; participants: Participant[] }) {
  const [votes, setVotes] = useState<Votes>(empty);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setReady(false); setError(null);
      try {
        const data = await requestJson("/api/votes", parseVotesResponse);
        const next = { ...empty };
        for (const vote of data.votes) {
          if (!VOTE_TYPES.includes(vote.vote_type)) throw new Error("Tipo voto non valido.");
          next[vote.vote_type] = vote.target_owner_id;
        }
        if (!cancelled) { setVotes(next); setReady(true); }
      } catch { if (!cancelled) setError("Impossibile caricare i tuoi voti. Ricarica prima di modificarli."); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load(); return () => { cancelled = true; };
  }, [playerId, reload]);
  const change = async (type: VoteType, target: string) => {
    if (!ready || busy.current || !target) return;
    busy.current = true; setSaving(true); setError(null); setSaved(false);
    try {
      await requestJson("/api/votes", () => undefined, { method: "POST", body: JSON.stringify({ vote_type: type, target_owner_id: target }) });
      setVotes(current => ({ ...current, [type]: target })); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Salvataggio fallito."); }
    finally { busy.current = false; setSaving(false); }
  };
  return <Box sx={{ mt: 3, mb: 4 }}>
    <Typography variant="h5">Vota i pacchi!</Typography>
    <Typography variant="body2" sx={{ mb: 2 }}>Scegli i pacchi per i tre premi. Non puoi votare te stesso. Il voto può essere sostituito durante la finestra di votazione.</Typography>
    {error && <Alert severity="error" action={<Button onClick={() => setReload(value => value + 1)}>Ricarica</Button>}>{error}</Alert>}
    <Typography role="status">{loading ? "Caricamento voti..." : saving ? "Salvataggio..." : saved ? "Voto salvato." : ""}</Typography>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
      {VOTE_TYPES.map(type => <FormControl key={type} fullWidth size="small">
        <InputLabel id={`vote-${type}`}>{labels[type]}</InputLabel>
        <Select labelId={`vote-${type}`} label={labels[type]} value={votes[type] ?? ""} disabled={!ready || saving || loading} onChange={event => void change(type, event.target.value)}>
          <MenuItem value="" disabled><em>Seleziona un partecipante</em></MenuItem>
          {participants.filter(person => person.id !== playerId).map(person => <MenuItem key={person.id} value={person.id}>{person.name}</MenuItem>)}
        </Select>
      </FormControl>)}
    </Box>
  </Box>;
}
