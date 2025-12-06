"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Typography } from "@mui/material";
import AdminRegaliClient from "./AdminRegaliClient";

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

type BaseData = {
  currentAdminName: string;
  players: PlayerRow[];
  categories: CategoryRow[];
};

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<BaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/base-data");

        if (res.status === 401 || res.status === 403) {
          // non loggato o non admin → rimando al login
          router.push("/login");
          return;
        }

        if (!res.ok) {
          setErrorMsg("Errore nel caricamento dei dati Admin.");
          return;
        }

        const json = (await res.json()) as BaseData;
        setData(json);
      } catch (err) {
        console.error("Errore /api/admin/base-data", err);
        setErrorMsg("Errore di rete nel caricamento dei dati Admin.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (errorMsg || !data) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Typography>{errorMsg ?? "Si è verificato un errore."}</Typography>
      </Box>
    );
  }

  return (
    <AdminRegaliClient
      currentAdminName={data.currentAdminName}
      players={data.players}
      categories={data.categories}
    />
  );
}
