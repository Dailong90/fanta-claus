"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
} from "@mui/material";
import { fantaPalette } from "@/theme/fantaPalette";
import PodiumPublic from "@/components/PodiumPublic";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();

  // 👇 Mostrare o meno il podio in base alla presenza della classifica
  const [showPodium, setShowPodium] = useState(false);
  const [podiumLoading, setPodiumLoading] = useState(true);

  useEffect(() => {
    const checkLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) {
          console.error("Errore recupero leaderboard", await res.text());
          setShowPodium(false);
          return;
        }

        const data = await res.json();
        const teams = Array.isArray(data?.teams) ? data.teams : [];
        setShowPodium(teams.length > 0);
      } catch (err) {
        console.error("Errore fetch leaderboard", err);
        setShowPodium(false);
      } finally {
        setPodiumLoading(false);
      }
    };

    checkLeaderboard();
  }, []);

  const handleGoToLogin = () => {
    router.push("/login");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",

        // 🎄 SFONDO NATALIZIO DA fantaPalette
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
          <Stack spacing={1} alignItems="center">
            <Image
              src="/logo/fantaclaus.png"
              alt="Fanta Claus"
              width={240}
              height={240}
              style={{ width: "auto", height: 200 }}
              priority
            />

            {/* DESCRIZIONE BREVE */}
            <Typography
              variant="body1"
              sx={{
                textAlign: "center",
                color: fantaPalette.textPrimary,
              }}
            >
              Per il Secret Santa ognuno ha pescato un collega a cui fare il
              regalo. Forma la tua squadra di colleghi e fai punti in base ai
              regali che riceveranno!
            </Typography>

            {/* REGOLE BASE */}
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
                  • Nomina un <strong>capitano</strong> ti fara guadagnare
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
                  votare le tre categorie: pacco meglio realizzato, pacco peggio
                  realizzato e regalo più azzeccato.{" "}
                  <strong>
                    I punti verranno assegnati sempre a chi riceve il pacco!
                  </strong>
                  .
                </Typography>
                <Typography>
                  • La classifica per scoprire il vincitore verrà pubblicata il{" "}
                  <strong>16 dicembre alle 15:00</strong>.
                </Typography>
              </Stack>
            </Box>

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
        </Paper>
      </Container>

      {/* CARD PODIO: seconda card, visibile solo se esiste una classifica */}
      {!podiumLoading && showPodium && (
        <Container maxWidth="md">
          <PodiumPublic />
        </Container>
      )}
    </Box>
  );
}
