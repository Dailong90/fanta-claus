"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, Container, Typography, Button, Paper, Stack } from "@mui/material";
import { fantaPalette } from "@/theme/fantaPalette";
import PodiumPublic from "@/components/PodiumPublic";
import Image from "next/image";

// 16 dicembre alle 13:00 (ora italiana)
const VOTING_DEADLINE = new Date("2025-12-16T13:00:00+01:00");

type HomePhase = "buildTeam" | "voting" | "waitingLeaderboard";

export default function HomePage() {
  const router = useRouter();

  const [deadlineIso, setDeadlineIso] = useState<string | null>(null);

  // stato pubblicazione classifica (per il podio)
  const [published, setPublished] = useState<boolean | null>(null);
  const [publishedLoading, setPublishedLoading] = useState(true);

  // 🔹 carica deadline squadra (da admin)
  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        const res = await fetch("/api/admin/team-deadline");
        if (!res.ok) {
          console.error("Errore recupero deadline", await res.text());
          return;
        }

        const data = (await res.json()) as { deadlineIso: string | null };
        setDeadlineIso(data.deadlineIso ?? null);
      } catch (err) {
        console.error("Errore fetch deadline", err);
      }
    };

    fetchDeadline();
  }, []);

  // 🔹 carica stato pubblicazione classifica (per podio)
  useEffect(() => {
    const loadPublishStatus = async () => {
      try {
        setPublishedLoading(true);
        const res = await fetch("/api/admin/leaderboard-publish");
        if (!res.ok) {
          console.error(
            "Errore lettura stato pubblicazione classifica",
            await res.text()
          );
          setPublished(false);
          return;
        }
        const json = (await res.json()) as { published: boolean };
        setPublished(json.published === true);
      } catch (err) {
        console.error("Errore rete stato pubblicazione classifica", err);
        setPublished(false);
      } finally {
        setPublishedLoading(false);
      }
    };

    loadPublishStatus();
  }, []);

  // 🔹 calcola la "fase" della home in base alle date
  const phase: HomePhase = useMemo(() => {
    const now = new Date();

    // se non c'è deadline impostata → consideriamo ancora in fase di composizione squadra
    if (!deadlineIso) return "buildTeam";

    const teamDeadline = new Date(deadlineIso);

    if (now < teamDeadline) return "buildTeam";
    if (now >= teamDeadline && now < VOTING_DEADLINE) return "voting";
    return "waitingLeaderboard";
  }, [deadlineIso]);

  const handleGoToLogin = () => {
    // se ho già fatto accesso → vado direttamente al profilo
    if (typeof window !== "undefined") {
      const ownerId = window.localStorage.getItem("fanta_owner_id");
      if (ownerId) {
        router.push("/profilo");
        return;
      }
    }
    router.push("/login");
  };

  const showPodium = !publishedLoading && published === true;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",

        backgroundImage: `${fantaPalette.bgGradient}, ${fantaPalette.snowDots}`,
        backgroundBlendMode: "normal",
        backgroundSize: "cover, 180px 180px",
        backgroundPosition: "center, 0 0",
        backgroundRepeat: "no-repeat, repeat",

        px: 2,
        py: 4,
        gap: 3,
      }}
    >
      {/* ✅ PODIO PRIMA CARD (solo quando classifica pubblicata) */}
      {showPodium && (
        <Container maxWidth="md">
          <PodiumPublic />
        </Container>
      )}

      {/* CARD PRINCIPALE */}
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
          {/* 🔸 Se classifica pubblicata: mostriamo SOLO bottone + nota */}
          {showPodium ? (
            <Stack spacing={1} alignItems="center">
              {/* CTA LOGIN */}
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGoToLogin}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 4,
                    py: 1.2,
                    borderRadius: 999,
                    backgroundImage: fantaPalette.buttonGradient,
                    color: fantaPalette.buttonText,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                    "&:hover": {
                      backgroundImage: fantaPalette.buttonGradientHover,
                      boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                    },
                  }}
                >
                  Entra con il tuo codice
                </Button>
              </Box>

              {/* NOTA SEMPLICE */}
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  textAlign: "center",
                  color: fantaPalette.textMuted,
                }}
              >
                Il codice ti è stato assegnato dall&apos;organizzatore del Fanta
                Claus.
              </Typography>
            </Stack>
          ) : (
            /* 🔸 Se classifica NON pubblicata: UI a fasi (come ora) */
            <Stack spacing={1} alignItems="center">
              {/* LOGO SOLO DURANTE CREAZIONE SQUADRA */}
              {phase === "buildTeam" && (
                <Image
                  src="/logo/fantaclaus.png"
                  alt="Fanta Claus"
                  width={240}
                  height={240}
                  style={{ width: "auto", height: 200, display: "block" }}
                  priority
                />
              )}

              {/* IMMAGINE SOLO DURANTE LA FASE DI VOTO */}
              {phase === "voting" && (
                <Box sx={{ mt: 1, mb: 1.5, width: "100%" }}>
                  <Image
                    src="/christmas-tree.png"
                    alt="Albero di Natale"
                    width={260}
                    height={260}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      display: "block",
                      margin: "0 auto",
                    }}
                    priority
                  />
                </Box>
              )}

              {/* IMMAGINE SOLO DURANTE ATTESA CLASSIFICA */}
              {phase === "waitingLeaderboard" && (
                <Box sx={{ mt: 1, mb: 1.5, width: "100%" }}>
                  <Image
                    src="/christmas-clock1.png"
                    alt="Orologio Natale"
                    width={260}
                    height={260}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      display: "block",
                      margin: "0 auto",
                    }}
                    priority
                  />
                </Box>
              )}

              {/* DESCRIZIONE BREVE SOLO IN buildTeam */}
              {phase === "buildTeam" && (
                <Typography
                  variant="body1"
                  sx={{
                    textAlign: "center",
                    color: fantaPalette.textPrimary,
                  }}
                >
                  Forma la tua squadra di colleghi e fai punti in base ai regali
                  che riceveranno!
                </Typography>
              )}

              {/* REGOLE BASE → SOLO buildTeam */}
              {phase === "buildTeam" && (
                <Box sx={{ width: "100%" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 1.5,
                      textAlign: "center",
                      fontWeight: 700,
                      color: fantaPalette.textPrimary,
                    }}
                  >
                    Regole
                  </Typography>

                  <Stack
                    spacing={1}
                    sx={{
                      fontSize: 14,
                      color: fantaPalette.textSecondary,
                    }}
                  >
                    <Typography>
                      • Ogni partecipante crea una{" "}
                      <strong>squadra di 7 colleghi</strong>.
                    </Typography>
                    <Typography>
                      • Nomina un <strong>capitano</strong>: ti farà guadagnare
                      punti doppi. Attento, vale anche per i malus!
                    </Typography>
                    <Typography>
                      • Hai tempo fino al{" "}
                      <strong>15 dicembre alle 13:00</strong> per modificare la
                      squadra.
                    </Typography>
                    <Typography>
                      • Ogni componente della squadra guadagna punti in base al{" "}
                      <strong>tipo di regalo</strong> che riceve.
                    </Typography>
                    <Typography>
                      • I punti assegnati per le tipologie dei regali verranno
                      comunicati il <strong>15 dicembre alle 14:00</strong>.
                    </Typography>
                    <Typography>
                      • Dopo l&apos;apertura dei pacchi torna sul tuo profilo per
                      votare le tre categorie: pacco meglio realizzato, pacco
                      peggio realizzato e regalo più azzeccato.{" "}
                      <strong>
                        I punti verranno assegnati sempre a chi riceve il pacco!
                      </strong>
                    </Typography>
                    <Typography>
                      • La classifica per scoprire il vincitore verrà pubblicata
                      il <strong>16 dicembre alle 15:00</strong>.
                    </Typography>
                  </Stack>
                </Box>
              )}

              {/* MESSAGGI IN BASE ALLA FASE */}
              {phase === "voting" && (
                <Box sx={{ mt: 1, textAlign: "center" }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      color: fantaPalette.textPrimary,
                    }}
                  >
                    Le squadre sono chiuse!
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: fantaPalette.textSecondary, mt: 0.5 }}
                  >
                    Entra nel tuo <strong>profilo</strong> e vota i pacchi nelle
                    tre categorie: pacco meglio realizzato, pacco peggio
                    realizzato e regalo più azzeccato. I punti andranno sempre a
                    chi riceve il pacco.
                  </Typography>
                </Box>
              )}

              {phase === "waitingLeaderboard" && (
                <Box sx={{ mt: 1, textAlign: "center" }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      color: fantaPalette.textPrimary,
                    }}
                  >
                    Giochi finiti!
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: fantaPalette.textSecondary, mt: 0.5 }}
                  >
                    Squadre e votazioni sono chiuse. Ora non resta che attendere
                    la <strong>pubblicazione della classifica!</strong>.
                  </Typography>
                </Box>
              )}

              {/* CTA LOGIN */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGoToLogin}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 4,
                    py: 1.2,
                    borderRadius: 999,
                    backgroundImage: fantaPalette.buttonGradient,
                    color: fantaPalette.buttonText,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                    "&:hover": {
                      backgroundImage: fantaPalette.buttonGradientHover,
                      boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                    },
                  }}
                >
                  Entra con il tuo codice
                </Button>
              </Box>

              {/* NOTA SEMPLICE */}
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  textAlign: "center",
                  color: fantaPalette.textMuted,
                }}
              >
                Il codice ti è stato assegnato dall&apos;organizzatore del Fanta
                Claus.
              </Typography>
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
