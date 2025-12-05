"use client";

import { useEffect, useState } from "react";
import type { Participant } from "@/data/participants";
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Chip,
} from "@mui/material";
import { supabase } from "@/lib/supabaseClient";

type TeamBuilderProps = {
  participants: Participant[];
  maxMembers?: number;
  playerId: string;
  isLocked?: boolean;
};

type StoredTeam = {
  owner_id: string;
  members: string[];
  captain_id: string | null;
};

export default function TeamBuilder({
  participants,
  maxMembers = 7,
  playerId,
  isLocked = false,
}: TeamBuilderProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
            const parsed = JSON.parse(raw) as any;
            if (Array.isArray(parsed)) {
              setSelectedIds(parsed);
              setCaptainId("");
            } else if (parsed && Array.isArray(parsed.members)) {
              setSelectedIds(parsed.members);
              setCaptainId(
                typeof parsed.captainId === "string" ? parsed.captainId : ""
              );
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
      // cache locale
      if (typeof window !== "undefined") {
        const payloadLocal = {
          members: selectedIds,
          captainId: captainId || null,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payloadLocal));
      }

      if (isLocked) return;

      const payload: StoredTeam = {
        owner_id: playerId,
        members: selectedIds,
        captain_id: captainId || null,
      };

      console.log("💾 Salvo squadra su Supabase:", payload);

      const { error } = await supabase.from("teams").upsert(payload);

      if (error) {
        console.error("❌ Errore Supabase upsert teams", error);
      } else {
        console.log("✅ Squadra salvata su Supabase");
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
  };

  return (
    <Box>
      {isLocked && (
        <Typography color="error" sx={{ mb: 1 }}>
          Il periodo per modificare la squadra è terminato. Puoi solo
          visualizzare i membri e il capitano scelti.
        </Typography>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Stai visualizzando/modificando la squadra di: <strong>{playerId}</strong>
      </Typography>

      <Typography variant="h6" gutterBottom>
        Giocatori selezionati: {selectedIds.length} / {maxMembers}
      </Typography>

      {loading && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Caricamento squadra...
        </Typography>
      )}

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

          return (
            <Card
              key={p.id}
              variant={isSelected ? "outlined" : "elevation"}
              sx={{
                borderColor: isSelected ? "primary.main" : undefined,
                opacity: isLocked && !isSelected ? 0.5 : 1,
              }}
            >
              <CardActionArea
                onClick={isLocked ? undefined : () => toggleMember(p.id)}
              >
                <CardContent>
                  <Typography>{p.name}</Typography>

                  {isSelected && (
                    <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Chip label="In squadra" size="small" />
                      <Chip
                        label={isCaptain ? "Capitano" : "Imposta capitano"}
                        size="small"
                        color={isCaptain ? "primary" : "default"}
                        onClick={
                          isLocked
                            ? undefined
                            : (e) => {
                                e.stopPropagation();
                                handleSetCaptain(p.id);
                              }
                        }
                      />
                    </Box>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Riepilogo squadra
        </Typography>

        {selectedIds.length === 0 ? (
          <Typography variant="body2">
            Nessun giocatore selezionato.
          </Typography>
        ) : (
          <ul>
            {selectedIds.map((id) => {
              const p = participants.find((x) => x.id === id);
              const isCaptain = captainId === id;
              return (
                <li key={id}>
                  {p?.name ?? id}
                  {isCaptain && " (Capitano)"}
                </li>
              );
            })}
          </ul>
        )}
      </Box>
    </Box>
  );
}
