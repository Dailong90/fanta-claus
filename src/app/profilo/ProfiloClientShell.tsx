"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  Paper,
} from "@mui/material";
import TeamBuilder from "@/components/TeamBuilder";
import { participants } from "@/data/participants";
import { TEAM_LOCK_DEADLINE_ISO } from "@/config/gameConfig";
import { supabase } from "@/lib/supabaseClient";
import { fantaPalette } from "@/theme/fantaPalette";

const deadline = new Date(TEAM_LOCK_DEADLINE_ISO);
const deadlineLabel = deadline.toLocaleString("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type ProfiloClientShellProps = {
  playerId: string;
};

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

export default function ProfiloClientShell({ playerId }: ProfiloClientShellProps) {
  const router = useRouter();
  const hasPlayerId = !!playerId;

  const [isLocked, setIsLocked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() =>
    Math.max(0, deadline.getTime() - Date.now())
  );


  // 🔒 Gestione blocco + countdown
  useEffect(() => {
    const update = () => {
      const diff = deadline.getTime() - Date.now();
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
  }, []);

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
            {isLocked ? (
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
                  visualizzare i membri e il capitano scelti.
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

          {/* Team builder */}
          <TeamBuilder
            participants={participants}
            playerId={playerId}
            isLocked={isLocked}
          />
        </Paper>
      </Container>
    </Box>
  );
}
