"use client";

import { useEffect, useState } from "react";
import type { Participant } from "@/data/participants";
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Chip,
} from "@mui/material";

type TeamBuilderProps = {
  participants: Participant[];
  maxMembers?: number;
  playerId: string;     // chi sta creando/modificando la squadra
  isLocked?: boolean;   // se true, non si può più modificare
};

type StoredTeam = {
  members: string[];
  captainId?: string;
};

export default function TeamBuilder({
  participants,
  maxMembers = 7,
  playerId,
  isLocked = false,
}: TeamBuilderProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>("");

  const storageKey = `fanta_claus_team_${playerId}`;

  // 🔹 carica squadra (compatibile con vecchio formato)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setSelectedIds([]);
      setCaptainId("");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as any;

      if (Array.isArray(parsed)) {
        // formato vecchio: ["p1","p2",...]
        setSelectedIds(parsed);
        setCaptainId("");
      } else if (parsed && Array.isArray(parsed.members)) {
        // nuovo formato
        setSelectedIds(parsed.members);
        if (typeof parsed.captainId === "string") {
          setCaptainId(parsed.captainId);
        } else {
          setCaptainId("");
        }
      } else {
        setSelectedIds([]);
        setCaptainId("");
      }
    } catch (err) {
      console.error("Errore nel parse della squadra salvata", err);
      setSelectedIds([]);
      setCaptainId("");
    }
  }, [storageKey]);

  // 🔹 salva squadra solo se non è bloccata (ma carichiamo sempre per visualizzare)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLocked) return; // dopo la scadenza non sovrascrivo più

    const payload: StoredTeam = {
      members: selectedIds,
    };

    if (captainId && selectedIds.includes(captainId)) {
      payload.captainId = captainId;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [selectedIds, captainId, storageKey, isLocked]);

  const toggleMember = (id: string) => {
    if (isLocked) return;

    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const newMembers = prev.filter((m) => m !== id);
        if (captainId === id) {
          setCaptainId("");
        }
        return newMembers;
      }

      if (prev.length >= maxMembers) {
        return prev;
      }

      return [...prev, id];
    });
  };

  const handleSetCaptain = (id: string) => {
    if (isLocked) return;
    if (!selectedIds.includes(id)) return;
    setCaptainId(id);
  };

  return (
    <Box>
      {isLocked && (
        <Typography color="error" sx={{ mb: 1 }}>
          Il periodo per modificare la squadra è terminato. Puoi solo
          visualizzare i membri e il capitano scelti.
        </Typography>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Stai visualizzando/modificando la squadra di: <strong>{playerId}</strong>
      </Typography>

      <Typography variant="h6" gutterBottom>
        Giocatori selezionati: {selectedIds.length} / {maxMembers}
      </Typography>

      {/* Griglia partecipanti */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "1fr 1fr 1fr",
          },
          gap: 2,
        }}
      >
        {participants.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          const isCaptain = captainId === p.id;

          return (
            <Card
              key={p.id}
              variant={isSelected ? "outlined" : "elevation"}
              sx={{
                borderColor: isSelected ? "primary.main" : undefined,
                opacity: isLocked && !isSelected ? 0.5 : 1,
              }}
            >
              <CardActionArea
                onClick={isLocked ? undefined : () => toggleMember(p.id)}
              >
                <CardContent>
                  <Typography>{p.name}</Typography>

                  {isSelected && (
                    <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Chip label="In squadra" size="small" />
                      <Chip
                        label={isCaptain ? "Capitano" : "Imposta capitano"}
                        size="small"
                        color={isCaptain ? "primary" : "default"}
                        onClick={
                          isLocked
                            ? undefined
                            : (e) => {
                                e.stopPropagation();
                                handleSetCaptain(p.id);
                              }
                        }
                      />
                    </Box>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      {/* Riepilogo */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Riepilogo squadra
        </Typography>

        {selectedIds.length === 0 ? (
          <Typography variant="body2">
            Nessun giocatore selezionato.
          </Typography>
        ) : (
          <ul>
            {selectedIds.map((id) => {
              const p = participants.find((x) => x.id === id);
              const isCaptain = captainId === id;
              return (
                <li key={id}>
                  {p?.name ?? id}
                  {isCaptain && " (Capitano)"}
                </li>
              );
            })}
          </ul>
        )}
      </Box>
    </Box>
  );
}
