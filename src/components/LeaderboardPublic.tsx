"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Stack,
  Button,
} from "@mui/material";
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

type LeaderboardPublicProps = {
  title?: string;
  limit?: number; // es. 5 = top 5
  variant?: "compact" | "full";
};

export default function LeaderboardPublic({
  title = "Top 5 Fanta Claus",
  limit = 5,
  variant = "compact",
}: LeaderboardPublicProps) {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/leaderboard");
        if (!res.ok) {
          throw new Error("Errore nel recupero della classifica");
        }

        const data = (await res.json()) as { teams?: TeamScore[] };
        const allTeams = data.teams ?? [];

        setTeams(allTeams.slice(0, limit));
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Errore generico");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [limit]);

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 4,
        bgcolor: fantaPalette.cardBg,
        border: `1px solid ${fantaPalette.cardBorder}`,
        boxShadow: fantaPalette.cardShadow,
      }}
      elevation={4}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography
          variant={variant === "compact" ? "h6" : "h5"}
          sx={{ fontWeight: 600, color: fantaPalette.textPrimary }}
        >
          {title}
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Typography
          variant="body2"
          sx={{ color: "#f97373", textAlign: "center" }}
        >
          Errore nel caricamento della classifica: {error}
        </Typography>
      ) : teams.length === 0 ? (
        <Typography
          variant="body2"
          sx={{ textAlign: "center", color: fantaPalette.textSecondary }}
        >
          Nessuna squadra con punteggio disponibile.
        </Typography>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: fantaPalette.textSecondary }}>
                  Posizione
                </TableCell>
                <TableCell sx={{ color: fantaPalette.textSecondary }}>
                  Giocatore
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
                    {/* POSIZIONE + ICONA */}
                    <TableCell sx={{ width: "90px" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <span>{index + 1}</span>

                        {index === 0 && (
                            <img
                            src="/icons/awards/gold.png"
                            alt="Gold"
                            width={26}
                            height={26}
                            style={{ display: "block" }}
                            />
                        )}

                        {index === 1 && (
                            <img
                            src="/icons/awards/silver.png"
                            alt="Silver"
                            width={26}
                            height={26}
                            style={{ display: "block" }}
                            />
                        )}

                        {index === 2 && (
                            <img
                            src="/icons/awards/bronze.png"
                            alt="Bronze"
                            width={26}
                            height={26}
                            style={{ display: "block" }}
                            />
                        )}
                        </Box>
                    </TableCell>

                    {/* NOME GIOCATORE */}
                    <TableCell>{t.ownerName}</TableCell>

                    {/* PUNTI */}
                    <TableCell align="right">{t.totalPoints}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Bottone per classifica completa */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Button
            component={Link}
            href="/classifica"
            size="large"
            sx={{
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 999,
                backgroundImage: fantaPalette.buttonGradient,
                color: fantaPalette.buttonText,
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                "&:hover": {
                backgroundImage: fantaPalette.buttonGradientHover,
                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                },
            }}
            >
            Classifica completa
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
}
