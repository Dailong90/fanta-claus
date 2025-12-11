"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
} from "@mui/material";
import { fantaPalette } from "@/theme/fantaPalette";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();

    if (!trimmed || loading) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data?.error ?? "Errore interno, riprova tra poco.");
        return;
      }

      // 🧠 Salva stato login per la navbar
      if (typeof window !== "undefined") {
        window.localStorage.setItem("fanta_owner_id", data.playerId);
        window.localStorage.setItem(
          "fanta_is_admin",
          data.isAdmin ? "true" : "false"
        );
        // 🔔 Notifica alla navbar che l'auth è cambiata
        window.dispatchEvent(new Event("fanta-auth-change"));
      }

      // Vai al profilo
      router.push("/profilo");
      router.refresh();
    } catch (err) {
      console.error("Errore login", err);
      setErrorMsg("Errore di rete, riprova tra poco.");
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !code.trim();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: fantaPalette.bgGradient,
        position: "relative",
        color: "#f9fafb",
        overflow: "hidden",
      }}
    >
      {/* Puntini luce / neve */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: fantaPalette.snowDots,
          backgroundSize: "80px 80px, 100px 100px",
          backgroundPosition: "0 0, 40px 40px",
          opacity: 0.18,
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Paper
          elevation={8}
          sx={{
            p: { xs: 3, sm: 4 },
            bgcolor: fantaPalette.cardBg,
            borderRadius: 6,
            border: `1px solid ${fantaPalette.cardBorder}`,
            boxShadow: fantaPalette.cardShadow,
            textAlign: "center",
            fontFamily: `'Playfair Display', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
          }}
        >
          <Stack spacing={3}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: fantaPalette.textPrimary,
              }}
            >
              Fanta Claus
            </Typography>

            <Typography
              variant="subtitle1"
              sx={{ color: fantaPalette.textSecondary }}
            >
              Inserisci il <strong>codice personale</strong> che ti è stato
              assegnato per entrare nel tuo Fanta Claus. 🎄
            </Typography>

            {errorMsg && (
              <Alert severity="error" sx={{ textAlign: "left" }}>
                {errorMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Codice personale"
                  variant="outlined"
                  fullWidth
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  InputLabelProps={{
                    sx: { color: fantaPalette.textMuted },
                  }}
                  InputProps={{
                    sx: {
                      color: fantaPalette.textPrimary,
                      backgroundColor: fantaPalette.inputBg,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: fantaPalette.inputBorder,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: fantaPalette.inputBorderHover,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: fantaPalette.inputBorderHover,
                      },
                    },
                    inputProps: {
                      maxLength: 10,
                      style: {
                        letterSpacing: "0.15em",
                        textAlign: "center",
                        fontWeight: 600,
                      },
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={disabled}
                  sx={{
                    mt: 1,
                    fontWeight: 600,
                    textTransform: "none",
                    py: 1.2,
                    borderRadius: 999,
                    backgroundImage: fantaPalette.buttonGradient,
                    color: fantaPalette.buttonText,
                    boxShadow:
                      "0 10px 25px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.15)",
                    "&:hover": {
                      backgroundImage: fantaPalette.buttonGradientHover,
                    },
                  }}
                >
                  {loading ? "Accesso in corso..." : "Entra nel tuo profilo"}
                </Button>

                <Typography
                  variant="caption"
                  sx={{ color: fantaPalette.textMuted }}
                >
                  Se non hai ricevuto il codice, contatta
                  l&apos;organizzatore del Fanta Claus.
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
