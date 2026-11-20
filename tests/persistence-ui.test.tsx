// @vitest-environment jsdom
import { StrictMode, createRef } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TeamBuilder, { type TeamBuilderHandle } from "@/components/TeamBuilder";
import VotingPanel from "@/components/VotingPanel";
import AdminRegaliClient from "@/app/admin/AdminRegaliClient";
import ClassificaPage from "@/legacy2025/pages/classifica/page";
import { parseGiftResponse } from "@/lib/contracts";
import { logout, notifyAuthChanged } from "@/lib/clientApi";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
// Large MUI panels are expensive in jsdom, especially beside a production build.
vi.setConfig({ testTimeout: 15_000 });
const people = [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }];
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());
it("does not restore a stale cache or issue autosaves after failed initial load", async () => {
  const fetch = vi.fn().mockResolvedValue(response({ error: "load failed" }, 503)); vi.stubGlobal("fetch", fetch);
  window.localStorage.setItem("fanta_claus_team_a", JSON.stringify(["b"]));
  render(<StrictMode><TeamBuilder participants={people} playerId="a" isLocked={false} /></StrictMode>);
  await screen.findByRole("alert");
  const add = screen.getByRole("button", { name: "Aggiungi Alpha" }); expect(add.hasAttribute("disabled")).toBe(true);
  fireEvent.click(add); expect(fetch.mock.calls.every(call => !call[1]?.method)).toBe(true);
  expect(screen.queryByText("Squadra salvata sul server.")).toBeNull();
});
it("blocks overlapping UI writes and confirms success only after acknowledgement", async () => {
  let finish: (response: Response) => void = () => undefined;
  const pending = new Promise<Response>(resolve => { finish = resolve; });
  const fetch = vi.fn().mockResolvedValueOnce(response({ team: null, version: "initial" })).mockReturnValueOnce(pending); vi.stubGlobal("fetch", fetch);
  const ref = createRef<TeamBuilderHandle>();
  render(<TeamBuilder participants={people} playerId="a" isLocked={false} saveRef={ref} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Aggiungi Alpha" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi Alpha" }));
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi Beta" }));
  expect(fetch).toHaveBeenCalledTimes(2); expect(screen.queryByText("Squadra salvata sul server.")).toBeNull();
  await act(async () => finish(response({ team: { members: ["a"], captain_id: null }, version: "saved" })));
  await screen.findByText("Squadra salvata sul server."); expect(await ref.current?.confirm()).toBe(true);
  const payload = JSON.parse(fetch.mock.calls[1][1].body); expect(payload).toEqual({ members: ["a"], captain_id: null, version: "initial" });
});
it("does not confirm a rejected save and offers recovery", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response({ team: null, version: "initial" })).mockResolvedValueOnce(response({ error: "write failed" }, 503)); vi.stubGlobal("fetch", fetch);
  const ref = createRef<TeamBuilderHandle>(); render(<TeamBuilder participants={people} playerId="a" isLocked={false} saveRef={ref} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Aggiungi Alpha" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi Alpha" })); await screen.findByText("write failed");
  expect(await ref.current?.confirm()).toBe(false); expect(screen.getByRole("button", { name: "Riprova salvataggio" })).toBeTruthy();
});
it("keeps voting controls disabled after a load failure", async () => {
  const fetch = vi.fn().mockResolvedValue(response({ error: "load failed" }, 503)); vi.stubGlobal("fetch", fetch);
  render(<VotingPanel playerId="a" participants={people} />); await screen.findByRole("alert");
  expect(screen.getAllByRole("combobox").every(element => element.getAttribute("aria-disabled") === "true")).toBe(true); expect(fetch).toHaveBeenCalledTimes(1);
});
it("invalidates browser state only after a confirmed logout", async () => {
  window.localStorage.setItem("fanta_owner_id", "a");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: "fail" }, 503)));
  await expect(logout()).rejects.toThrow("fail"); expect(window.localStorage.getItem("fanta_owner_id")).toBe("a");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ok: true })));
  await logout(); expect(window.localStorage.getItem("fanta_owner_id")).toBeNull(); expect(window.localStorage.getItem("fanta_auth_updated")).toBeTruthy();
  window.localStorage.setItem("fanta_is_admin", "true"); notifyAuthChanged(); expect(window.localStorage.getItem("fanta_is_admin")).toBeNull();
});

