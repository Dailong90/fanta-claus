export const CURRENT_EDITION = 2026;
export const AVATARS = [
  { id: "santa", label: "Babbo Natale", symbol: "🎅" },
  { id: "reindeer", label: "Renna", symbol: "🦌" },
  { id: "elf", label: "Elfo", symbol: "🧝" },
  { id: "snowman", label: "Pupazzo di neve", symbol: "⛄" },
] as const;
export type AvatarId = typeof AVATARS[number]["id"];
export type Profile = { firstName: string; lastName: string; avatarId: AvatarId };
export type Account = { userId: string; email: string; profile: Profile | null; isAdmin: boolean; participating: boolean };
export type EditionStatus = { editionId: typeof CURRENT_EDITION; active: boolean; registrationsOpen: boolean };
export type AdminEdition = EditionStatus & { closesAt: string | null; locked: boolean };
export function isAvatar(value: unknown): value is AvatarId { return AVATARS.some(avatar => avatar.id === value); }
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
export function parseProfile(value: unknown): Profile {
  if (!object(value) || typeof value.firstName !== "string" || !value.firstName || typeof value.lastName !== "string" || !value.lastName || !isAvatar(value.avatarId)) throw new Error("Profilo non valido.");
  return { firstName: value.firstName, lastName: value.lastName, avatarId: value.avatarId };
}
export function parseAccount(value: unknown): Account {
  if (!object(value) || typeof value.userId !== "string" || !value.userId || typeof value.email !== "string" || !value.email || typeof value.isAdmin !== "boolean" || typeof value.participating !== "boolean") throw new Error("Dati account non validi.");
  return { userId: value.userId, email: value.email, profile: value.profile === null ? null : parseProfile(value.profile), isAdmin: value.isAdmin, participating: value.participating };
}
export function parseEdition(value: unknown): EditionStatus {
  if (!object(value) || value.editionId !== CURRENT_EDITION || typeof value.active !== "boolean" || typeof value.registrationsOpen !== "boolean") throw new Error("Edizione non valida.");
  return { editionId: CURRENT_EDITION, active: value.active, registrationsOpen: value.registrationsOpen };
}
export function parseAdminEdition(value: unknown): AdminEdition {
  const edition = parseEdition(value);
  if (!object(value) || typeof value.locked !== "boolean" || (value.closesAt !== null && (typeof value.closesAt !== "string" || !Number.isFinite(Date.parse(value.closesAt))))) throw new Error("Configurazione iscrizioni non valida.");
  return { ...edition, closesAt: value.closesAt, locked: value.locked };
}
export type Participant = Profile & { userId: string };
export function parseParticipants(value: unknown): Participant[] {
  if (!Array.isArray(value)) throw new Error("Partecipanti non validi.");
  return value.map((row: unknown) => {
    if (!object(row) || typeof row.userId !== "string") throw new Error("Partecipante non valido.");
    return { userId: row.userId, ...parseProfile(row) };
  });
}
