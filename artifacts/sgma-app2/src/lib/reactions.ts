export type ReactionType = "LIKE" | "LOVE" | "SUPPORT" | "THANKS" | "INSIGHTFUL";

export const REACTION_ORDER: ReactionType[] = [
  "LIKE",
  "LOVE",
  "SUPPORT",
  "THANKS",
  "INSIGHTFUL",
];

export const REACTION_META: Record<ReactionType, { emoji: string; label: string }> = {
  LIKE: { emoji: "👍", label: "إعجاب" },
  LOVE: { emoji: "❤️", label: "أحببته" },
  SUPPORT: { emoji: "🤝", label: "دعم" },
  THANKS: { emoji: "🙏", label: "شكراً" },
  INSIGHTFUL: { emoji: "💡", label: "ملهم" },
};

export function formatArabicNumber(value: number | null | undefined): string {
  const n = typeof value === "number" && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat("ar").format(n);
}
