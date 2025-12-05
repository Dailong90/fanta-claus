"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
} from "@mui/material";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setErrorMsg("Inserisci il codice che ti è stato assegnato.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrorMsg(json.error || "Codice non valido.");
        setLoading(false);
        return;
      }

      // Salvo una mini sessione lato client (solo playerId + nome)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "fanta_claus_session",
          JSON.stringify({
            playerId: json.playerId,
            name: json.name,
          })
        );
      }

      // Redirect al profilo
      router.push(`/profilo?playerId=${encodeURIComponent(json.playerId)}`);
    } catch (err) {
      console.error("Errore login", err);
      setErrorMsg("Errore di connessione. Riprova tra poco.");
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Entra nel tuo Fanta Claus 🎄
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Inserisci il <strong>codice personale</strong> che ti è stato assegnato
        per creare la tua squadra.
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Codice personale"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoComplete="off"
          sx={{
            mt: 2,
            "& .MuiInputBase-input": {
            color: "#fff",            // testo inserito
            },
            "& .MuiInputLabel-root": {
            color: "rgba(255,255,255,0.7)", // label
            },
            "& .MuiInputLabel-root.Mui-focused": {
            color: "#fff",            // label quando il campo è attivo
            },
            "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.5)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#fff",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#fff",
            },
          }}
          inputProps={{
            style: { textTransform: "uppercase", letterSpacing: 2 },
          }}
        />

        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <Button variant="contained" type="submit" disabled={loading}>
          {loading ? "Verifica in corso..." : "Entra nel tuo profilo"}
        </Button>
      </Box>
    </Container>
  );
}
