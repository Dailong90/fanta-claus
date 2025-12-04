// src/data/giftCategories.ts

export type GiftCategory = {
  id: string;
  label: string;
  description?: string;
  points: number;
  emoji?: string;
};

export const defaultGiftCategories: GiftCategory[] = [
  { id: "goliardico", label: "Goliardico", points: 10, emoji: "🎉" },
  { id: "sconcio", label: "Sconcio", points: 15, emoji: "🔥" },
  { id: "tech", label: "Accessorio tech", points: 5, emoji: "🖥️" },
  { id: "tazza", label: "Tazza", points: -2, emoji: "☕" },
  // qui poi aggiungerai / modificherai le categorie reali
];
