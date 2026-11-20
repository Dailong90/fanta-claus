"use client";
import { Box, Container, Paper, Typography } from "@mui/material";
import { fantaPalette } from "@/theme/fantaPalette";
export default function EditionFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return <Box component="main" sx={{ minHeight: "85vh", py: 5, px: 2, backgroundImage: fantaPalette.bgGradient }}>
    <Container maxWidth="sm"><Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, bgcolor: fantaPalette.cardBg, color: fantaPalette.textPrimary }}>
      <Typography variant="overline">Fanta Claus · 2026</Typography>
      <Typography component="h1" variant="h4" sx={{ mb: 3 }}>{title}</Typography>{children}
    </Paper></Container>
  </Box>;
}
