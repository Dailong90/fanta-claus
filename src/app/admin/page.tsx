"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
} from "@mui/material";

import { participants } from "@/data/participants";
import { defaultGiftCategories, type GiftCategory } from "@/data/giftCategories";

type GiftAssignment = {
  giverId: string;     // chi FA il regalo
  categoryId: string;  // categoria scelta
};

type TeamStanding = {
  ownerId: string;
  ownerName: string;
  score: number;
};

const ASSIGNMENTS_KEY = "fanta_claus_gift_assignments";
const CAPTAIN_MULTIPLIER = 2; // il capitano vale punti x2

export default function AdminPage() {
  const [categories] = useState<GiftCategory[]>(defaultGiftCategories);
  const [assignments, setAssignments] = useState<GiftAssignment[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);

  // 🔹 carica le assegnazioni da localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(ASSIGNMENTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAssignments(parsed);
        }
      } catch (err) {
        console.error("Errore nel parse delle assegnazioni", err);
      }
    }
  }, []);

  // 🔹 salva ogni volta che assignments cambia
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  }, [assignments]);

  const handleCategoryChange = (giverId: string, categoryId: string) => {
    setAssignments((prev) => {
      const existing = prev.find((a) => a.giverId === giverId);
      if (existing) {
        return prev.map((a) =>
          a.giverId === giverId ? { ...a, categoryId } : a
        );
      }
      return [...prev, { giverId, categoryId }];
    });
  };

  const recalculateStandings = () => {
    if (typeof window === "undefined") return;

    // mappa categoria -> punti
    const categoryMap = new Map<string, number>();
    categories.forEach((c) => {
      categoryMap.set(c.id, c.points);
    });

    // mappa giver -> punti (in base alla categoria del suo regalo)
    const giftScoreByGiver = new Map<string, number>();
    assignments.forEach((a) => {
      const pts = categoryMap.get(a.categoryId);
      if (typeof pts === "number") {
        giftScoreByGiver.set(a.giverId, pts);
      }
    });

    // funzione per calcolare il punteggio di una squadra
        const calcTeamScore = (ownerId: string): number => {
        const storageKey = `fanta_claus_team_${ownerId}`;
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return 0;

        let memberIds: string[] = [];
        let captainId: string | undefined;

        try {
            const parsed = JSON.parse(raw) as any;

            // vecchio formato: ["p1","p2",...]
            if (Array.isArray(parsed)) {
            memberIds = parsed;
            } else if (parsed && Array.isArray(parsed.members)) {
            // nuovo formato
            memberIds = parsed.members;
            if (typeof parsed.captainId === "string") {
                captainId = parsed.captainId;
            }
            }
        } catch (err) {
            console.error("Errore nel parse della squadra per", ownerId, err);
            return 0;
        }

        return memberIds.reduce((sum, memberId) => {
            const basePts = giftScoreByGiver.get(memberId) ?? 0;
            const multiplier = captainId === memberId ? CAPTAIN_MULTIPLIER : 1;
            return sum + basePts * multiplier;
        }, 0);
        };


    const newStandings: TeamStanding[] = participants.map((p) => ({
      ownerId: p.id,
      ownerName: p.name,
      score: calcTeamScore(p.id),
    }));

    newStandings.sort((a, b) => b.score - a.score);

    setStandings(newStandings);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Area Admin 🛠️
      </Typography>

      <Typography sx={{ mb: 3 }}>
        Qui puoi assegnare una categoria di regalo a ogni partecipante e
        calcolare la classifica delle squadre in base ai punteggi.
      </Typography>

      {/* Categorie visibili (solo info per ora) */}
      <Paper sx={{ p: 2, mb: 4 }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Categorie regalo & punteggi
        </Typography>
        <ul>
          {categories.map((c) => (
            <li key={c.id}>
              {c.emoji} <strong>{c.label}</strong> – {c.points} punti
            </li>
          ))}
        </ul>
      </Paper>

      {/* Assegnazione categoria per ogni partecipante */}
      <Paper sx={{ p: 2, mb: 4 }} elevation={3}>
        <Typography variant="h6" gutterBottom>
          Assegna categoria ai regali
        </Typography>

        {participants.map((p) => {
          const assignment = assignments.find((a) => a.giverId === p.id);
          const selectedCategoryId = assignment?.categoryId ?? "";

          return (
            <Box
              key={p.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ minWidth: 180 }}>
                <Typography>{p.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  ID giocatore: {p.id}
                </Typography>
              </Box>

              <FormControl sx={{ minWidth: 220 }} size="small">
                <InputLabel id={`cat-label-${p.id}`}>Categoria regalo</InputLabel>
                <Select
                  labelId={`cat-label-${p.id}`}
                  value={selectedCategoryId}
                  label="Categoria regalo"
                  onChange={(e) =>
                    handleCategoryChange(p.id, e.target.value as string)
                  }
                >
                  <MenuItem value="">
                    <em>Nessuna</em>
                  </MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.emoji} {c.label} ({c.points} pt)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          );
        })}
      </Paper>

      {/* Bottone per calcolare classifica */}
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" onClick={recalculateStandings}>
          Calcola / Aggiorna classifica
        </Button>
      </Box>

      {/* Classifica */}
      {standings.length > 0 && (
        <Paper sx={{ p: 2 }} elevation={3}>
          <Typography variant="h6" gutterBottom>
            Classifica squadre 🎄
          </Typography>

          {standings.map((t, index) => (
            <Box key={t.ownerId} sx={{ py: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography>
                  {index + 1}° – {t.ownerName} ({t.ownerId})
                </Typography>
                <Typography>{t.score} punti</Typography>
              </Box>
              {index < standings.length - 1 && <Divider sx={{ mt: 1 }} />}
            </Box>
          ))}
        </Paper>
      )}
    </Container>
  );
}
