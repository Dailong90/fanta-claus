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

  const [isAfterDeadline, setIsAfterDeadline] = useState(false);
  const [deadlineLoading, setDeadlineLoading] = useState(true);

  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        const res = await fetch("/api/admin/team-deadline");
        if (!res.ok) {
          console.error("Errore recupero deadline", await res.text());
          return;
        }

        const data = (await res.json()) as { deadlineIso: string | null };

        if (data.deadlineIso) {
          const now = new Date();
          const deadline = new Date(data.deadlineIso);
          setIsAfterDeadline(now >= deadline);
        } else {
          setIsAfterDeadline(false);
        }
      } catch (err) {
        console.error("Errore fetch deadline", err);
      } finally {
        setDeadlineLoading(false);
      }
    };

    fetchDeadline();
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
              Ognuno ha pescato un collega a cui fare il regalo.
              Con il Fanta Claus scegli la tua squadra di colleghi
              e fai punti in base ai regali che hanno fatto loro.
            </Typography>

            {/* REGOLE BASE */}
            <Box sx={{ width: "100%" }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 1.5,
                  textAlign: "center",
                  fontWeight: 600,
                  color: fantaPalette.textPrimary,
                }}
              >
                Regole in breve
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
                  • Puoi scegliere solo tra i partecipanti al Secret Santa.
                </Typography>
                <Typography>
                  • Ogni collega in squadra fa punti in base al{" "}
                  <strong>tipo di regalo</strong> che ha fatto.
                </Typography>
                <Typography>
                  • Puoi nominare un <strong>capitano</strong> (in futuro
                  potrebbe valere punti extra 😉).
                </Typography>
                <Typography>
                  • Hai tempo fino alla{" "}
                  <strong>scadenza indicata nel tuo profilo</strong> per
                  modificare la squadra.
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

      {/* CARD PODIO: seconda card, solo dopo il termine */}
      {!deadlineLoading && isAfterDeadline && (
        <Container maxWidth="md">
          <PodiumPublic />
        </Container>
      )}
    </Box>
  );
}
