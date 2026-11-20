"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { Participant } from "@/data/participants";
import { Box, Typography, Card, CardContent, IconButton, Button, Alert } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import RedeemIcon from "@mui/icons-material/Redeem";
import { fantaPalette } from "@/theme/fantaPalette";
import { parseTeamResponse } from "@/lib/contracts";
import { requestJson } from "@/lib/clientApi";

type Team = { members: string[]; captain_id: string | null };
export type TeamBuilderHandle = { confirm: () => Promise<boolean> };
export type TeamBuilderState = { selectedCount: number; isComplete: boolean; hasCaptain: boolean; persisted: boolean };
type Props = {
  participants: Participant[]; playerId: string; isLocked: boolean; maxMembers?: number;
  saveRef?: Ref<TeamBuilderHandle>;
  onPersisted?: () => void;
  onTeamStateChange?: (state: TeamBuilderState) => void;
};
export default function TeamBuilder({ participants, playerId, isLocked, maxMembers = 7, saveRef, onTeamStateChange, onPersisted }: Props) {
  const [team, setTeam] = useState<Team>({ members: [], captain_id: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const version = useRef<string | null>(null);
  const pending = useRef<Promise<boolean> | null>(null);
  const latest = useRef(team);
  const selectedIds = team.members;
  const captainId = team.captain_id ?? "";
  const [highlightedCaptainId, setHighlightedCaptainId] = useState("");
  const disabled = isLocked || loading || saving || error !== null;

  useEffect(() => {
    let cancelled = false;
    version.current = null;
    const load = async () => {
      setLoading(true); setLoaded(false); setError(null); setPersisted(false);
      try {
        const result = await requestJson("/api/team", parseTeamResponse);
        if (cancelled) return;
        version.current = result.version; setLoaded(true);
        const initial = result.team ?? { members: [], captain_id: null };
        latest.current = initial; setTeam(initial); setPersisted(result.team !== null);
      } catch { if (!cancelled) setError("Caricamento squadra fallito. Nessuna modifica verrà salvata finché non ricarichi."); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [playerId, reload]);

  const save = useCallback((next: Team) => {
    if (pending.current || !version.current || isLocked) return;
    latest.current = next; setTeam(next); setSaving(true); setPersisted(false); setError(null);
    const operation = (async () => {
      try {
        const result = await requestJson("/api/team", parseTeamResponse, {
          method: "PUT", body: JSON.stringify({ ...next, version: version.current }),
        });
        if (!result.team) throw new Error("Salvataggio non confermato.");
        version.current = result.version; latest.current = result.team;
        setTeam(result.team); setPersisted(true); onPersisted?.(); return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Salvataggio fallito."); return false;
      } finally { pending.current = null; setSaving(false); }
    })();
    pending.current = operation;
  }, [isLocked, onPersisted]);

  useImperativeHandle(saveRef, () => ({ confirm: async () => {
    if (pending.current) return await pending.current;
    return persisted && !loading && !error;
  } }), [persisted, loading, error]);

  const toggleMember = (id: string) => {
    if (disabled || pending.current) return;
    const current = latest.current;
    const members = current.members.includes(id) ? current.members.filter(member => member !== id) : [...current.members, id];
    if (members.length > maxMembers) return;
    save({ members, captain_id: current.captain_id === id ? null : current.captain_id });
  };
  const handleSetCaptain = (id: string) => {
    if (disabled || pending.current || !latest.current.members.includes(id)) return;
    save({ ...latest.current, captain_id: id });
    setHighlightedCaptainId(id);
  };
  useEffect(() => {
    if (!highlightedCaptainId) return;
    const timer = setTimeout(() => setHighlightedCaptainId(""), 350);
    return () => clearTimeout(timer);
  }, [highlightedCaptainId]);
  const hasFullTeam = selectedIds.length === maxMembers;
  const missingSlots = Math.max(0, maxMembers - selectedIds.length);
  const hasCaptain = !!captainId;
  useEffect(() => {
    onTeamStateChange?.({ selectedCount: selectedIds.length, isComplete: hasFullTeam, hasCaptain, persisted: persisted && !saving && !loading && !error });
  }, [selectedIds.length, hasFullTeam, hasCaptain, persisted, saving, loading, error, onTeamStateChange]);

  return (
    <Box>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setReload(value => value + 1)}>Ricarica</Button>}>{error}</Alert>}
      {error && loaded && <Button disabled={isLocked || saving} onClick={() => save(latest.current)}>Riprova salvataggio</Button>}
      <Typography role="status" variant="body2">{saving ? "Salvataggio in corso..." : persisted ? "Squadra salvata sul server." : ""}</Typography>
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
              onClick={disabled ? undefined : () => toggleMember(p.id)}
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
                aria-label={`${isSelected ? "Rimuovi" : "Aggiungi"} ${p.name}`}
                disabled={disabled}
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
                  aria-label={`Nomina capitano ${p.name}`}
                  disabled={disabled}
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
