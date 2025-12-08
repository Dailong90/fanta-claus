"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  CircularProgress,
  Typography,
  Container,
  Paper,
} from "@mui/material";
import AdminRegaliClient from "./AdminRegaliClient";
import { fantaPalette } from "@/theme/fantaPalette";

type PlayerRow = {
  owner_id: string;
  name: string | null;
};

type CategoryRow = {
  id: string;
  code: string;
  label: string;
  points: number;
};

type BaseData = {
  currentAdminName: string;
  players: PlayerRow[];
  categories: CategoryRow[];
};

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<BaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/base-data");

        if (res.status === 401 || res.status === 403) {
          // non loggato o non admin → rimando al login
          router.push("/login");
          return;
        }

        if (!res.ok) {
          setErrorMsg("Errore nel caricamento dei dati Admin.");
          return;
        }

        const json = (await res.json()) as BaseData;
        setData(json);
      } catch (err) {
        console.error("Errore /api/admin/base-data", err);
        setErrorMsg("Errore di rete nel caricamento dei dati Admin.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  // LAYOUT COMUNE: sfondo Fanta Claus + card centrale
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: `${fantaPalette.bgGradient}, ${fantaPalette.snowDots}`,
          backgroundBlendMode: "normal",
          backgroundSize: "cover, 180px 180px",
          backgroundPosition: "center, 0 0",
          backgroundRepeat: "no-repeat, repeat",
          px: 2,
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={6}
            sx={{
              bgcolor: fantaPalette.cardBg,
              borderRadius: 4,
              p: { xs: 3, sm: 4 },
              border: `1px solid ${fantaPalette.cardBorder}`,
              boxShadow: fantaPalette.cardShadow,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 180,
            }}
          >
            <CircularProgress size={28} />
          </Paper>
        </Container>
      </Box>
    );
  }

  if (errorMsg || !data) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: `${fantaPalette.bgGradient}, ${fantaPalette.snowDots}`,
          backgroundBlendMode: "normal",
          backgroundSize: "cover, 180px 180px",
          backgroundPosition: "center, 0 0",
          backgroundRepeat: "no-repeat, repeat",
          px: 2,
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={6}
            sx={{
              bgcolor: fantaPalette.cardBg,
              borderRadius: 4,
              p: { xs: 3, sm: 4 },
              border: `1px solid ${fantaPalette.cardBorder}`,
              boxShadow: fantaPalette.cardShadow,
            }}
          >
            <Typography color="error">
              {errorMsg ?? "Si è verificato un errore."}
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `${fantaPalette.bgGradient}, ${fantaPalette.snowDots}`,
        backgroundBlendMode: "normal",
        backgroundSize: "cover, 180px 180px",
        backgroundPosition: "center, 0 0",
        backgroundRepeat: "no-repeat, repeat",
        px: 2,
        py: { xs: 3, md: 4 },
      }}
    >
      <Container maxWidth="lg">
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
          {/* Header area Admin */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: fantaPalette.textMuted,
              }}
            >
              Fanta Claus · Area Admin
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: fantaPalette.textPrimary }}
            >
              Ciao {data.currentAdminName}
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 0.5, color: fantaPalette.textSecondary }}
            >
              Da qui gestisci i regali, le categorie e i dati del gioco.
            </Typography>
          </Box>

          {/* Contenuto vero e proprio (gestione regali) */}
          <AdminRegaliClient
            currentAdminName={data.currentAdminName}
            players={data.players}
            categories={data.categories}
          />
        </Paper>
      </Container>
    </Box>
  );
}
