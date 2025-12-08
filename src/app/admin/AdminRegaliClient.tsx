"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Collapse,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

type PlayerRow = {
  owner_id: string;
  name: string | null;
};

export type CategoryRow = {
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

type CategoryDialogState = {
  open: boolean;
  mode: "create" | "edit";
  targetId?: string;
};

type VoteType = "best_wrapping" | "worst_wrapping" | "most_fitting";

type VotePointsConfig = Record<VoteType, number>;

type LeaderboardMember = {
  id: string;
  name: string;
  points: number;
  isCaptain: boolean;
};

type LeaderboardTeam = {
  ownerId: string;
  ownerName: string;
  totalPoints: number;
  members: LeaderboardMember[];
};

type VotingWinner = {
  ownerId: string;
  ownerName: string;
  votes: number;
  pointsAwarded: number;
};

type LeaderboardVotingWinners = Record<
  VoteType,
  {
    winners: VotingWinner[];
  }
>;

/** Riga di dettaglio per ogni voto singolo (ritorno dalla API) */
type LeaderboardVoteDetail = {
  voterOwnerId: string;
  voterName: string;
  targetOwnerId: string;
  targetName: string;
  voteType: string;
};

type LeaderboardApiResponse = {
  teams: LeaderboardTeam[];
  voting?: LeaderboardVotingWinners;
  votesDetail?: LeaderboardVoteDetail[];
};

const VOTE_LABELS: Record<VoteType, string> = {
  best_wrapping: "Pacco meglio realizzato",
  worst_wrapping: "Pacco peggio realizzato",
  most_fitting: "Pacco più azzeccato",
};

// Helpers per formattare la data nel campo datetime-local
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDeadlineLabel(iso: string | null): string {
  if (!iso) return "Non impostata";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Non impostata";
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminRegaliClient({
  players,
  categories,
}: AdminRegaliClientProps) {
  const router = useRouter();

  // 🔹 Categorie (stato locale modificabile)
  const [categoriesState, setCategoriesState] =
    useState<CategoryRow[]>(categories);

  // 🔹 Regali
  const [giftMap, setGiftMap] = useState<GiftMap>({});
  const [loadingGifts, setLoadingGifts] = useState(true);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // 🔹 Dialog gestione categorie
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>({
    open: false,
    mode: "create",
  });
  const [categoryForm, setCategoryForm] = useState<{
    code: string;
    label: string;
    points: string;
  }>({
    code: "",
    label: "",
    points: "0",
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // 🔹 Dialog delete categoria
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  // 🔹 Classifica: anteprima + stato pubblicazione
  const [leaderboardPreview, setLeaderboardPreview] = useState<
    LeaderboardTeam[] | null
  >(null);
  const [leaderboardVoting, setLeaderboardVoting] =
    useState<LeaderboardVotingWinners | null>(null);

  /** dettaglio di tutti i voti (righe singole) */
  const [leaderboardVotesDetail, setLeaderboardVotesDetail] = useState<
    LeaderboardVoteDetail[]
  >([]);

  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const [publishLoading, setPublishLoading] = useState(false);
  const [isLeaderboardPublished, setIsLeaderboardPublished] = useState<
    boolean | null
  >(null);

  // 🔹 Config punti votazioni
  const [votePoints, setVotePoints] = useState<VotePointsConfig>({
    best_wrapping: 0,
    worst_wrapping: 0,
    most_fitting: 0,
  });
  const [votePointsLoading, setVotePointsLoading] = useState(false);
  const [votePointsSaving, setVotePointsSaving] = useState(false);

  // 🔹 Scadenza squadre
  const [deadlineIso, setDeadlineIso] = useState<string | null>(null);
  const [deadlineInput, setDeadlineInput] = useState<string>("");
  const [deadlineLoading, setDeadlineLoading] = useState(false);
  const [deadlineSaving, setDeadlineSaving] = useState(false);

  const deadlineLabel = useMemo(
    () => formatDeadlineLabel(deadlineIso),
    [deadlineIso]
  );

  // se il server aggiorna le categorie, aggiorno lo stato locale
  useEffect(() => {
    setCategoriesState(categories);
  }, [categories]);

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

  // Carica stato pubblicazione classifica
  useEffect(() => {
    const loadPublishStatus = async () => {
      try {
        const res = await fetch("/api/admin/leaderboard-publish");
        if (!res.ok) {
          console.error("Errore lettura stato classifica", await res.text());
          return;
        }
        const json = (await res.json()) as { published: boolean };
        setIsLeaderboardPublished(json.published);
      } catch (err) {
        console.error("Errore rete stato classifica", err);
      }
    };

    loadPublishStatus();
  }, []);

  // Carica config punti votazioni
  useEffect(() => {
    const loadVotePoints = async () => {
      setVotePointsLoading(true);
      try {
        const res = await fetch("/api/admin/vote-points");
        if (!res.ok) {
          console.error("Errore lettura vote-points", await res.text());
          return;
        }
        const json = (await res.json()) as {
          votePoints: VotePointsConfig;
        };
        setVotePoints(json.votePoints);
      } catch (err) {
        console.error("Errore rete vote-points", err);
      } finally {
        setVotePointsLoading(false);
      }
    };

    loadVotePoints();
  }, []);

  // Carica scadenza squadre
  useEffect(() => {
    const loadDeadline = async () => {
      setDeadlineLoading(true);
      try {
        const res = await fetch("/api/admin/team-deadline");
        if (!res.ok) {
          console.error(
            "Errore lettura team-deadline",
            await res.text()
          );
          return;
        }
        const json = (await res.json()) as { deadlineIso: string | null };
        setDeadlineIso(json.deadlineIso);
        setDeadlineInput(
          json.deadlineIso ? isoToLocalInput(json.deadlineIso) : ""
        );
      } catch (err) {
        console.error("Errore rete team-lock-deadline", err);
      } finally {
        setDeadlineLoading(false);
      }
    };

    loadDeadline();
  }, []);

  // Statistiche: quanti hanno già una categoria assegnata
  const totalPlayers = players.length;
  const assignedCount = useMemo(
    () =>
      players.filter((p) => {
        const g = giftMap[p.owner_id];
        return g && g.category_id;
      }).length,
    [players, giftMap]
  );

  // Lista filtrata in base al filtro selezionato
  const filteredPlayers = useMemo(
    () =>
      players.filter((p) => {
        const g = giftMap[p.owner_id];
        const hasCategory = !!g?.category_id;

        if (filterMode === "missing") return !hasCategory;
        if (filterMode === "assigned") return hasCategory;
        return true; // all
      }),
    [players, giftMap, filterMode]
  );

  const saveGift = async (
    santa_owner_id: string,
    category_id: string,
    bonus_points: number
  ) => {
    if (!category_id) {
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

  const handleChangeCategory = (
    santa_owner_id: string,
    category_id: string
  ) => {
    setGiftMap((prev) => {
      const prevGift = prev[santa_owner_id] ?? {
        category_id: "",
        bonus_points: 0,
      };
      const updated: GiftMap = {
        ...prev,
        [santa_owner_id]: {
          category_id,
          bonus_points: prevGift.bonus_points,
        },
      };
      void saveGift(santa_owner_id, category_id, prevGift.bonus_points);
      return updated;
    });
  };

  const handleChangeBonus = (santa_owner_id: string, bonusStr: string) => {
    const bonus = Number.isFinite(Number(bonusStr)) ? Number(bonusStr) : 0;

    setGiftMap((prev) => {
      const prevGift = prev[santa_owner_id] ?? {
        category_id: "",
        bonus_points: 0,
      };
      const updatedGift = {
        category_id: prevGift.category_id,
        bonus_points: bonus,
      };

      const updated: GiftMap = {
        ...prev,
        [santa_owner_id]: updatedGift,
      };

      if (updatedGift.category_id) {
        void saveGift(santa_owner_id, updatedGift.category_id, bonus);
      }

      return updated;
    });
  };

  // ──────────────────────────────────────────────
  // Gestione categorie: create / edit / delete
  // ──────────────────────────────────────────────

  const openCreateCategoryDialog = () => {
    setCategoryForm({
      code: "",
      label: "",
      points: "0",
    });
    setCategoryDialog({ open: true, mode: "create" });
  };

  const openEditCategoryDialog = (cat: CategoryRow) => {
    setCategoryForm({
      code: cat.code,
      label: cat.label,
      points: String(cat.points),
    });
    setCategoryDialog({
      open: true,
      mode: "edit",
      targetId: cat.id,
    });
  };

  const closeCategoryDialog = () => {
    setCategoryDialog((prev) => ({ ...prev, open: false }));
  };

  const handleSubmitCategory = async () => {
    const pointsNumber = Number(categoryForm.points) || 0;

    setSavingCategory(true);
    try {
      if (categoryDialog.mode === "create") {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: categoryForm.code.trim(),
            label: categoryForm.label.trim(),
            points: pointsNumber,
          }),
        });

        if (!res.ok) {
          console.error("Errore creazione categoria", await res.text());
          return;
        }

        const json = (await res.json()) as { category: CategoryRow };
        setCategoriesState((prev) => [...prev, json.category]);
      } else if (categoryDialog.mode === "edit" && categoryDialog.targetId) {
        const res = await fetch("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: categoryDialog.targetId,
            code: categoryForm.code.trim(),
            label: categoryForm.label.trim(),
            points: pointsNumber,
          }),
        });

        if (!res.ok) {
          console.error("Errore aggiornamento categoria", await res.text());
          return;
        }

        const json = (await res.json()) as { category: CategoryRow };
        setCategoriesState((prev) =>
          prev.map((c) => (c.id === json.category.id ? json.category : c))
        );
      }
      closeCategoryDialog();
    } catch (err) {
      console.error("Errore salvataggio categoria", err);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deleteTarget) return;

    setDeletingCategory(true);
    try {
      const res = await fetch(
        `/api/admin/categories?id=${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        let msg = "Errore eliminazione categoria";
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) msg = body.error;
        } catch {
          // ignore
        }

        alert(msg);
        console.error("Errore eliminazione categoria", msg);
        return;
      }

      setCategoriesState((prev) =>
        prev.filter((c) => c.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
    } catch (err) {
      console.error("Errore eliminazione categoria", err);
      alert("Errore inatteso durante l'eliminazione della categoria.");
    } finally {
      setDeletingCategory(false);
    }
  };

  // ──────────────────────────────────────────────
  // Config punti votazioni
  // ──────────────────────────────────────────────

  const handleChangeVotePointsField = (key: VoteType, value: string) => {
    const num = Number.isFinite(Number(value)) ? Number(value) : 0;
    setVotePoints((prev) => ({
      ...prev,
      [key]: num,
    }));
  };

  const handleSaveVotePoints = async () => {
    setVotePointsSaving(true);
    try {
      const res = await fetch("/api/admin/vote-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(votePoints),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          body?.error ?? "Errore nel salvataggio dei punti votazioni.";
        alert(msg);
        return;
      }

      alert("Punti votazioni salvati.");
    } catch (err) {
      console.error("Errore salvataggio vote-points", err);
      alert("Errore inatteso nel salvataggio dei punti.");
    } finally {
      setVotePointsSaving(false);
    }
  };

  // ──────────────────────────────────────────────
  // Gestione scadenza squadre
  // ──────────────────────────────────────────────

  const handleSaveDeadline = async () => {
    setDeadlineSaving(true);
    try {
      const iso =
        deadlineInput.trim() === ""
          ? null
          : new Date(deadlineInput).toISOString();

      const res = await fetch("/api/admin/team-deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadlineIso: iso }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          body?.error ?? "Errore nel salvataggio della data di scadenza.";
        alert(msg);
        return;
      }

      setDeadlineIso(iso);
      alert("Data limite aggiornata.");
    } catch (err) {
      console.error("Errore salvataggio team-lock-deadline", err);
      alert("Errore inatteso nel salvataggio della data.");
    } finally {
      setDeadlineSaving(false);
    }
  };

  // ──────────────────────────────────────────────
  // Classifica: anteprima + pubblicazione
  // ──────────────────────────────────────────────

  const handleLoadLeaderboardPreview = async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) {
        setLeaderboardError("Errore nel caricamento della classifica.");
        return;
      }
      const json = (await res.json()) as LeaderboardApiResponse;
      setLeaderboardPreview(json.teams);
      setLeaderboardVoting(json.voting ?? null);
      setLeaderboardVotesDetail(json.votesDetail ?? []);
    } catch (err) {
      console.error("Errore rete classifica", err);
      setLeaderboardError(
        "Errore di rete nel caricamento della classifica."
      );
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handlePublishLeaderboard = async () => {
    setPublishLoading(true);
    try {
      const res = await fetch("/api/admin/leaderboard-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });

      if (!res.ok) {
        let msg = "Errore nella pubblicazione della classifica.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) msg = body.error;
        } catch {
          // ignore
        }
        alert(msg);
        return;
      }

      setIsLeaderboardPublished(true);
      alert("Classifica pubblicata/aggiornata!");
    } catch (err) {
      console.error("Errore pubblicazione classifica", err);
      alert("Errore inatteso nella pubblicazione della classifica.");
    } finally {
      setPublishLoading(false);
    }
  };

  const leaderboardPublishedLabel =
    isLeaderboardPublished === true
      ? "Classifica pubblicata"
      : isLeaderboardPublished === false
      ? "Classifica NON ancora pubblicata"
      : "Stato classifica sconosciuto";

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────

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
        {/* Header area admin + bottone Profilo */}
        <Box
          sx={{
            mb: 2.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => router.push("/profilo")}
            sx={{
              textTransform: "none",
              borderRadius: 999,
            }}
          >
            Vai al profilo
          </Button>
        </Box>

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
          {/* GESTIONE CLASSIFICA */}
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
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography variant="h6">Classifica Fanta Claus</Typography>

              <Stack direction="row" spacing={1.5}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleLoadLeaderboardPreview}
                  disabled={leaderboardLoading}
                  sx={{ textTransform: "none" }}
                >
                  {leaderboardLoading
                    ? "Caricamento..."
                    : "Genera anteprima classifica"}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={handlePublishLeaderboard}
                  disabled={publishLoading}
                  sx={{ textTransform: "none" }}
                >
                  {publishLoading
                    ? "Pubblicazione..."
                    : "Pubblica / aggiorna classifica"}
                </Button>
              </Stack>
            </Box>

            <Typography
              variant="body2"
              sx={{ mb: 2, color: "rgba(148,163,184,0.9)" }}
            >
              {leaderboardPublishedLabel}
            </Typography>

            {leaderboardError && (
              <Typography variant="body2" sx={{ mb: 1, color: "#f97373" }}>
                {leaderboardError}
              </Typography>
            )}

            {leaderboardPreview && leaderboardPreview.length > 0 && (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                        Posizione
                      </TableCell>
                      <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                        Squadra
                      </TableCell>
                      <TableCell sx={{ color: "rgba(148,163,184,1)" }}>
                        Punti totali
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: "rgba(148,163,184,1)" }}
                      >
                        Dettaglio
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaderboardPreview.map((team, index) => {
                      const isExpanded = expandedTeamId === team.ownerId;

                      return (
                        <React.Fragment key={team.ownerId}>
                          {/* Riga principale */}
                          <TableRow hover>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{team.ownerName}</TableCell>
                            <TableCell>{team.totalPoints}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setExpandedTeamId(
                                    isExpanded ? null : team.ownerId
                                  )
                                }
                              >
                                {isExpanded ? (
                                  <ExpandLessIcon fontSize="small" />
                                ) : (
                                  <ExpandMoreIcon fontSize="small" />
                                )}
                              </IconButton>
                            </TableCell>
                          </TableRow>

                          {/* Riga dettaglio squadra */}
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              sx={{
                                py: 0,
                                bgcolor: "white",
                                color: "black",
                                borderTop: "1px solid rgba(0,0,0,0.1)",
                              }}
                            >
                              <Collapse
                                in={isExpanded}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box sx={{ py: 1.5, px: 2 }}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      mb: 1,
                                      color: "rgba(51,65,85,0.9)",
                                    }}
                                  >
                                    Componenti della squadra
                                  </Typography>

                                  <Table size="small" sx={{ bgcolor: "white" }}>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell
                                          sx={{
                                            color: "rgba(51,65,85,1)",
                                          }}
                                        >
                                          Giocatore
                                        </TableCell>
                                        <TableCell
                                          sx={{
                                            color: "rgba(51,65,85,1)",
                                          }}
                                        >
                                          Punti
                                        </TableCell>
                                        <TableCell
                                          sx={{
                                            color: "rgba(51,65,85,1)",
                                          }}
                                        >
                                          Ruolo
                                        </TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {team.members.map((m) => (
                                        <TableRow key={m.id}>
                                          <TableCell>{m.name}</TableCell>
                                          <TableCell>{m.points}</TableCell>
                                          <TableCell>
                                            {m.isCaptain ? "Capitano" : "—"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* RISULTATI VOTAZIONI + DETTAGLIO */}
                {leaderboardVoting && (
                  <Paper
                    sx={{
                      mt: 3,
                      p: 2,
                      bgcolor: "#ffffff",
                      borderRadius: 2,
                      border: "1px solid rgba(148,163,184,0.4)",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        mb: 1.5,
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      Risultati votazioni pacchi
                    </Typography>

                    {(Object.keys(VOTE_LABELS) as VoteType[]).map((vt) => {
                      const section = leaderboardVoting[vt];
                      if (!section || section.winners.length === 0) {
                        return (
                          <Typography
                            key={vt}
                            variant="body2"
                            sx={{ color: "#6b7280" }}
                          >
                            {VOTE_LABELS[vt]}: nessun voto registrato.
                          </Typography>
                        );
                      }

                      return (
                        <Box key={vt} sx={{ mb: 1.5 }}>
                          <Typography
                            variant="body2"
                            sx={{ color: "#374151", fontWeight: 500 }}
                          >
                            {VOTE_LABELS[vt]}:
                          </Typography>
                          {section.winners.map((w) => (
                            <Typography
                              key={w.ownerId}
                              variant="body2"
                              sx={{ ml: 2, color: "#111827" }}
                            >
                              {w.ownerName} — {w.votes} voti,{" "}
                              {w.pointsAwarded >= 0
                                ? `+${w.pointsAwarded}`
                                : w.pointsAwarded}{" "}
                              pt
                            </Typography>
                          ))}
                        </Box>
                      );
                    })}

                    {leaderboardVotesDetail.length > 0 && (
                      <>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            mt: 2.5,
                            mb: 1,
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          Dettaglio voti registrati
                        </Typography>

                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Chi ha votato
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Ha votato per
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                Tipo di voto
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {leaderboardVotesDetail.map((v, idx) => (
                              <TableRow
                                key={`${v.voterOwnerId}-${v.targetOwnerId}-${idx}`}
                              >
                                <TableCell>{v.voterName}</TableCell>
                                <TableCell>{v.targetName}</TableCell>
                                <TableCell>
                                  {VOTE_LABELS[v.voteType as VoteType] ??
                                    v.voteType}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    )}
                  </Paper>
                )}
              </>
            )}
          </Paper>

          {/* CONFIG SCADENZA SQUADRE */}
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
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="h6">
                Data limite per la composizione delle squadre
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={handleSaveDeadline}
                disabled={deadlineSaving || deadlineLoading}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                {deadlineSaving ? "Salvataggio..." : "Salva scadenza"}
              </Button>
            </Box>

            {deadlineLoading ? (
              <Box sx={{ py: 2, textAlign: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <TextField
                  label="Data e ora limite"
                  type="datetime-local"
                  size="small"
                  value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ maxWidth: 260 }}
                />
                <Typography
                  variant="body2"
                  sx={{ mt: 1.5, color: "rgba(148,163,184,0.9)" }}
                >
                  Scadenza attuale: <strong>{deadlineLabel}</strong>
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.5,
                    display: "block",
                    color: "rgba(148,163,184,0.8)",
                  }}
                >
                  Questa data viene usata dalla pagina profilo per bloccare la
                  modifica delle squadre e abilitare le votazioni.
                </Typography>
              </>
            )}
          </Paper>

          {/* CONFIG PUNTI VOTAZIONI */}
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
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Typography variant="h6">
                Punti per le votazioni dei pacchi
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={handleSaveVotePoints}
                disabled={votePointsSaving || votePointsLoading}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                {votePointsSaving ? "Salvataggio..." : "Salva punti voti"}
              </Button>
            </Box>

            {votePointsLoading ? (
              <Box sx={{ py: 2, textAlign: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label={VOTE_LABELS.best_wrapping}
                  type="number"
                  size="small"
                  value={votePoints.best_wrapping}
                  onChange={(e) =>
                    handleChangeVotePointsField(
                      "best_wrapping",
                      e.target.value
                    )
                  }
                />
                <TextField
                  label={VOTE_LABELS.worst_wrapping}
                  type="number"
                  size="small"
                  value={votePoints.worst_wrapping}
                  onChange={(e) =>
                    handleChangeVotePointsField(
                      "worst_wrapping",
                      e.target.value
                    )
                  }
                />
                <TextField
                  label={VOTE_LABELS.most_fitting}
                  type="number"
                  size="small"
                  value={votePoints.most_fitting}
                  onChange={(e) =>
                    handleChangeVotePointsField(
                      "most_fitting",
                      e.target.value
                    )
                  }
                />
              </Box>
            )}
          </Paper>

          {/* CATEGORIE REGALO E PUNTEGGI */}
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
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Typography variant="h6">
                Categorie regalo e punteggi
              </Typography>

              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                sx={{
                  textTransform: "none",
                  borderRadius: 999,
                }}
                onClick={openCreateCategoryDialog}
              >
                Nuova categoria
              </Button>
            </Box>

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
                  <TableCell
                    align="right"
                    sx={{ color: "rgba(148,163,184,1)" }}
                  >
                    Azioni
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categoriesState.map((cat) => (
                  <TableRow key={cat.id} hover>
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
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openEditCategoryDialog(cat)}
                        sx={{ mr: 0.5 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(cat)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
                              {categoriesState.map((cat) => (
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

      {/* Dialog CREA / EDIT categoria */}
      <Dialog
        open={categoryDialog.open}
        onClose={savingCategory ? undefined : closeCategoryDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {categoryDialog.mode === "create"
            ? "Nuova categoria"
            : "Modifica categoria"}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            margin="dense"
            label="Codice"
            fullWidth
            value={categoryForm.code}
            onChange={(e) =>
              setCategoryForm((prev) => ({ ...prev, code: e.target.value }))
            }
          />
          <TextField
            margin="dense"
            label="Nome"
            fullWidth
            value={categoryForm.label}
            onChange={(e) =>
              setCategoryForm((prev) => ({ ...prev, label: e.target.value }))
            }
          />
          <TextField
            margin="dense"
            label="Punti"
            type="number"
            fullWidth
            value={categoryForm.points}
            onChange={(e) =>
              setCategoryForm((prev) => ({ ...prev, points: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCategoryDialog} disabled={savingCategory}>
            Annulla
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitCategory}
            disabled={savingCategory}
          >
            {savingCategory ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog CONFERMA DELETE categoria */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={deletingCategory ? undefined : () => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Elimina categoria</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vuoi davvero eliminare la categoria{" "}
            <strong>{deleteTarget?.label}</strong>? Questa operazione non può
            essere annullata. Se la categoria è già stata usata in qualche
            regalo, l&apos;eliminazione verrà bloccata.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deletingCategory}
          >
            Annulla
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteCategory}
            disabled={deletingCategory}
          >
            {deletingCategory ? "Eliminazione..." : "Elimina"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
