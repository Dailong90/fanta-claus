// src/theme/fantaPalette.ts

export const fantaPalette = {
  // SFONDO GENERALE
  bgGradient:
    "radial-gradient(circle at top, #ef4444 0%, #b91c1c 40%, #450a0a 100%)",

  // CARD
  cardBg: "rgba(255,255,255,0.98)",
  cardBorder: "rgba(250, 204, 21, 0.5)", // dorato leggero
  cardShadow:
    "0 24px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)",

  // TESTI
  textPrimary: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",

  // INPUT
  inputBg: "#ffffff",
  inputBorder: "rgba(148, 163, 184, 0.9)",
  inputBorderHover: "#f97316",

  // BOTTONI
  buttonGradient: "linear-gradient(90deg, #facc15, #f97316)",
  buttonGradientHover: "linear-gradient(90deg, #fde047, #fb923c)",
  buttonText: "#111827",

  // TIMER & STATO SQUADRA
  timerGreenTitle: "#166534",      // verde scuro per titoli (🎄)
  timerGreenLight: "#16a34a",      // verde acceso per il countdown
  timerLockedRed: "#b91c1c",       // rosso per "tempo scaduto"
  timerLockedRedText: "#7f1d1d",   // rosso scuro testo descrittivo

  // TIMER BOX VERDE NATALIZIO
  timerCardGradient: "linear-gradient(135deg, #16a34a 0%, #0f7a37 60%, #0a5a29 100%)",
  timerTextLight: "#ffffff",
  timerShadow: "0 18px 45px rgba(0,0,0,0.25)",

  // Stato squadra (slot pacchi)
  teamSlotEmpty: "#e5e7eb", // pacco vuoto (grigio chiaro)
  teamSlotFilled: "#b91c1c", // pacco pieno (rosso come le card)
  teamSlotBorder: "rgba(15, 23, 42, 0.12)",
  teamSlotCaptainGradient: "linear-gradient(135deg, #facc15 0%, #fbbf24 40%, #f97316 100%)", // pacco dorato capitano

  // “Fiocchi di neve” / puntini luce nello sfondo
  snowDots:
    "radial-gradient(#facc15 1px, transparent 1px), radial-gradient(#fecaca 1px, transparent 1px)",
};
