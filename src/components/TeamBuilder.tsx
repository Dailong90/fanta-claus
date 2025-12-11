"use client";

import { useEffect, useState } from "react";
import type { Participant } from "@/data/participants";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import RedeemIcon from "@mui/icons-material/Redeem";
import { supabase } from "@/lib/supabaseClient";
import { fantaPalette } from "@/theme/fantaPalette";

type TeamBuilderProps = {
  participants: Participant[];
  playerId: string;
  isLocked: boolean;
  maxMembers?: number;
  onTeamStateChange?: (state: {
    selectedCount: number;
    isComplete: boolean;
    hasCaptain: boolean;
  }) => void;
};

type StoredTeam = {
  owner_id: string;
  members: string[];
  captain_id: string | null;
};

/** Struttura usata nel localStorage nelle versioni nuove */
type LocalStorageTeamObject = {
  members: string[];
  captainId?: string | null;
};

function isLocalStorageTeamObject(
  value: unknown
): value is LocalStorageTeamObject {
  if (typeof value !== "object" || value === null) return false;
  if (!("members" in value)) return false;

  const maybeMembers = (value as { members: unknown }).members;
  return (
    Array.isArray(maybeMembers) &&
    maybeMembers.every((m) => typeof m === "string")
  );
}

export default function TeamBuilder({
  participants,
  playerId,
  isLocked,
  maxMembers = 7,
  onTeamStateChange,
}: TeamBuilderProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [highlightedCaptainId, setHighlightedCaptainId] =
    useState<string>("");

  const storageKey = `fanta_claus_team_${playerId}`;

  // Carica squadra: prima da Supabase, poi eventualmente da localStorage
  useEffect(() => {
    const loadTeam = async () => {
      setLoading(true);

      console.log("🔎 Carico squadra da Supabase per", playerId);

      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", playerId)
        .maybeSingle();

      if (error) {
        console.error("❌ Errore Supabase loadTeam", error);
      }

      if (data) {
        const team = data as StoredTeam;
        console.log("✅ Squadra trovata su Supabase:", team);
        setSelectedIds(team.members || []);
        setCaptainId(team.captain_id || "");
        setLoading(false);
        return;
      }

      // Fallback vecchia versione: localStorage
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          try {
            const parsed: unknown = JSON.parse(raw);

            // Vecchio formato: array semplice di ID
            if (
              Array.isArray(parsed) &&
              parsed.every((m) => typeof m === "string")
            ) {
              setSelectedIds(parsed as string[]);
              setCaptainId("");
            }
            // Nuovo formato: oggetto { members, captainId }
            else if (isLocalStorageTeamObject(parsed)) {
              setSelectedIds(parsed.members);
              setCaptainId(
                typeof parsed.captainId === "string" ? parsed.captainId : ""
              );
            } else {
              setSelectedIds([]);
              setCaptainId("");
            }
          } catch (e) {
            console.error("Errore parse squadra localStorage", e);
            setSelectedIds([]);
            setCaptainId("");
          }
        } else {
          setSelectedIds([]);
          setCaptainId("");
        }
      }

      setLoading(false);
    };

    loadTeam();
  }, [playerId, storageKey]);

  // Salva squadra su Supabase (e in localStorage) quando cambia
  useEffect(() => {
    const saveTeam = async () => {
      // Salvo sempre in locale (cache)
      if (typeof window !== "undefined") {
        const payloadLocal: LocalStorageTeamObject = {
          members: selectedIds,
          captainId: captainId || null,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payloadLocal));
      }

      // Se la squadra è bloccata, non mando nulla a Supabase
      if (isLocked) {
        console.log(
          "⛔ Squadra bloccata, non invio nulla a Supabase per",
          playerId
        );
        return;
      }

      const payload: StoredTeam = {
        owner_id: playerId,
        members: selectedIds,
        captain_id: captainId || null,
      };

      console.log("[FantaClaus] 💾 Salvo squadra su Supabase:", payload);

      try {
        const { data, error } = await supabase
          .from("teams")
          .upsert(payload, { onConflict: "owner_id" });

        if (error) {
          console.error("[FantaClaus] ❌ Errore Supabase upsert teams", error);
          if (typeof window !== "undefined") {
            alert("Errore nel salvataggio su Supabase: " + error.message);
          }
          return;
        }

        console.log("[FantaClaus] ✅ Squadra salvata su Supabase:", data);
      } catch (err) {
        console.error("[FantaClaus] ❌ Errore runtime salvataggio", err);
        if (typeof window !== "undefined") {
          alert("Errore inatteso nel salvataggio. Controlla la console.");
        }
      }
    };

    if (!loading) {
      saveTeam();
    }
  }, [selectedIds, captainId, playerId, storageKey, isLocked, loading]);

  const toggleMember = (id: string) => {
    if (isLocked) return;

    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const newMembers = prev.filter((m) => m !== id);
        if (captainId === id) setCaptainId("");
        return newMembers;
      }

      if (prev.length >= maxMembers) return prev;
      return [...prev, id];
    });
  };

  const handleSetCaptain = (id: string) => {
    if (isLocked) return;
    if (!selectedIds.includes(id)) return;

    setCaptainId(id);

    // piccola animazione quando diventa capitano
    setHighlightedCaptainId(id);
    window.setTimeout(() => {
      setHighlightedCaptainId("");
    }, 350);
  };

  // 👉 stato per messaggio sopra i pacchi
  const hasFullTeam = selectedIds.length === maxMembers;
  const missingSlots = Math.max(0, maxMembers - selectedIds.length);
  const hasCaptain = !!captainId;

  // Notifica al genitore (Profilo) lo stato corrente
  useEffect(() => {
    if (!onTeamStateChange) return;
    onTeamStateChange({
      selectedCount: selectedIds.length,
      isComplete: hasFullTeam,
      hasCaptain,
    });
  }, [selectedIds.length, hasFullTeam, hasCaptain, onTeamStateChange]);

  return (
    <Box>
      {isLocked && (
        <Typography color="error" sx={{ mb: 1 }}>
          Il periodo per modificare la squadra è terminato. Puoi solo
          visualizzare i membri e il capitano scelti.
        </Typography>
      )}

      {/* Barra di stato con 7 pacchi + messaggio contestuale */}
      <Box sx={{ mb: 2 }}>
        {/* Messaggio dinamico sopra i pacchi */}
        {!hasFullTeam && (
          <Typography
            variant="subtitle1"
            sx={{
              mb: 1,
              color: fantaPalette.textSecondary,
              fontWeight: 600,
            }}
          >
            {missingSlots === 1
              ? "Ti manca ancora 1 giocatore per completare la squadra (7 su 7)."
              : `Ti mancano ancora ${missingSlots} giocatori per completare la squadra (7 su 7).`}
          </Typography>
        )}

        {hasFullTeam && !hasCaptain && (
          <Typography
            variant="subtitle1"
            sx={{
              mb: 1,
              color: fantaPalette.textSecondary,
              fontWeight: 600,
            }}
          >
            La squadra è completa! Ora scegli il{" "}
            <strong>capitano</strong> cliccando sull&apos;icona regalo su una
            delle card rosse.
          </Typography>
        )}

        {hasFullTeam && hasCaptain && (
          <Typography
            variant="subtitle1"
            sx={{
              mb: 1,
              color: fantaPalette.textSecondary,
              fontWeight: 700,
            }}
          >
            Hai finito! <strong>Buona fortuna!</strong>
          </Typography>
        )}

        {/* Pacchi squadra */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: { xs: 0.5, sm: 1 },
          }}
        >
          {Array.from({ length: maxMembers }).map((_, index) => {
            const isFilled = index < selectedIds.length;
            const isCaptainSlot = Boolean(captainId) && index === 0;

            const imgSrc = isCaptainSlot
              ? "/icons/team/slot-captain.png"
              : isFilled
              ? "/icons/team/slot-filled.png"
              : "/icons/team/slot-empty.png";

            return (
              <Box
                key={index}
                component="img"
                src={imgSrc}
                alt=""
                sx={{
                  width: { xs: 32, sm: 40, md: 50 },
                  height: { xs: 32, sm: 40, md: 50 },
                  objectFit: "contain",
                  userSelect: "none",
                }}
              />
            );
          })}
        </Box>
      </Box>

      {loading && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Caricamento squadra...
        </Typography>
      )}

      {/* GRIGLIA CARD GIOCATORI */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "1fr 1fr 1fr",
          },
          gap: 2,
        }}
      >
        {participants.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          const isCaptain = captainId === p.id;
          const isHighlightedCaptain = highlightedCaptainId === p.id;

          // Nome spezzato su due righe (prima parola / resto)
          const parts = p.name.split(" ");
          const firstLine = parts[0] ?? "";
          const secondLine =
            parts.length > 1 ? parts.slice(1).join(" ") : "\u00A0";

          return (
            <Card
              key={p.id}
              onClick={isLocked ? undefined : () => toggleMember(p.id)}
              sx={{
                position: "relative",
                borderRadius: 3,
                overflow: "hidden",
                minHeight: 120,
                transition:
                  "transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
                cursor: isLocked ? "default" : "pointer",
                bgcolor: isSelected ? "#b91c1c" : fantaPalette.cardBg,
                color: isSelected ? "#fef2f2" : fantaPalette.textPrimary,
                boxShadow: isSelected
                  ? "0 18px 45px rgba(0,0,0,0.35)"
                  : fantaPalette.cardShadow,
                opacity: isLocked && !isSelected ? 0.5 : 1,
                "&:hover": !isLocked
                  ? {
                      transform: "translateY(-3px)",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
                    }
                  : undefined,

                // Nastro pacco regalo per il capitano
                ...(isCaptain && {
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: "70%",
                    width: "22px",
                    height: "100%",
                    transform: "translateX(-50%)",
                    background:
                      "linear-gradient(180deg, #facc15 0%, #eab308 40%, #f59e0b 100%)",
                    opacity: 0.9,
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "65%",
                    width: "100%",
                    height: "22px",
                    background:
                      "linear-gradient(90deg, #facc15 0%, #eab308 40%, #f59e0b 100%)",
                    opacity: 0.9,
                  },
                }),

                // piccola animazione quando diventa capitano
                ...(isHighlightedCaptain && {
                  animation: "captainPop 0.35s ease-out",
                  "@keyframes captainPop": {
                    "0%": { transform: "scale(1)" },
                    "40%": { transform: "scale(1.04)" },
                    "100%": { transform: "scale(1)" },
                  },
                }),
              }}
            >
              {/* Icona + / - in alto a destra, posizione fissa */}
              <IconButton
                size="small"
                disabled={isLocked}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMember(p.id);
                }}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  bgcolor: isSelected
                    ? "rgba(248,250,252,0.12)"
                    : "rgba(22,163,74,0.08)",
                  "&:hover": {
                    bgcolor: isSelected
                      ? "rgba(248,250,252,0.22)"
                      : "rgba(22,163,74,0.18)",
                  },
                }}
              >
                {isSelected ? (
                  <RemoveIcon fontSize="small" sx={{ color: "#fee2e2" }} />
                ) : (
                  <AddIcon fontSize="small" sx={{ color: "#16a34a" }} />
                )}
              </IconButton>

              {/* Icona regalo in basso a destra (solo se in squadra e NON capitano) */}
              {isSelected && !isCaptain && (
                <IconButton
                  size="large"
                  disabled={isLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetCaptain(p.id);
                  }}
                  sx={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    bgcolor: "rgba(250, 204, 21, 0.08)",
                    "&:hover": {
                      bgcolor: "rgba(250, 204, 21, 0.18)",
                    },
                  }}
                >
                  <RedeemIcon fontSize="small" sx={{ color: "#eab308" }} />
                </IconButton>
              )}

              <CardContent
                sx={{
                  pt: 2.5,
                  pb: 2.5,
                  pr: 5,
                }}
              >
                {/* Nome su due righe, sempre */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {firstLine}
                    <br />
                    {secondLine}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
