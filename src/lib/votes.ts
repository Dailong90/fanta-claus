export const VOTE_TYPES = ["best_wrapping", "worst_wrapping", "most_fitting"] as const;
export type VoteType = typeof VOTE_TYPES[number];
export type VotePoints = Record<VoteType, number>;
export function normalizeVoteType(value: unknown): VoteType | null {
  if (typeof value !== "string") return null;
  switch (value) {
    case "best_wrapping": case "BEST_WRAPPING": case "bestWrapping": return "best_wrapping";
    case "worst_wrapping": case "WORST_WRAPPING": case "worstWrapping": return "worst_wrapping";
    case "most_fitting": case "MOST_FITTING": case "mostFitting": return "most_fitting";
    default: return null;
  }
}
