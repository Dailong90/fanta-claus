"use client";
import { useEffect, useState } from "react";
import { requestJson } from "@/lib/clientApi";
import { parseSessionResponse, type PlayerInfo } from "@/lib/contracts";
export function useAuth() {
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const refresh = async () => {
      const current = ++generation;
      try {
        const result = await requestJson("/api/session", parseSessionResponse);
        if (!cancelled && current === generation) setPlayer(result.player);
      } catch { if (!cancelled && current === generation) setPlayer(null); }
      finally { if (!cancelled && current === generation) setLoading(false); }
    };
    void refresh();
    const update = () => { void refresh(); };
    window.addEventListener("fanta-auth-change", update);
    window.addEventListener("storage", update);
    window.addEventListener("focus", update);
    return () => { cancelled = true; window.removeEventListener("fanta-auth-change", update); window.removeEventListener("storage", update); window.removeEventListener("focus", update); };
  }, []);
  return { player, loading };
}
