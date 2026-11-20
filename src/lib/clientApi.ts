import { isObject } from "@/lib/contracts";
export async function requestJson<T>(url: string, parse: (value: unknown) => T, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(isObject(body) && typeof body.error === "string" ? body.error : "Operazione fallita.");
  return parse(body);
}
export function notifyAuthChanged() {
  try {
    window.localStorage.removeItem("fanta_owner_id");
    window.localStorage.removeItem("fanta_is_admin");
    window.localStorage.setItem("fanta_auth_updated", String(Date.now()));
  } catch { /* Storage is an optional refresh signal, never the session authority. */ }
  window.dispatchEvent(new Event("fanta-auth-change"));
}
export async function logout() {
  await requestJson("/api/logout", () => undefined, { method: "POST" });
  notifyAuthChanged();
}
