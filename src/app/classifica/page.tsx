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
import Image from "next/image";
import { fantaPalette } from "@/theme/fantaPalette";

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

type AwardWinner = {
  ownerId: string;
  ownerName: string;
  votes: number;
};

type AwardsSummary = {
  best_wrapping: AwardWinner[];
  worst_wrapping: AwardWinner[];
  most_fitting: AwardWinner[];
};

export default function ClassificaPage() {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);

  const [awards, setAwards] = useState<AwardsSummary | null>(null);
  const [awardsLoading, setAwardsLoading] = useState(true);
  const [awardsError, setAwardsError] = useState<string | null>(null);

  // Classifica generale
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

  // Premi speciali delle votazioni
  useEffect(() => {
    const loadAwards = async () => {
      try {
        setAwardsLoading(true);
        setAwardsError(null);

        const res = await fetch("/api/awards");
        if (!res.ok) {
          throw new Error("Errore nel recupero dei premi speciali");
        }

        const data = (await res.json()) as Partial<AwardsSummary>;

        setAwards({
          best_wrapping: data.best_wrapping ?? [],
          worst_wrapping: data.worst_wrapping ?? [],
          most_fitting: data.most_fitting ?? [],
        });
      } catch (err) {
        console.error("Errore /api/awards", err);
        setAwardsError(
          err instanceof Error ? err.message : "Errore generico premi speciali"
        );
      } finally {
        setAwardsLoading(false);
      }
    };

    loadAwards();
  }, []);

  const noAwards =
    !awards ||
    (awards.best_wrapping.length === 0 &&
      awards.worst_wrapping.length === 0 &&
      awards.most_fitting.length === 0);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        px: 2,
        py: 4,
        backgroundImage: `${fantaPalette.bgGradient}, ${fantaPalette.snowDots}`,
        backgroundBlendMode: "normal",
        backgroundSize: "cover, 180px 180px",
        backgroundPosition: "center, 0 0",
        backgroundRepeat: "no-repeat, repeat",
      }}
    >
      <Container maxWidth="md">
        <Paper
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            bgcolor: fantaPalette.cardBg,
            border: `1px solid ${fantaPalette.cardBorder}`,
            boxShadow: fantaPalette.cardShadow,
          }}
          elevation={6}
        >
          {/* HEADER PAGINA */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              mb: 1,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#e11d48",
            }}
          >
            Classifica Fanta Claus 🎄
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{ mb: 3, color: fantaPalette.textSecondary }}
          >
            Punteggi calcolati in base ai regali fatti dai membri di ogni
            squadra. Le prime posizioni sono contrassegnate dai pacchi oro,
            argento e bronzo.
          </Typography>

          {loading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : teams.length === 0 ? (
            <Typography sx={{ color: fantaPalette.textPrimary }}>
              Nessuna squadra con punteggio disponibile. Forse non sono stati
              ancora inseriti i regali.
            </Typography>
          ) : (
            <>
              {/* TABELLA CLASSIFICA GENERALE */}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: fantaPalette.textSecondary }}>
                      Pos
                    </TableCell>
                    <TableCell sx={{ color: fantaPalette.textSecondary }}>
                      Squadra (giocatore)
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: fantaPalette.textSecondary }}
                    >
                      Punti
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teams.map((t, index) => (
                    <TableRow key={t.ownerId}>
                      {/* POSIZIONE + PACCO ORO/ARGENTO/BRONZO */}
                      <TableCell sx={{ width: "90px" }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <span>{index + 1}</span>

                          {index === 0 && (
                            <Image
                              src="/icons/awards/gold.png"
                              alt="Gold"
                              width={26}
                              height={26}
                              style={{ display: "block" }}
                            />
                          )}

                          {index === 1 && (
                            <Image
                              src="/icons/awards/silver.png"
                              alt="Silver"
                              width={26}
                              height={26}
                              style={{ display: "block" }}
                            />
                          )}

                          {index === 2 && (
                            <Image
                              src="/icons/awards/bronze.png"
                              alt="Bronze"
                              width={26}
                              height={26}
                              style={{ display: "block" }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      {/* NOME SQUADRA */}
                      <TableCell sx={{ color: fantaPalette.textPrimary }}>
                        {t.ownerName}
                      </TableCell>

                      {/* PUNTI */}
                      <TableCell
                        align="right"
                        sx={{ color: fantaPalette.textPrimary }}
                      >
                        {t.totalPoints}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* PREMI SPECIALI DELLE VOTAZIONI */}
              <Box sx={{ mt: 4 }}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    fontWeight: 600,
                    color: fantaPalette.textPrimary,
                  }}
                >
                  Premi speciali delle votazioni
                </Typography>

                {awardsLoading ? (
                  <Box sx={{ textAlign: "center", py: 2 }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : awardsError ? (
                  <Typography
                    variant="body2"
                    sx={{ color: "#b91c1c" }}
                  >
                    Errore nel caricamento dei premi speciali: {awardsError}
                  </Typography>
                ) : noAwards ? (
                  <Typography
                    variant="body2"
                    sx={{ color: fantaPalette.textSecondary }}
                  >
                    Nessun voto registrato per i premi speciali.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                    }}
                  >
                    {/* Pacco più bello */}
                    <Paper
                      sx={{
                        flex: 1,
                        p: 2,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,0.96)",
                        border: `1px solid ${fantaPalette.cardBorder}`,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      }}
                      elevation={0}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color: fantaPalette.textPrimary,
                        }}
                      >
                        Pacco meglio realizzato
                      </Typography>

                      {awards && awards.best_wrapping.length > 0 ? (
                        <>
                          {awards.best_wrapping.length > 1 && (
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.5,
                                fontStyle: "italic",
                                color: fantaPalette.textSecondary,
                              }}
                            >
                              Ex aequo:
                            </Typography>
                          )}

                          {awards.best_wrapping.map((w) => (
                            <Typography
                              key={w.ownerId}
                              variant="body1"
                              sx={{
                                mt: 0.5,
                                fontWeight: 600,
                                color: fantaPalette.textPrimary,
                              }}
                            >
                              {w.ownerName}
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{
                                  ml: 0.5,
                                  color: fantaPalette.textSecondary,
                                }}
                              >
                                – {w.votes} voti
                              </Typography>
                            </Typography>
                          ))}
                        </>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1,
                            color: fantaPalette.textSecondary,
                          }}
                        >
                          Nessun vincitore.
                        </Typography>
                      )}
                    </Paper>

                    {/* Pacco più brutto */}
                    <Paper
                      sx={{
                        flex: 1,
                        p: 2,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,0.96)",
                        border: `1px solid ${fantaPalette.cardBorder}`,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      }}
                      elevation={0}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color: fantaPalette.textPrimary,
                        }}
                      >
                        Pacco peggio realizzato
                      </Typography>

                      {awards && awards.worst_wrapping.length > 0 ? (
                        <>
                          {awards.worst_wrapping.length > 1 && (
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.5,
                                fontStyle: "italic",
                                color: fantaPalette.textSecondary,
                              }}
                            >
                              Ex aequo:
                            </Typography>
                          )}

                          {awards.worst_wrapping.map((w) => (
                            <Typography
                              key={w.ownerId}
                              variant="body1"
                              sx={{
                                mt: 0.5,
                                fontWeight: 600,
                                color: fantaPalette.textPrimary,
                              }}
                            >
                              {w.ownerName}
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{
                                  ml: 0.5,
                                  color: fantaPalette.textSecondary,
                                }}
                              >
                                – {w.votes} voti
                              </Typography>
                            </Typography>
                          ))}
                        </>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1,
                            color: fantaPalette.textSecondary,
                          }}
                        >
                          Nessun vincitore.
                        </Typography>
                      )}
                    </Paper>

                    {/* Regalo più azzeccato */}
                    <Paper
                      sx={{
                        flex: 1,
                        p: 2,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,0.96)",
                        border: `1px solid ${fantaPalette.cardBorder}`,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      }}
                      elevation={0}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color: fantaPalette.textPrimary,
                        }}
                      >
                        Regalo più azzeccato
                      </Typography>

                      {awards && awards.most_fitting.length > 0 ? (
                        <>
                          {awards.most_fitting.length > 1 && (
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.5,
                                fontStyle: "italic",
                                color: fantaPalette.textSecondary,
                              }}
                            >
                              Ex aequo:
                            </Typography>
                          )}

                          {awards.most_fitting.map((w) => (
                            <Typography
                              key={w.ownerId}
                              variant="body1"
                              sx={{
                                mt: 0.5,
                                fontWeight: 600,
                                color: fantaPalette.textPrimary,
                              }}
                            >
                              {w.ownerName}
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{
                                  ml: 0.5,
                                  color: fantaPalette.textSecondary,
                                }}
                              >
                                – {w.votes} voti
                              </Typography>
                            </Typography>
                          ))}
                        </>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1,
                            color: fantaPalette.textSecondary,
                          }}
                        >
                          Nessun vincitore.
                        </Typography>
                      )}
                    </Paper>
                  </Box>
                )}
              </Box>

              {/* DETTAGLIO MEMBRI SQUADRA */}
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 1.5,
                    fontWeight: 600,
                    color: fantaPalette.textPrimary,
                  }}
                >
                  Dettaglio squadre
                </Typography>

                {teams.map((t, index) => (
                  <Accordion
                    key={t.ownerId}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.96)",
                      borderRadius: 2,
                      mb: 1.2,
                      border: `1px solid ${fantaPalette.cardBorder}`,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      "&:before": { display: "none" },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: "#4b5563" }} />}
                    >
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: fantaPalette.textPrimary,
                        }}
                      >
                        {index + 1}° – {t.ownerName} ({t.totalPoints} pt)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {t.members.length === 0 ? (
                        <Typography
                          variant="body2"
                          sx={{ color: fantaPalette.textSecondary }}
                        >
                          Nessun membro in squadra.
                        </Typography>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{ color: fantaPalette.textSecondary }}
                              >
                                Membro
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ color: fantaPalette.textSecondary }}
                              >
                                Punti
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {t.members.map((m) => (
                              <TableRow key={m.id}>
                                <TableCell
                                  sx={{ color: fantaPalette.textPrimary }}
                                >
                                  {m.name}
                                  {m.isCaptain && (
                                    <Typography
                                      component="span"
                                      sx={{
                                        ml: 1,
                                        fontSize: 12,
                                        color: "#2563eb",
                                      }}
                                    >
                                      (Capitano)
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ color: fantaPalette.textPrimary }}
                                >
                                  {m.points}
                                </TableCell>
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