it("shows an error rather than an apparently empty public leaderboard", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: "unavailable" }, 503)));
  render(<ClassificaPage />); expect((await screen.findByRole("alert")).textContent).toMatch(/Impossibile caricare la classifica/);
  expect(screen.queryByText(/Nessuna squadra con punteggio/)).toBeNull();
});
it("does not enable gift editing after failed initial load", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/admin/gifts") return response({ error: "failed" }, 503);
    if (url.includes("leaderboard-publish")) return response({ published: false });
    if (url.includes("vote-points")) return response({ votePoints: { best_wrapping: 5, worst_wrapping: -5, most_fitting: 10 } });
    return response({ deadlineIso: "2025-12-15T11:30:00Z" });
  }));
  render(<AdminRegaliClient currentAdminName="Admin" players={[{ owner_id: "a", name: "Alpha" }]} categories={[{ id: "cat", code: "C", label: "Category", points: 1 }]} />);
  await screen.findByRole("alert");
  expect(screen.getByRole("combobox", { name: "Categoria" }).getAttribute("aria-disabled")).toBe("true");
});
it("rolls back a rejected gift bonus and does not show a false saved state", async () => {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/admin/gifts") return init?.method === "POST" ? response({ error: "gift write failed" }, 503) : response({ gifts: [{ santa_owner_id: "a", receiver_owner_id: "b", category_id: "cat", bonus_points: 2 }] });
    if (url.includes("leaderboard-publish")) return response({ published: false });
    if (url.includes("vote-points")) return response({ votePoints: { best_wrapping: 5, worst_wrapping: -5, most_fitting: 10 } });
    return response({ deadlineIso: "2025-12-15T11:30:00Z" });
  }); vi.stubGlobal("fetch", fetch);
  render(<AdminRegaliClient currentAdminName="Admin" players={[{ owner_id: "a", name: "Alpha" }]} categories={[{ id: "cat", code: "C", label: "Category", points: 1 }]} />);
  const bonus = await screen.findByRole("spinbutton", { name: "Bonus" });
  fireEvent.change(bonus, { target: { value: "8" } }); fireEvent.blur(bonus);
  await screen.findByText("gift write failed");
  expect((bonus as HTMLInputElement).value).toBe("2"); expect(screen.queryByText("Salvato")).toBeNull();
  const posts = fetch.mock.calls.filter(call => call[1]?.method === "POST"); expect(posts).toHaveLength(1);
  expect(JSON.parse(String(posts[0][1]?.body))).toEqual({ santa_owner_id: "a", bonus_points: 8 });
});
it("keeps the previous vote visible after a rejected selection and disables clearing", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response({ votes: [{ vote_type: "best_wrapping", target_owner_id: "b" }] })).mockResolvedValueOnce(response({ error: "vote write failed" }, 503)); vi.stubGlobal("fetch", fetch);
  render(<VotingPanel playerId="a" participants={[...people, { id: "c", name: "Gamma" }]} />);
  await waitFor(() => expect(screen.getAllByRole("combobox")[0].getAttribute("aria-disabled")).toBeNull());
  fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
  expect(screen.getByRole("option", { name: "Seleziona un partecipante" }).getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(screen.getByRole("option", { name: "Gamma" }));
  await screen.findByText("vote write failed"); expect(screen.getAllByRole("combobox")[0].textContent).toBe("Beta"); expect(screen.queryByText("Voto salvato.")).toBeNull();
});

it("treats localStorage as optional after successful logout", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ok: true })));
  const storage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
  await expect(logout()).resolves.toBeUndefined(); storage.mockRestore();
});

it("accepts a persisted legacy null bonus as zero in the UI without rewriting the field", () => {
  expect(parseGiftResponse({ ok: true, gift: { santa_owner_id: "a", receiver_owner_id: "b", category_id: "cat", bonus_points: null } })).toEqual({ category_id: "cat", bonus_points: 0 });
});

it("notifies the parent after an in-flight save outlives the builder at lock", async () => {
  let finish: (response: Response) => void = () => undefined;
  const pending = new Promise<Response>(resolve => { finish = resolve; });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({ team: null, version: "initial" })).mockReturnValueOnce(pending));
  const persisted = vi.fn();
  const view = render(<TeamBuilder participants={people} playerId="a" isLocked={false} onPersisted={persisted} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Aggiungi Alpha" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi Alpha" })); view.unmount();
  expect(persisted).not.toHaveBeenCalled();
  await act(async () => finish(response({ team: { members: ["a"], captain_id: null }, version: "saved" })));
  expect(persisted).toHaveBeenCalledTimes(1);
});
