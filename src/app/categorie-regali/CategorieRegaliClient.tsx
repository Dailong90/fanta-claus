"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "@mui/material";
import { fantaPalette } from "@/theme/fantaPalette";

type CategoryRow = {
  id: string;
  code: string;
  label: string;
  points: number;
};

export default function CategorieRegaliClient() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Guard: solo loggati (stesso approccio della navbar)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ownerId = window.localStorage.getItem("fanta_owner_id");
    if (!ownerId) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) {
          console.error("Errore /api/categories", await res.text());
          setError("Errore nel caricamento delle categorie.");
          return;
        }

        const json = (await res.json()) as { categories: CategoryRow[] };
        setCategories(json.categories ?? []);
      } catch (e) {
        console.error("Errore rete /api/categories:", e);
        setError("Errore di rete nel caricamento delle categorie.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.label.localeCompare(b.label, "it");
    });
  }, [categories]);

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
            Categorie Regali
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{ mb: 3, color: fantaPalette.textSecondary }}
          >
            Qui trovi tutte le categorie con i rispettivi punti.
          </Typography>

          {loading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : error ? (
            <Typography variant="body2" sx={{ color: "#b91c1c" }}>
              {error}
            </Typography>
          ) : sorted.length === 0 ? (
            <Typography sx={{ color: fantaPalette.textPrimary }}>
              Nessuna categoria disponibile.
            </Typography>
          ) : (
            <Box sx={{ width: "100%", overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: fantaPalette.textSecondary }}>
                      Categoria
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
                  {sorted.map((cat) => (
                    <TableRow key={cat.id} hover>
                      
                      <TableCell sx={{ color: fantaPalette.textPrimary }}>
                        {cat.label}
                      </TableCell>

                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color:
                            cat.points >= 0 ? "#16a34a" : "#b91c1c",
                        }}
                      >
                        {cat.points >= 0 ? `+${cat.points}` : cat.points} pt
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
