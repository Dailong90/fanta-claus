"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from "@mui/material";
import TeamBuilder from "@/components/TeamBuilder";
import type { Participant } from "@/data/participants";
import { participants } from "@/data/participants";
import { supabase } from "@/lib/supabaseClient";
import { fantaPalette } from "@/theme/fantaPalette";

// 🔹 Funzione di utilità per formattare il countdown in italiano
function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "0 secondi";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} giorno${days === 1 ? "" : "i"}`);
  if (hours > 0) parts.push(`${hours} ora${hours === 1 ? "" : "e"}`);
  if (minutes > 0) parts.push(`${minutes} minuto${minutes === 1 ? "" : "i"}`);
  if (seconds > 0 && days === 0) {
    parts.push(`${seconds} secondo${seconds === 1 ? "" : "i"}`);
  }

  if (parts.length === 0) return "meno di 1 secondo";

  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return `${parts.join(", ")} e ${last}`;
}

type VoteType = "best_wrapping" | "worst_wrapping" | "most_fitting";

type VoteState = Record<VoteType, string | null>;

const VOTE_LABELS: Record<VoteType, string> = {
  best_wrapping: "Pacco meglio realizzato",
  worst_wrapping: "Pacco peggio realizzato",
  most_fitting: "Pacco più azzeccato",
};

type VotingPanelProps = {
  playerId: string;
  participants: Participant[];
};

function VotingPanel({ playerId, participants }: VotingPanelProps) {
  const [votes, setVotes] = useState<VoteState>({
    best_wrapping: null,
    worst_wrapping: null,
    most_fitting: null,
  });
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<VoteType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectableParticipants = useMemo(
    () => participants.filter((p) => p.id !== playerId),
    [participants, playerId]
  );

  // Carica eventuali voti già espressi da questo giocatore
  useEffect(() => {
    const loadVotes = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/votes?voter_owner_id=${playerId}`);
        if (!res.ok) {
          setErrorMsg("Errore nel caricamento dei tuoi voti.");
          return;
        }
        const json = (await res.json()) as {
          votes: { target_owner_id: string; vote_type: VoteType }[];
        };

        const next: VoteState = {
          best_wrapping: null,
          worst_wrapping: null,
          most_fitting: null,
        };

        json.votes.forEach((v) => {
          next[v.vote_type] = v.target_owner_id;
        });

        setVotes(next);
      } catch (err) {
        console.error("Errore rete caricamento voti", err);
        setErrorMsg("Errore di rete nel caricamento dei tuoi voti.");
      } finally {
        setLoading(false);
      }
    };

    loadVotes();
  }, [playerId]);

  const handleChangeVote = async (voteType: VoteType, targetId: string) => {
    setVotes((prev) => ({ ...prev, [voteType]: targetId || null }));
    setSavingType(voteType);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter_owner_id: playerId,
          target_owner_id: targetId,
          vote_type: voteType,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = body?.error ?? "Errore nel salvataggio del voto.";
        setErrorMsg(msg);
      }
    } catch (err) {
      console.error("Errore rete salvataggio voto", err);
      setErrorMsg("Errore di rete nel salvataggio del voto.");
    } finally {
      setSavingType(null);
    }
  };

  return (
    <Box sx={{ mt: 3, mb: 4 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Vota i pacchi 🎁
      </Typography>
      <Typography
        variant="body2"
        sx={{ mb: 2, color: "rgba(75,85,99,0.9)" }}
      >
        Ora che le squadre sono chiuse, esprimi il tuo voto:
        scegli il pacco meglio realizzato, quello peggio realizzato
        e quello più azzeccato al destinatario. Non puoi votare te stesso.
      </Typography>

      {errorMsg && (
        <Typography
          variant="body2"
          sx={{ mb: 2, color: "#f97373" }}
        >
          {errorMsg}
        </Typography>
      )}

      {loading ? (
        <Typography variant="body2">Caricamento voti...</Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            gap: 2,
          }}
        >
          {(Object.keys(VOTE_LABELS) as VoteType[]).map((vt) => (
            <FormControl
              key={vt}
              fullWidth
              size="small"
              sx={{ minWidth: 0 }}
            >
              <InputLabel id={`vote-${vt}`}>{VOTE_LABELS[vt]}</InputLabel>
              <Select
                labelId={`vote-${vt}`}
                label={VOTE_LABELS[vt]}
                value={votes[vt] ?? ""}
                disabled={savingType === vt}
                onChange={(e) =>
                  handleChangeVote(
                    vt,
                    e.target.value as string
                  )
                }
              >
                <MenuItem value="">
                  <em>Nessuno selezionato</em>
                </MenuItem>
                {selectableParticipants.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </Box>
      )}
    </Box>
  );
}

type ProfiloClientShellProps = {
  playerId: string;
};

export default function ProfiloClientShell({ playerId }: ProfiloClientShellProps) {
  const router = useRouter();
  const hasPlayerId = !!playerId;

  const [isLocked, setIsLocked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // 🔹 Deadline gestita da DB (admin)
  const [deadlineIso, setDeadlineIso] = useState<string | null>(null);
  const [deadlineLoading, setDeadlineLoading] = useState(true);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  const deadlineDate = useMemo(
    () => (deadlineIso ? new Date(deadlineIso) : null),
    [deadlineIso]
  );

  const deadlineLabel = useMemo(() => {
    if (!deadlineDate) return "non impostata";
    return deadlineDate.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [deadlineDate]);

  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);

  // 🔄 Carica deadline da /api/admin/team-deadline
  useEffect(() => {
    const loadDeadline = async () => {
      setDeadlineLoading(true);
      setDeadlineError(null);
      try {
        const res = await fetch("/api/admin/team-deadline");
        if (!res.ok) {
          console.error(
            "Errore lettura team-deadline",
            await res.text()
          );
          setDeadlineError("Impossibile leggere la data limite.");
          return;
        }

        const json = (await res.json()) as { deadlineIso: string | null };
        setDeadlineIso(json.deadlineIso ?? null);
      } catch (err) {
        console.error("Errore rete team-deadline", err);
        setDeadlineError("Errore di rete nel caricamento della data limite.");
      } finally {
        setDeadlineLoading(false);
      }
    };

    loadDeadline();
  }, []);

  // 🔒 Gestione blocco + countdown in base alla deadline letta
  useEffect(() => {
    if (!deadlineDate) {
      // Nessuna deadline impostata → mai bloccato, nessun timer
      setIsLocked(false);
      setTimeLeftMs(0);
      return;
    }

    const update = () => {
      const diff = deadlineDate.getTime() - Date.now();
      if (diff <= 0) {
        setIsLocked(true);
        setTimeLeftMs(0);
        return true;
      } else {
        setIsLocked(false);
        setTimeLeftMs(diff);
        return false;
      }
    };

    const finished = update();
    if (finished) return;

    const interval = setInterval(() => {
      const done = update();
      if (done) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineDate]);

  // 👤 Carica nome e ruolo (admin) del giocatore da Supabase
  useEffect(() => {
    let cancelled = false;

    const loadPlayer = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("name, is_admin")
        .eq("owner_id", playerId)
        .maybeSingle<{ name: string; is_admin: boolean }>();

      if (cancelled) return;

      if (error) {
        console.error("❌ Errore caricamento giocatore", error);
        setPlayerName(null);
        setIsAdmin(false);
        return;
      }

      setPlayerName(data?.name ?? null);
      setIsAdmin(!!data?.is_admin);
    };

    if (playerId) {
      loadPlayer();
    }

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  // 🚪 Logout
  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("❌ Errore logout", err);
    }

    setLoggingOut(false);
    router.push("/login");
    router.refresh();
  };

  // --- LAYOUT COMUNE (sfondo natalizio + card centrale) ---

  if (!hasPlayerId) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: `${fantaPalette.bgGradient}, ${fantaPalette.snowDots}`,
          backgroundBlendMode: "normal",
          backgroundSize: "cover, 180px 180px",
          backgroundPosition: "center, 0 0",
          backgroundRepeat: "no-repeat, repeat",
          px: 2,
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={6}
            sx={{
              bgcolor: fantaPalette.cardBg,
              borderRadius: 4,
              p: { xs: 3, sm: 4, md: 5 },
              border: `1px solid ${fantaPalette.cardBorder}`,
              boxShadow: fantaPalette.cardShadow,
            }}
          >
            <Alert severity="warning">
              Nessun giocatore specificato. Torna alla pagina di login e
              riprova.
            </Alert>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `${fantaPalette.bgGradient}, ${fantaPalette.snowDots}`,
        backgroundBlendMode: "normal",
        backgroundSize: "cover, 180px 180px",
        backgroundPosition: "center, 0 0",
        backgroundRepeat: "no-repeat, repeat",
        px: 2,
        py: { xs: 3, md: 4 },
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={6}
          sx={{
            bgcolor: fantaPalette.cardBg,
            borderRadius: 4,
            p: { xs: 3, sm: 4, md: 5 },
            border: `1px solid ${fantaPalette.cardBorder}`,
            boxShadow: fantaPalette.cardShadow,
          }}
        >
          {/* Intestazione + pulsanti Admin/Logout */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: fantaPalette.textMuted,
                }}
              >
                Fanta Claus
              </Typography>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 700, color: fantaPalette.textPrimary }}
              >
                Ciao {playerName ?? playerId}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
              }}
            >
              {isAdmin && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => router.push("/admin")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2,
                    py: 0.7,
                    borderRadius: 999,
                    backgroundImage: fantaPalette.buttonGradient,
                    color: fantaPalette.buttonText,
                    boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                    "&:hover": {
                      backgroundImage: fantaPalette.buttonGradientHover,
                      boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                    },
                  }}
                >
                  Admin
                </Button>
              )}

              <Button
                variant="contained"
                size="small"
                onClick={handleLogout}
                disabled={loggingOut}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2.2,
                  py: 0.7,
                  borderRadius: 999,
                  backgroundImage: fantaPalette.buttonGradient,
                  color: fantaPalette.buttonText,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                  "&:hover": {
                    backgroundImage: fantaPalette.buttonGradientHover,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                  },
                }}
              >
                {loggingOut ? "Uscita..." : "Esci"}
              </Button>
            </Box>
          </Box>

          {/* Riepilogo regole squadra (solo testo) */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, mb: 0.5, color: fantaPalette.textPrimary }}
            >
              Come funziona la tua squadra:
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: fantaPalette.textSecondary }}
            >
              • La squadra deve avere esattamente <strong>7 colleghi</strong>.
              <br />
              • Devi scegliere obbligatoriamente <strong>1 capitano</strong>.
              <br />
              • Puoi cambiare i membri e il capitano fino alla scadenza qui
              sotto.
            </Typography>
          </Box>

          {/* TIMER: card verde sfumata, stile Fanta Claus */}
          <Box
            sx={{
              mb: 3,
              p: 3,
              borderRadius: 3,
              background: fantaPalette.timerCardGradient,
              boxShadow: fantaPalette.timerShadow,
              color: fantaPalette.timerTextLight,
            }}
          >
            {deadlineLoading ? (
              <>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    color: "#ffffff",
                  }}
                >
                  Caricamento data limite...
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Attendi un momento, stiamo recuperando il termine ultimo per
                  modificare la squadra.
                </Typography>
              </>
            ) : deadlineError ? (
              <>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    color: "#ffffff",
                  }}
                >
                  Errore nella data limite ⚠️
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {deadlineError} Puoi comunque modificare la squadra al
                  momento.
                </Typography>
              </>
            ) : !deadlineDate ? (
              <>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    color: "#ffffff",
                  }}
                >
                  Nessuna data limite impostata 🎄
                </Typography>

                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Al momento non è stata impostata una scadenza per modificare
                  la squadra. Puoi continuare a scegliere membri e capitano
                  liberamente finché l&apos;organizzazione non definirà una
                  data limite.
                </Typography>
              </>
            ) : isLocked ? (
              <>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    color: "#ffffff",
                  }}
                >
                  Tempo scaduto ⏰
                </Typography>

                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Il periodo per modificare la squadra è terminato il{" "}
                  <strong>{deadlineLabel}</strong>. Ora puoi solo
                  visualizzare i membri e il capitano scelti, e partecipare
                  alle votazioni.
                </Typography>
              </>
            ) : (
              <>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    color: "#ffffff",
                  }}
                >
                  Puoi ancora modificare la tua squadra 🎄
                </Typography>

                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Data limite: <strong>{deadlineLabel}</strong>
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    mt: 1,
                    color: "#ffffff",
                  }}
                >
                  Mancano: {formatTimeLeft(timeLeftMs)}
                </Typography>
              </>
            )}
          </Box>

          {/* Contenuto principale: TeamBuilder prima della scadenza, voti dopo */}
          {deadlineDate && isLocked ? (
            <VotingPanel playerId={playerId} participants={participants} />
          ) : (
            <TeamBuilder
              participants={participants}
              playerId={playerId}
              isLocked={Boolean(deadlineDate && isLocked)}
            />
          )}
        </Paper>
      </Container>
    </Box>
  );
}
