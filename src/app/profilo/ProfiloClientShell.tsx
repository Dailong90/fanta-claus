"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Typography, Box, Alert, Button } from "@mui/material";
import TeamBuilder from "@/components/TeamBuilder";
import { participants } from "@/data/participants";
import { TEAM_LOCK_DEADLINE_ISO } from "@/config/gameConfig";
import { supabase } from "@/lib/supabaseClient";

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
    // Mostro i secondi solo se non ci sono giorni (per non fare stringoni infiniti)
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
  const [timeLeftMs, setTimeLeftMs] = useState<number>(
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

    // Primo calcolo immediato
    const finished = update();
    if (finished) return;

    const interval = setInterval(() => {
      const done = update();
      if (done) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 👤 Carica il nome del giocatore da Supabase
  useEffect(() => {
    let cancelled = false;

    const loadPlayerName = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("name")
        .eq("owner_id", playerId)
        .maybeSingle<{ name: string }>();

      if (cancelled) return;

      if (error) {
        console.error("❌ Errore caricamento nome giocatore", error);
        setPlayerName(null);
        return;
      }

      setPlayerName(data?.name ?? null);
    };

    if (playerId) {
      loadPlayerName();
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

  if (!hasPlayerId) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          Nessun giocatore specificato. Torna alla pagina di login e riprova.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Intestazione + logout */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            Il tuo profilo 🎁
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 0.5 }}>
            Ciao <strong>{playerName ?? playerId}</strong>
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="inherit"
          size="small"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Uscita..." : "Esci"}
        </Button>
      </Box>

      {/* Messaggio sulla possibilità di modificare la squadra + countdown */}
      <Box sx={{ mb: 2 }}>
        {isLocked ? (
          <Alert severity="error">
            Il periodo per modificare la squadra è terminato il{" "}
            <strong>{deadlineLabel}</strong>. Ora puoi solo visualizzare i
            membri e il capitano scelti.
          </Alert>
        ) : (
          <Alert severity="info">
            Data limite per modificare la squadra:{" "}
            <strong>{deadlineLabel}</strong>
            <br />
            <span>
              Mancano: <strong>{formatTimeLeft(timeLeftMs)}</strong>
            </span>
          </Alert>
        )}
      </Box>

      <TeamBuilder
        participants={participants}
        playerId={playerId}
        isLocked={isLocked}
      />
    </Container>
  );
}
