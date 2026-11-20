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
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Image from "next/image";
import { requestJson } from "@/lib/clientApi";
import { parseLeaderboardResponse } from "@/lib/contracts";
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const [published, setPublished] = useState<boolean | null>(null);
  const [publishedLoading, setPublishedLoading] = useState(true);

  // One response supplies visibility, teams and awards; keep open pages current.
  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const data = await requestJson("/api/leaderboard", parseLeaderboardResponse);
        if (cancelled) return;
        setTeams(data.teams); setPublished(data.isPublished); setAwards(data.awards);
        setLoadError(null); setAwardsError(null);
      } catch {
        if (!cancelled) { setLoadError("Impossibile caricare la classifica. Nuovo tentativo automatico tra pochi secondi."); setAwardsError("Caricamento fallito."); }
      } finally {
        busy = false;
        if (!cancelled) { setLoading(false); setAwardsLoading(false); setPublishedLoading(false); }
      }
    };
    void load();
    const timer = setInterval(load, 15_000);
    window.addEventListener("focus", load);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener("focus", load); };
  }, []);

  const noAwards =
    !awards ||
    (awards.best_wrapping.length === 0 &&
      awards.worst_wrapping.length === 0 &&
      awards.most_fitting.length === 0);

  if (loadError) return <Container sx={{ py: 6 }}><Alert severity="error">{loadError}</Alert></Container>;

  // ⏳ Caricamento stato pubblicazione
  if (publishedLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          backgroundImage: `${fantaPalette.bgGradient}, ${fantaPalette.snowDots}`,
          backgroundBlendMode: "normal",
          backgroundSize: "cover, 180px 180px",
          backgroundPosition: "center, 0 0",
          backgroundRepeat: "no-repeat, repeat",
        }}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  // ❌ Classifica NON pubblicata
  if (!published) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          backgroundImage: `${fantaPalette.bgGradient}, ${fantaPalette.snowDots}`,
          backgroundBlendMode: "normal",
          backgroundSize: "cover, 180px 180px",
          backgroundPosition: "center, 0 0",
          backgroundRepeat: "no-repeat, repeat",
        }}
      >
        <Container maxWidth="sm">
          <Paper
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              bgcolor: fantaPalette.cardBg,
              border: `1px solid ${fantaPalette.cardBorder}`,
              boxShadow: fantaPalette.cardShadow,
              textAlign: "center",
            }}
            elevation={6}
          >
            {/* Immagine in alto al centro */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Image
                src="/classifica_no.png"
                alt="Classifica non disponibile"
                width={260}
                height={260}
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </Box>

            <Typography
              variant="h5"
              sx={{
                mb: 1.5,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#e11d48",
              }}
            >
              Classifica non disponibile
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: fantaPalette.textSecondary }}
            >
              Babbo natale sta ancora consegnando i regali!
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ✅ Classifica pubblicata
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
            Punteggi calcolati in base ai regali ricevuti dai membri di ogni
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

                      <TableCell sx={{ color: fantaPalette.textPrimary }}>
                        {t.ownerName}
                      </TableCell>

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
