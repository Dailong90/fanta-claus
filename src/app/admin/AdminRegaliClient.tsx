"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
} from "@mui/material";

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

type GiftRow = {
  santa_owner_id: string;
  receiver_owner_id: string | null;
  category_id: string;
  bonus_points: number;
};

type AdminRegaliClientProps = {
  currentAdminName: string;
  players: PlayerRow[];
  categories: CategoryRow[];
};

type GiftMap = Record<
  string,
  {
    category_id: string;
    bonus_points: number;
  }
>;

export default function AdminRegaliClient({
  currentAdminName,
  players,
  categories,
}: AdminRegaliClientProps) {
  const [giftMap, setGiftMap] = useState<GiftMap>({});
  const [loadingGifts, setLoadingGifts] = useState(true);
  const [savingFor, setSavingFor] = useState<string | null>(null);

  // Carica i gift esistenti da /api/admin/gifts
  useEffect(() => {
    const loadGifts = async () => {
      try {
        const res = await fetch("/api/admin/gifts");
        if (!res.ok) {
          console.error("Errore caricamento gifts", await res.text());
          setLoadingGifts(false);
          return;
        }
        const data = (await res.json()) as { gifts: GiftRow[] };
        const map: GiftMap = {};
        data.gifts.forEach((g) => {
          map[g.santa_owner_id] = {
            category_id: g.category_id,
            bonus_points: g.bonus_points ?? 0,
          };
        });
        setGiftMap(map);
      } catch (err) {
        console.error("Eccezione caricamento gifts", err);
      } finally {
        setLoadingGifts(false);
      }
    };

    loadGifts();
  }, []);

  const handleChangeCategory = async (
    santa_owner_id: string,
    category_id: string
  ) => {
    setGiftMap((prev) => ({
      ...prev,
      [santa_owner_id]: {
        category_id,
        bonus_points: prev[santa_owner_id]?.bonus_points ?? 0,
      },
    }));

    await saveGift(santa_owner_id, category_id, giftMap[santa_owner_id]?.bonus_points ?? 0);
  };

  const handleChangeBonus = async (
    santa_owner_id: string,
    bonusStr: string
  ) => {
    const bonus = Number.isFinite(Number(bonusStr)) ? Number(bonusStr) : 0;

    setGiftMap((prev) => ({
      ...prev,
      [santa_owner_id]: {
        category_id: prev[santa_owner_id]?.category_id ?? "",
        bonus_points: bonus,
      },
    }));

    await saveGift(
      santa_owner_id,
      giftMap[santa_owner_id]?.category_id ?? "",
      bonus
    );
  };

  const saveGift = async (
    santa_owner_id: string,
    category_id: string,
    bonus_points: number
  ) => {
    if (!category_id) {
      // se non c'è categoria non salvo nulla (puoi cambiare questa logica)
      return;
    }

    try {
      setSavingFor(santa_owner_id);
      const res = await fetch("/api/admin/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          santa_owner_id,
          category_id,
          bonus_points,
        }),
      });

      if (!res.ok) {
        console.error("Errore salvataggio gift per", santa_owner_id, await res.text());
      }
    } catch (err) {
      console.error("Eccezione salvataggio gift per", santa_owner_id, err);
    } finally {
      setSavingFor(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#020617",
        color: "white",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Area Admin Fanta Claus 🎅
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3, color: "gray.300" }}>
          Loggato come <strong>{currentAdminName}</strong>
        </Typography>

        <Stack spacing={3}>
          {/* Categorie regalo */}
          <Paper
            sx={{
              p: 2.5,
              bgcolor: "rgba(15,23,42,0.9)",
              borderRadius: 3,
              border: "1px solid rgba(148,163,184,0.4)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Categorie regalo e punteggi
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                    Codice
                  </TableCell>
                  <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                    Nome
                  </TableCell>
                  <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                    Punti
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <Chip
                        label={cat.code}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>{cat.label}</TableCell>
                    <TableCell>
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: 600,
                          color: cat.points >= 0 ? "#4ade80" : "#f97373",
                        }}
                      >
                        {cat.points >= 0 ? `+${cat.points}` : cat.points}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {/* Assegnazione regali per partecipante */}
          <Paper
            sx={{
              p: 2.5,
              bgcolor: "rgba(15,23,42,0.9)",
              borderRadius: 3,
              border: "1px solid rgba(148,163,184,0.4)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Assegna categoria di regalo ai partecipanti
            </Typography>

            {loadingGifts ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                      Partecipante
                    </TableCell>
                    <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                      Categoria regalo
                    </TableCell>
                    <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                      Bonus / malus
                    </TableCell>
                    <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                      Stato
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {players.map((p) => {
                    const gift = giftMap[p.owner_id] ?? {
                      category_id: "",
                      bonus_points: 0,
                    };

                    return (
                      <TableRow key={p.owner_id}>
                        <TableCell>
                          <Box>
                            <Typography>{p.name ?? "(senza nome)"}</Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "rgba(148,163,184,0.9)" }}
                            >
                              ID: {p.owner_id}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <FormControl fullWidth size="small">
                            <InputLabel id={`cat-label-${p.owner_id}`}>
                              Categoria
                            </InputLabel>
                            <Select
                              labelId={`cat-label-${p.owner_id}`}
                              label="Categoria"
                              value={gift.category_id}
                              onChange={(e) =>
                                handleChangeCategory(
                                  p.owner_id,
                                  e.target.value as string
                                )
                              }
                            >
                              <MenuItem value="">
                                <em>Nessuna</em>
                              </MenuItem>
                              {categories.map((cat) => (
                                <MenuItem key={cat.id} value={cat.id}>
                                  {cat.label} ({cat.points >= 0 ? `+${cat.points}` : cat.points} pt)
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>

                        <TableCell sx={{ maxWidth: 120 }}>
                          <TextField
                            size="small"
                            type="number"
                            label="Bonus"
                            value={gift.bonus_points}
                            onChange={(e) =>
                              handleChangeBonus(p.owner_id, e.target.value)
                            }
                            inputProps={{ style: { color: "white" } }}
                          />
                        </TableCell>

                        <TableCell>
                          {savingFor === p.owner_id ? (
                            <Typography
                              variant="caption"
                              sx={{ color: "rgba(96,165,250,1)" }}
                            >
                              Salvataggio...
                            </Typography>
                          ) : gift.category_id ? (
                            <Typography
                              variant="caption"
                              sx={{ color: "rgba(52,211,153,1)" }}
                            >
                              Salvato
                            </Typography>
                          ) : (
                            <Typography
                              variant="caption"
                              sx={{ color: "rgba(148,163,184,0.9)" }}
                            >
                              Nessuna categoria
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
