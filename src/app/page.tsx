"use client";

import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
} from "@mui/material";

export default function HomePage() {
  const router = useRouter();

  const handleGoToLogin = () => {
    router.push("/login");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#0b1020",
        display: "flex",
        alignItems: "center",
        color: "white",
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={6}
          sx={{
            bgcolor: "rgba(15, 23, 42, 0.9)",
            borderRadius: 3,
            p: { xs: 3, sm: 4, md: 5 },
            border: "1px solid rgba(148, 163, 184, 0.4)",
          }}
        >
          <Stack spacing={3} alignItems="center">
            {/* LOGO / TITOLO */}
            <Box sx={{ textAlign: "center" }}>
              {/* Qui in futuro puoi mettere un <Image /> con il logo vero */}
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: "bold",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Fanta Claus
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ mt: 1, color: "rgba(226,232,240,0.8)" }}
              >
                Il fantagioco segreto del Secret Santa aziendale 🎅
              </Typography>
            </Box>

            {/* DESCRIZIONE BREVE */}
            <Typography
              variant="body1"
              sx={{ textAlign: "center", color: "rgba(226,232,240,0.9)" }}
            >
              Ognuno ha pescato un collega a cui fare il regalo.
              Con il Fanta Claus scegli la tua squadra di colleghi
              e fai punti in base ai regali che hanno fatto loro.
            </Typography>

            {/* REGOLE BASE */}
            <Box sx={{ width: "100%" }}>
              <Typography
                variant="h6"
                sx={{ mb: 1.5, textAlign: "center", fontWeight: 600 }}
              >
                Regole in breve
              </Typography>

              <Stack
                spacing={1}
                sx={{ fontSize: 14, color: "rgba(226,232,240,0.9)" }}
              >
                <Typography>
                  • Ogni partecipante crea una <strong>squadra di 7 colleghi</strong>.
                </Typography>
                <Typography>
                  • Puoi scegliere solo tra i partecipanti al Secret Santa.
                </Typography>
                <Typography>
                  • Ogni collega in squadra fa punti in base al{" "}
                  <strong>tipo di regalo</strong> che ha fatto.
                </Typography>
                <Typography>
                  • Puoi nominare un <strong>capitano</strong> (in futuro potrebbe
                  valere punti extra 😉).
                </Typography>
                <Typography>
                  • Hai tempo fino alla <strong>scadenza indicata nel tuo profilo</strong>{" "}
                  per modificare la squadra.
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
                }}
              >
                Entra con il tuo codice
              </Button>
            </Box>

            {/* NOTA SEMPLICE */}
            <Typography
              variant="caption"
              sx={{ mt: 1, textAlign: "center", color: "rgba(148,163,184,0.9)" }}
            >
              Il codice ti è stato assegnato dall&apos;organizzatore del Fanta Claus.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
