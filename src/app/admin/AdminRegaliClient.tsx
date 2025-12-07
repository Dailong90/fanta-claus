"use client";

import { useEffect, useState, useMemo } from "react";
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

type FilterMode = "all" | "missing" | "assigned";

export default function AdminRegaliClient({
  currentAdminName,
  players,
  categories,
}: AdminRegaliClientProps) {
  const [giftMap, setGiftMap] = useState<GiftMap>({});
  const [loadingGifts, setLoadingGifts] = useState(true);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

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

  // Statistiche: quanti hanno già una categoria assegnata
  const totalPlayers = players.length;
  const assignedCount = useMemo(() => {
    return players.filter((p) => {
      const g = giftMap[p.owner_id];
      return g && g.category_id;
    }).length;
  }, [players, giftMap]);

  // Lista filtrata in base al filtro selezionato
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const g = giftMap[p.owner_id];
      const hasCategory = !!g?.category_id;

      if (filterMode === "missing") return !hasCategory;
      if (filterMode === "assigned") return hasCategory;
      return true; // all
    });
  }, [players, giftMap, filterMode]);

  const saveGift = async (
    santa_owner_id: string,
    category_id: string,
    bonus_points: number
  ) => {
    if (!category_id) {
      // se non c'è categoria non salvo (puoi cambiare questa logica se vuoi)
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
        console.error(
          "Errore salvataggio gift per",
          santa_owner_id,
          await res.text()
        );
      }
    } catch (err) {
      console.error("Eccezione salvataggio gift per", santa_owner_id, err);
    } finally {
      setSavingFor(null);
    }
  };

  const handleChangeCategory = async (
    santa_owner_id: string,
    category_id: string
  ) => {
    setGiftMap((prev) => {
      const prevGift = prev[santa_owner_id] ?? { category_id: "", bonus_points: 0 };
      const updated: GiftMap = {
        ...prev,
        [santa_owner_id]: {
          category_id,
          bonus_points: prevGift.bonus_points,
        },
      };
      // Chiamo saveGift con i valori aggiornati
      saveGift(santa_owner_id, category_id, prevGift.bonus_points);
      return updated;
    });
  };

  const handleChangeBonus = async (
    santa_owner_id: string,
    bonusStr: string
  ) => {
    const bonus = Number.isFinite(Number(bonusStr)) ? Number(bonusStr) : 0;

    setGiftMap((prev) => {
      const prevGift = prev[santa_owner_id] ?? { category_id: "", bonus_points: 0 };
      const updatedGift = {
        category_id: prevGift.category_id,
        bonus_points: bonus,
      };

      const updated: GiftMap = {
        ...prev,
        [santa_owner_id]: updatedGift,
      };

      // Salvo solo se esiste già una categoria
      if (updatedGift.category_id) {
        saveGift(santa_owner_id, updatedGift.category_id, bonus);
      }

      return updated;
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "white",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Area Admin Fanta Claus 🎅
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 1, color: "gray.300" }}>
          Loggato come <strong>{currentAdminName}</strong>
        </Typography>

        {/* Riepilogo stato assegnazioni */}
        <Typography
          variant="body2"
          sx={{ mb: 3, color: "rgba(148,163,184,1)" }}
        >
          Regali assegnati:{" "}
          <strong>
            {assignedCount} / {totalPlayers}
          </strong>
        </Typography>

        <Stack spacing={3}>
          {/* Categorie regalo */}
          <Paper
            sx={{
              p: 2.5,
              bgcolor: "background.paper",
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
              bgcolor: "background.paper",
              borderRadius: 3,
              border: "1px solid rgba(148,163,184,0.4)",
            }}
          >
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography variant="h6">
                Assegna categoria di regalo ai partecipanti
              </Typography>

              {/* Filtro */}
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="filter-mode-label">Filtro</InputLabel>
                <Select
                  labelId="filter-mode-label"
                  value={filterMode}
                  label="Filtro"
                  onChange={(e) =>
                    setFilterMode(e.target.value as FilterMode)
                  }
                >
                  <MenuItem value="all">Tutti i partecipanti</MenuItem>
                  <MenuItem value="missing">
                    Solo senza categoria assegnata
                  </MenuItem>
                  <MenuItem value="assigned">
                    Solo con categoria assegnata
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            {loadingGifts ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : filteredPlayers.length === 0 ? (
              <Typography variant="body2">
                Nessun partecipante da mostrare con il filtro attuale.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "rgba(0, 156, 70, 1)" }}>
                      Partecipante
                    </TableCell>
                    <TableCell sx={{ color: "rgba(0, 156, 70, 1)" }}>
                      Categoria regalo
                    </TableCell>
                    <TableCell sx={{ color: "rgba(0, 156, 70, 1)" }}>
                      Bonus / malus
                    </TableCell>
                    <TableCell sx={{ color: "rgba(0, 156, 70, 1)" }}>
                      Stato
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPlayers.map((p) => {
                    const gift = giftMap[p.owner_id] ?? {
                      category_id: "",
                      bonus_points: 0,
                    };
                    const hasCategory = !!gift.category_id;

                    return (
                      <TableRow
                        key={p.owner_id}
                        sx={{
                          bgcolor: hasCategory
                            ? "rgba(16, 152, 66, 0.08)"
                            : "transparent",
                        }}
                      >
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
                                  {cat.label} (
                                  {cat.points >= 0
                                    ? `+${cat.points}`
                                    : cat.points}{" "}
                                  pt)
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
                              sx={{ color: "rgba(0, 0, 0, 1)" }}
                            >
                              Salvataggio...
                            </Typography>
                          ) : hasCategory ? (
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
