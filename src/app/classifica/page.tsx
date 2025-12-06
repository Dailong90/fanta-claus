"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type MemberScore = {
  id: string;
  name: string;
  points: number;
  isCaptain: boolean;
};

type TeamScore = {
  ownerId: string;
  ownerName: string;
  totalPoints: number;
  members: MemberScore[];
};

export default function ClassificaPage() {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) {
          console.error("Errore /api/leaderboard", await res.text());
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTeams(data.teams ?? []);
      } catch (err) {
        console.error("Eccezione /api/leaderboard", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#020617",
        color: "white",
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Classifica Fanta Claus 🎄
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ mb: 3, color: "rgba(148,163,184,1)" }}
        >
          Punteggi calcolati in base ai regali fatti dai membri di ogni
          squadra.
        </Typography>

        <Paper
          sx={{
            p: 2.5,
            bgcolor: "rgba(15,23,42,0.9)",
            borderRadius: 3,
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : teams.length === 0 ? (
            <Typography>
              Nessuna squadra con punteggio disponibile. Forse non sono stati
              ancora inseriti i regali.
            </Typography>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                      Pos
                    </TableCell>
                    <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                      Squadra (giocatore)
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: "rgba(148,163,184,1)" }}
                    >
                      Punti
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teams.map((t, index) => (
                    <TableRow key={t.ownerId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{t.ownerName}</TableCell>
                      <TableCell align="right">{t.totalPoints}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Dettagli membri squadra */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Dettaglio squadre
                </Typography>

                {teams.map((t, index) => (
                  <Accordion key={t.ownerId} sx={{ bgcolor: "rgba(15,23,42,1)" }}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
                    >
                      <Typography sx={{ fontWeight: 600 }}>
                        {index + 1}° – {t.ownerName} ({t.totalPoints} pt)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {t.members.length === 0 ? (
                        <Typography variant="body2">
                          Nessun membro in squadra.
                        </Typography>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                                Membro
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ color: "rgba(148,163,184,1)" }}
                              >
                                Punti
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {t.members.map((m) => (
                              <TableRow key={m.id}>
                                <TableCell>
                                  {m.name}
                                  {m.isCaptain && (
                                    <Typography
                                      component="span"
                                      sx={{
                                        ml: 1,
                                        fontSize: 12,
                                        color: "rgba(96,165,250,1)",
                                      }}
                                    >
                                      (Capitano)
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">{m.points}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
