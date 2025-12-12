"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Stack,
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

export default function PodiumPublic() {
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
        setTeams(allTeams);
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
  }, []);

  const podiumStyles = [
    {
      label: "1° posto",
      bg: "linear-gradient(135deg, #facc15 0%, #f8ce25ff 60%, #c99b01ff 100%)",
      icon: "/icons/awards/gold.png",
    },
    {
      label: "2° posto",
      bg: "linear-gradient(135deg, #e5e7eb 0%, #9ca3af 60%, #6b7280 100%)",
      icon: "/icons/awards/silver.png",
    },
    {
      label: "3° posto",
      bg: "linear-gradient(135deg, #fed7aa 0%, #fb923c 60%, #c2410c 100%)",
      icon: "/icons/awards/bronze.png",
    },
  ];

  const topThree = teams.slice(0, 3);

  return (
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
      <Typography
        variant="h5"
        sx={{
          mb: 2,
          fontWeight: 700,
          fontSize: "2rem",
          color: fantaPalette.textPrimary,
          textAlign: "center",
        }}
      >
        Podio Fanta Claus
      </Typography>
      <Stack alignItems="center">
        <Image
          src="/logo/fantaclaus.png"
          alt="Fanta Claus"
          width={240}
          height={240}
          style={{ width: "auto", height: 200, display: "block" }}
          priority
        />
      </Stack>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Typography
          variant="body2"
          sx={{ color: "#b91c1c", textAlign: "center" }}
        >
          Errore nel caricamento della classifica: {error}
        </Typography>
      ) : topThree.length === 0 ? (
        <Typography
          variant="body2"
          sx={{ color: fantaPalette.textSecondary }}
        >
          Nessuna squadra con punteggio disponibile.
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            {topThree.map((team, index) => {
              const style = podiumStyles[index];

              return (
                <Box
                  key={team.ownerId}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    borderRadius: 3,
                    p: 2.5,
                    backgroundImage: style.bg,
                    color: "#ffffff",
                    boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, letterSpacing: "0.04em" }}
                    >
                      {style.label}
                    </Typography>

                    <Image
                      src={style.icon}
                      alt={style.label}
                      width={30}
                      height={30}
                      style={{ display: "block" }}
                    />
                  </Box>

                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {team.ownerName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {team.totalPoints} punti totali
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Bottone per andare alla classifica completa */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
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
