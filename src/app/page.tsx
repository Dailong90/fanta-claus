"use client";

import { Container, Typography, Box, Stack, Button, Paper } from "@mui/material";
import Link from "next/link";

export default function HomePage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Fanta Claus 🎅
        </Typography>
        <Typography variant="subtitle1">
          Fanta Secret Santa aziendale – crea la tua squadra di colleghi e
          guadagna punti in base ai regali che faranno.
        </Typography>
      </Box>

      {/* Regole base */}
      <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
        <Typography variant="h5" component="h2" gutterBottom>
          Regole base del gioco
        </Typography>
        <Typography component="ul" sx={{ pl: 3 }}>
          <li>Ogni partecipante al Secret Santa può creare la propria squadra.</li>
          <li>La squadra è composta da 7 persone (numero modificabile più avanti).</li>
          <li>Guadagni punti in base ai regali fatti dalle persone che hai in squadra.</li>
          <li>
            Le categorie di regalo (goliardico, sconcio, accessorio tech, ecc.)
            assegnano punteggi diversi.
          </li>
          <li>
            Entro una data limite potrai modificare la tua squadra, poi le squadre verranno
            bloccate.
          </li>
        </Typography>
      </Paper>

      {/* Categorie & punteggi (placeholder) */}
      <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
        <Typography variant="h5" component="h2" gutterBottom>
          Categorie regalo & punteggi
        </Typography>
        <Typography sx={{ mb: 1 }}>
          I punteggi esatti verranno definiti dall&apos;organizzatore. Esempi:
        </Typography>
        <Typography component="ul" sx={{ pl: 3 }}>
          <li>🎉 Goliardico: 10 punti</li>
          <li>🔥 Sconcio: 15 punti</li>
          <li>🖥️ Accessorio tech: 5 punti</li>
          <li>☕ Tazza: -2 punti</li>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Queste regole saranno aggiornate ufficialmente nella pagina prima dell&apos;inizio del gioco.
        </Typography>
      </Paper>

      {/* Navigazione principale */}
      <Stack direction="row" spacing={2}>
        <Button
          component={Link}
          href="/profilo"
          variant="contained"
        >
          Vai al tuo profilo
        </Button>

        <Button
          component={Link}
          href="/admin"
          variant="outlined"
        >
          Area admin
        </Button>
      </Stack>
    </Container>
  );
}
