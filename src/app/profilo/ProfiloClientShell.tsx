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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import TeamBuilder from "@/components/TeamBuilder";
import type { Participant } from "@/data/participants";
import { participants } from "@/data/participants";
import { supabase } from "@/lib/supabaseClient";
import { fantaPalette } from "@/theme/fantaPalette";

// ✅ Deadline votazioni fissa (ora italiana)
const VOTING_DEADLINE = new Date("2025-12-16T13:00:00+01:00");

// 🔹 Funzione di utilità per formattare il countdown in italiano
function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "0 secondi";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "giorno" : "giorni"}`);
  }

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "ora" : "ore"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minuto" : "minuti"}`);
  }

  // Mostro i secondi solo se non ci sono i giorni
  if (seconds > 0 && days === 0) {
    parts.push(`${seconds} ${seconds === 1 ? "secondo" : "secondi"}`);
  }

  if (parts.length === 0) return "meno di 1 secondo";
  if (parts.length === 1) return parts[0];

  const last = parts.pop();
  return `${parts.join(", ")} e ${last}`;
}

type VoteType = "best_wrapping" | "worst_wrapping" | "most_fitting";

type VoteState = Record<VoteType, string | null>;

const VOTE_LABELS: Record<VoteType, string> = {
  best_wrapping: "Pacco meglio realizzato +3",
  worst_wrapping: "Pacco peggio realizzato -3",
  most_fitting: "Pacco più azzeccato +5",
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
        Vota i pacchi!
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "rgba(75,85,99,0.9)" }}>
        Ora che le squadre sono chiuse, esprimi il tuo voto: scegli il pacco
        meglio realizzato, quello peggio realizzato e il reaglo più azzeccato al
        destinatario. La persona più votata di ognuna delle tre categorie
        guadagnerà i punti indicati. Non puoi votare te stesso.
      </Typography>

      {errorMsg && (
        <Typography variant="body2" sx={{ mb: 2, color: "#f97373" }}>
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
            <FormControl key={vt} fullWidth size="small" sx={{ minWidth: 0 }}>
              <InputLabel id={`vote-${vt}`}>{VOTE_LABELS[vt]}</InputLabel>
              <Select
                labelId={`vote-${vt}`}
                label={VOTE_LABELS[vt]}
                value={votes[vt] ?? ""}
                disabled={savingType === vt}
                onChange={(e) => handleChangeVote(vt, e.target.value as string)}
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

// tipi che rispecchiano /api/leaderboard
type MemberScore = {
  id: string;
  name: string;
  points: number;
  isCaptain: boolean;
};

type TeamScoreRow = {
  ownerId: string;
  ownerName: string;
  totalPoints: number;
  members: MemberScore[];
};

export default function ProfiloClientShell({ playerId }: ProfiloClientShellProps) {
  const router = useRouter();
  const hasPlayerId = !!playerId;

  const [isLocked, setIsLocked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // ✅ “orologio” locale: lo aggiorniamo solo quando la squadra è lockata
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  // stato per il bottone "Salva squadra"
  const [canSave, setCanSave] = useState(false);
  const [showSavedAlert, setShowSavedAlert] = useState(false);

  // 🔹 riepilogo squadra quando il periodo è scaduto
  const [teamSummary, setTeamSummary] = useState<{
    members: Participant[];
    captainId: string | null;
  } | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  // 🔹 punteggi dalla classifica (team ownerId -> dati squadra)
  const [leaderboardMap, setLeaderboardMap] = useState<Record<string, TeamScoreRow>>({});
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoresError, setScoresError] = useState<string | null>(null);

  // 🔹 Deadline gestita da DB (admin)
  const [deadlineIso, setDeadlineIso] = useState<string | null>(null);
  const [deadlineLoading, setDeadlineLoading] = useState(true);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  const deadlineDate = useMemo(() => (deadlineIso ? new Date(deadlineIso) : null), [deadlineIso]);

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
          console.error("Errore lettura team-deadline", await res.text());
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

  // ✅ aggiorna "now" solo quando siamo in fase lockata (voti / attesa classifica)
  useEffect(() => {
    if (!isLocked) return;

    setNowTs(Date.now());
    const interval = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isLocked]);

  const isVotingClosed = useMemo(() => nowTs >= VOTING_DEADLINE.getTime(), [nowTs]);

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

  // 📋 Carica la squadra per il riepilogo (usata quando isLocked = true)
  useEffect(() => {
    if (!playerId) return;

    const loadTeamSummary = async () => {
      setTeamLoading(true);
      try {
        const { data, error } = await supabase
          .from("teams")
          .select("members, captain_id")
          .eq("owner_id", playerId)
          .maybeSingle<{ members: string[]; captain_id: string | null }>();

        if (error) {
          console.error("❌ Errore caricamento squadra per riepilogo", error);
          setTeamSummary(null);
          return;
        }

        if (!data) {
          setTeamSummary(null);
          return;
        }

        const memberIds = data.members ?? [];
        const memberObjects = participants.filter((p) => memberIds.includes(p.id));

        setTeamSummary({
          members: memberObjects,
          captainId: data.captain_id,
        });
      } finally {
        setTeamLoading(false);
      }
    };

    loadTeamSummary();
  }, [playerId]);

  // 🔢 Carica punteggi dalla leaderboard quando il periodo è scaduto
  useEffect(() => {
    if (!isLocked) return;

    const loadScores = async () => {
      setScoresLoading(true);
      setScoresError(null);
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) {
          console.error("Errore lettura leaderboard", await res.text());
          setScoresError("Impossibile caricare i punteggi della classifica.");
          return;
        }

        const json = (await res.json()) as { teams?: TeamScoreRow[] };
        const rows = Array.isArray(json.teams) ? json.teams : [];

        const map: Record<string, TeamScoreRow> = {};
        rows.forEach((row) => {
          map[row.ownerId] = row;
        });

        setLeaderboardMap(map);
      } catch (err) {
        console.error("Errore rete leaderboard", err);
        setScoresError("Errore di rete nel caricamento dei punteggi.");
      } finally {
        setScoresLoading(false);
      }
    };

    loadScores();
  }, [isLocked]);

  // callback che riceve lo stato della squadra dal TeamBuilder
  const handleTeamStateChange = (state: {
    selectedCount: number;
    isComplete: boolean;
    hasCaptain: boolean;
  }) => {
    if (isLocked) {
      setCanSave(false);
      return;
    }
    setCanSave(state.isComplete && state.hasCaptain);
  };

  // 🚀 click su "Salva squadra" → solo feedback visivo
  const handleSave = () => {
    if (!canSave) return;
    setShowSavedAlert(true);
  };

  // nasconde l'alert dopo qualche secondo
  useEffect(() => {
    if (!showSavedAlert) return;
    const t = setTimeout(() => setShowSavedAlert(false), 3500);
    return () => clearTimeout(t);
  }, [showSavedAlert]);

  // 🚪 Logout
  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("❌ Errore logout", err);
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("fanta_owner_id");
      window.localStorage.removeItem("fanta_is_admin");
      window.dispatchEvent(new Event("fanta-auth-change"));
    }

    setLoggingOut(false);

    router.push("/login");
    router.refresh();
  };

  const myLeaderboardRow = leaderboardMap[playerId];

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
              Nessun giocatore specificato. Torna alla pagina di login e riprova.
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

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
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

          {/* 0️⃣ REGOLE IN ALTO / oppure riepilogo squadra dopo scadenza */}
          {deadlineDate && isLocked ? (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: "1.15rem",
                  mb: 0.5,
                  color: fantaPalette.textPrimary,
                }}
              >
                La tua squadra
              </Typography>

              {teamLoading ? (
                <Typography variant="body2" sx={{ color: fantaPalette.textSecondary }}>
                  Caricamento della tua squadra...
                </Typography>
              ) : !teamSummary || teamSummary.members.length === 0 ? (
                <Typography variant="body2" sx={{ color: fantaPalette.textSecondary }}>
                  Non risulta nessuna squadra salvata. In caso di dubbi contatta
                  l&apos;organizzatore.
                </Typography>
              ) : (
                <>
                  <Typography
                    variant="body2"
                    sx={{ color: fantaPalette.textSecondary, mb: 1 }}
                  >
                    Questa è la tua squadra. La tabella mostra i{" "}
                    <strong>punti Fanta Claus</strong> ottenuti da ogni membro (il
                    capitano vale doppio).
                  </Typography>

                  {scoresError && (
                    <Typography variant="body2" sx={{ mt: 1, color: "#ef4444" }}>
                      {scoresError}
                    </Typography>
                  )}

                  <Box sx={{ mt: 2 }}>
                    {scoresLoading ? (
                      <Typography variant="body2" sx={{ color: fantaPalette.textSecondary }}>
                        Caricamento dei punteggi...
                      </Typography>
                    ) : !myLeaderboardRow ? (
                      <Typography variant="body2" sx={{ color: fantaPalette.textSecondary }}>
                        I punteggi non sono ancora disponibili. Riprova tra poco.
                      </Typography>
                    ) : (
                      <Table
                        size="small"
                        sx={{
                          backgroundColor: "rgba(255,255,255,0.8)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell>Giocatore</TableCell>
                            <TableCell align="center">Ruolo</TableCell>
                            <TableCell align="right">Punti Fanta Claus</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {myLeaderboardRow.members.map((m) => {
                            const isCaptain = m.isCaptain;
                            const fantasyPoints = m.points;

                            return (
                              <TableRow
                                key={m.id}
                                sx={{
                                  backgroundColor: isCaptain
                                    ? "rgba(250, 204, 21, 0.12)"
                                    : "transparent",
                                }}
                              >
                                <TableCell>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <Box
                                      component="img"
                                      src={
                                        isCaptain
                                          ? "/icons/team/slot-captain.png"
                                          : "/icons/team/slot-filled.png"
                                      }
                                      alt={isCaptain ? "Capitano" : "Membro"}
                                      sx={{ width: 26, height: 26, flexShrink: 0 }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: isCaptain ? 600 : 400 }}
                                    >
                                      {m.name}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {isCaptain ? "Capitano" : "Membro"}
                                </TableCell>
                                <TableCell align="right">{fantasyPoints}</TableCell>
                              </TableRow>
                            );
                          })}

                          <TableRow
                            sx={{ borderTop: "1px solid rgba(148,163,184,0.6)" }}
                          >
                            <TableCell />
                            <TableCell sx={{ fontWeight: 700, pt: 0.8 }}>
                              Totale squadra
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontWeight: 800, fontSize: "1.05rem", pt: 0.8 }}
                            >
                              {myLeaderboardRow.totalPoints}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                </>
              )}
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 0.5, color: fantaPalette.textPrimary }}
              >
                Come funziona il Fanta Claus:
              </Typography>
              <Typography variant="body2" sx={{ color: fantaPalette.textSecondary }}>
                • Dopo l&apos;apertura dei pacchi, verrà assegnato un punteggio in
                base alla tipoligia di <strong>regalo ricevuto</strong>.
                <br />
                • I punti assegnati alle tipologie di regalo verranno comunicati{" "}
                <strong>successivamente</strong>.
                <br />
                • Componi la tua squadra composta da <strong>7 colleghi</strong>{" "}
                scegliendo tra le card qui sotto.
                <br />
                • Nella tua squadra nomina un <strong>capitano</strong>: per lui i
                punti saranno doppi, anche in negativo!
                <br />
                • Puoi cambiare i membri e il capitano fino alla{" "}
                <strong>scadenza indicata</strong>.
              </Typography>
            </Box>
          )}

          {/* 1️⃣ TIMER */}
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
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#fff" }}>
                  Caricamento data limite...
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Attendi un momento, stiamo recuperando il termine ultimo per modificare
                  la squadra.
                </Typography>
              </>
            ) : deadlineError ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#fff" }}>
                  Errore nella data limite ⚠️
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {deadlineError} Puoi comunque modificare la squadra al momento.
                </Typography>
              </>
            ) : !deadlineDate ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#fff" }}>
                  Nessuna data limite impostata
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Al momento non è stata impostata una scadenza per modificare la squadra.
                </Typography>
              </>
            ) : isLocked ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#fff" }}>
                  Tempo scaduto!
                </Typography>

                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Il periodo per modificare la squadra è terminato il{" "}
                  <strong>{deadlineLabel}</strong>. 
                  <br/>
                  {isVotingClosed ? (
                    <>
                      {" "}
                      Anche le <strong>votazioni</strong> sono chiuse: ora sei in attesa
                      della classifica.
                    </>
                  ) : (
                    <>
                      {" "}
                      <strong>Ricordati si assegnare i voti!</strong> Puoi farlo fino al <strong>16 Dicembre alle 13:00.</strong>.
                    </>
                  )}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#fff" }}>
                  Puoi ancora modificare la tua squadra!
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Data limite: <strong>{deadlineLabel}</strong>
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: "#fff" }}>
                  Mancano: {formatTimeLeft(timeLeftMs)}
                </Typography>
              </>
            )}
          </Box>

          {/* 2️⃣ BLOCCO VOTI / TEAM BUILDER */}
          {deadlineDate && isLocked ? (
            isVotingClosed ? (
              <Box sx={{ mt: 2, mb: 1, textAlign: "center" }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: fantaPalette.textPrimary }}
                >
                  Votazioni chiuse
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: fantaPalette.textSecondary }}>
                  Le votazioni sono terminate. Ora non resta che attendere la{" "}
                  <strong>pubblicazione della classifica</strong>.
                </Typography>
              </Box>
            ) : (
              <VotingPanel playerId={playerId} participants={participants} />
            )
          ) : (
            <>
              {showSavedAlert && (
                <Alert
                  severity="success"
                  onClose={() => setShowSavedAlert(false)}
                  sx={{ mb: 2, borderRadius: 999, alignItems: "center" }}
                >
                  Squadra salvata. Puoi modificarla finché non scade il tempo.
                </Alert>
              )}

              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  sx={{
                    px: 5,
                    py: 1.6,
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    borderRadius: 40,
                    backgroundImage: fantaPalette.buttonGradient,
                    color: fantaPalette.buttonText,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                    transition: "0.25s ease",
                    opacity: canSave ? 1 : 0.5,
                    transform: canSave ? "scale(1)" : "scale(0.97)",
                    "&:hover": canSave
                      ? {
                          backgroundImage: fantaPalette.buttonGradientHover,
                          transform: "scale(1.04)",
                          boxShadow: "0 14px 35px rgba(0,0,0,0.35)",
                        }
                      : {},
                  }}
                >
                  Salva squadra
                </Button>
              </Box>

              <TeamBuilder
                participants={participants}
                playerId={playerId}
                isLocked={Boolean(deadlineDate && isLocked)}
                onTeamStateChange={handleTeamStateChange}
              />
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
