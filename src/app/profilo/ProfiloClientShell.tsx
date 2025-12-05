"use client";

import { useEffect, useState } from "react";
import { Container, Typography, Box, Alert } from "@mui/material";
import TeamBuilder from "@/components/TeamBuilder";
import { participants } from "@/data/participants";
import { TEAM_LOCK_DEADLINE_ISO } from "@/config/gameConfig";

const deadline = new Date(TEAM_LOCK_DEADLINE_ISO);

type ProfiloClientShellProps = {
  playerId: string;
};

export default function ProfiloClientShell({ playerId }: ProfiloClientShellProps) {
  const hasPlayerId = playerId.trim().length > 0;
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    setIsLocked(new Date() > deadline);
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Il tuo profilo 🎁
      </Typography>

      <Typography sx={{ mb: 2 }}>
        Seleziona i colleghi che vuoi inserire nella tua squadra del Fanta Claus.
        Al momento puoi scegliere fino a 7 persone.
      </Typography>

      <Alert severity={isLocked ? "error" : "info"} sx={{ mb: 3 }}>
        Data limite per modificare la squadra:{" "}
        <strong>
          {deadline.toLocaleString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </strong>
        {isLocked
          ? " – Il periodo per modificare la squadra è terminato. Ora puoi solo visualizzarla."
          : " – Puoi ancora modificare la tua squadra fino a questa data."}
      </Alert>

      {!hasPlayerId && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Nessun giocatore specificato. Aggiungi <strong>?playerId=p1</strong>{" "}
          (o altri) all&apos;URL:
          <br />
          <code>/profilo?playerId=p1</code>
        </Alert>
      )}

      {hasPlayerId && (
        <Box sx={{ mt: 2 }}>
          <TeamBuilder
            participants={participants}
            maxMembers={7}
            playerId={playerId}
            isLocked={isLocked}
          />
        </Box>
      )}
    </Container>
  );
}
