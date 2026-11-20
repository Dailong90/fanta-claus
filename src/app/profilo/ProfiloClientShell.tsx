"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import TeamBuilder, { type TeamBuilderHandle, type TeamBuilderState } from "@/components/TeamBuilder";
import VotingPanel from "@/components/VotingPanel";
import { parseTeamResponse } from "@/lib/contracts";
import { logout, requestJson } from "@/lib/clientApi";
import { VOTING_DEADLINE_ISO } from "@/config/gameConfig";
import type { Participant } from "@/data/participants";
import { participants } from "@/data/participants";
import { fantaPalette } from "@/theme/fantaPalette";

// ✅ Deadline votazioni fissa (ora italiana)
const VOTING_DEADLINE = new Date(VOTING_DEADLINE_ISO);

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

type ProfiloClientShellProps = {
  playerId: string;
  initialName: string;
  initialIsAdmin: boolean;
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

export default function ProfiloClientShell({ playerId, initialName, initialIsAdmin }: ProfiloClientShellProps) {
  const router = useRouter();
  const hasPlayerId = !!playerId;

  const [loggingOut, setLoggingOut] = useState(false);
  const playerName = initialName;
  const isAdmin = initialIsAdmin;
  const builderRef = useRef<TeamBuilderHandle>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);

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
  const [teamRevision, setTeamRevision] = useState(0);
  const handlePersisted = useCallback(() => setTeamRevision(value => value + 1), []);

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

  const timeLeftMs = deadlineDate ? Math.max(0, deadlineDate.getTime() - nowTs) : 0;
  const isLocked = !!deadlineDate && nowTs >= deadlineDate.getTime();

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

    void loadDeadline();
    const timer = setInterval(loadDeadline, 15_000);
    return () => clearInterval(timer);
  }, []);

  // UI clock only; API authorization always uses server time.
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isVotingClosed = useMemo(() => nowTs >= VOTING_DEADLINE.getTime(), [nowTs]);

  // 📋 Carica la squadra per il riepilogo (usata quando isLocked = true)
  useEffect(() => {
    if (!playerId || !isLocked) return;

    let cancelled = false;
    const loadTeamSummary = async () => {
      setTeamLoading(true);
      try {
        setTeamError(null);
        const result = await requestJson("/api/team", parseTeamResponse);
        if (cancelled) return;
        const data = result.team;

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
      } catch { if (!cancelled) setTeamError("Impossibile caricare la squadra salvata.");
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    };

    void loadTeamSummary();
    return () => { cancelled = true; };
  }, [playerId, isLocked, teamRevision]);

  // 🔢 Carica punteggi dalla leaderboard quando il periodo è scaduto
  useEffect(() => {
    if (!isLocked) return;

    let cancelled = false;
    const loadScores = async () => {
      setScoresLoading(true);
      setLeaderboardMap({});
      setScoresError(null);
      try {
        const res = await fetch("/api/leaderboard");
        if (cancelled) return;
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

        if (!cancelled) setLeaderboardMap(map);
      } catch (err) {
        console.error("Errore rete leaderboard", err);
        if (!cancelled) setScoresError("Errore di rete nel caricamento dei punteggi.");
      } finally {
        if (!cancelled) setScoresLoading(false);
      }
    };

    void loadScores();
    return () => { cancelled = true; };
  }, [isLocked, teamRevision]);

  const handleTeamStateChange = useCallback((state: TeamBuilderState) => {
    setCanSave(!isLocked && state.isComplete && state.hasCaptain && state.persisted);
    if (!state.persisted) setShowSavedAlert(false);
  }, [isLocked]);
  const handleSave = async () => {
    setSaveError(null);
    if (!canSave) return;
    const confirmed = await builderRef.current?.confirm();
    if (confirmed) setShowSavedAlert(true);
    else setSaveError("Squadra non salvata. Verifica lo stato e riprova.");
  };

  // nasconde l'alert dopo qualche secondo
  useEffect(() => {
    if (!showSavedAlert) return;
    const t = setTimeout(() => setShowSavedAlert(false), 3500);
    return () => clearTimeout(t);
  }, [showSavedAlert]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout(); router.push("/login"); router.refresh();
    } catch { setSaveError("Logout non riuscito. Riprova."); }
    finally { setLoggingOut(false); }
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

              {teamError && <Alert severity="error">{teamError}</Alert>}
            {teamError ? null : teamLoading ? (
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
                  {deadlineError} Le modifiche sono sospese finché la configurazione non è disponibile.
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
          ) : deadlineLoading || deadlineError || !deadlineDate ? (
            <Alert severity={deadlineError ? "error" : "info"}>{deadlineLoading ? "Caricamento configurazione..." : deadlineError ?? "Scadenza non configurata. Modifiche sospese."}</Alert>
          ) : (
            <>
              {saveError && <Alert severity="error">{saveError}</Alert>}
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
                  disabled={!canSave}
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
                saveRef={builderRef}
                onPersisted={handlePersisted}
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
