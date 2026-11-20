// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
import ProfileEditor from "@/app/profilo/ProfileEditor";
import MagicLinkForm from "@/app/login/MagicLinkForm";
import ConfirmLink from "@/app/auth/confirm/ConfirmLink";
import EditionAdmin from "@/app/admin/EditionAdmin";
import type { Account } from "@/lib/identity-contracts";
const account: Account = { userId: "a", email: "a@example.test", profile: { firstName: "Alpha", lastName: "Fixture", avatarId: "santa" }, isAdmin: false, participating: false };
const edition = { editionId: 2026 as const, active: false, registrationsOpen: false };
afterEach(cleanup);
it("does not offer registration while closed, while existing login remains available", () => {
  render(<MagicLinkForm registrationsOpen={false} invalidLink={false} />);
  expect((screen.getByLabelText("Crea un nuovo account") as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByLabelText("Ho già un account") as HTMLInputElement).disabled).toBe(false);
});
it("never consumes the email token merely by opening its page", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Link scaduto" }), { status: 400 })); vi.stubGlobal("fetch", fetcher);
  render(<ConfirmLink tokenHash="test_token" />); expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Conferma e accedi" })); expect((await screen.findByRole("alert")).textContent).toMatch(/Link scaduto/);
});
it("profile success waits for persistence and errors keep the confirmed account", async () => {
  let finish: (value: Response) => void = () => undefined; const pending = new Promise<Response>(resolve => { finish = resolve; });
  const fetcher = vi.fn().mockReturnValue(pending); vi.stubGlobal("fetch", fetcher);
  render(<ProfileEditor initialAccount={account} edition={edition} />); expect(screen.queryByLabelText("Nome")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Salva profilo" })); expect(screen.queryByText("Profilo salvato.")).toBeNull();
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ avatarId: "santa" });
  await act(async () => { finish(new Response(JSON.stringify({ error: "Errore di persistenza" }), { status: 503 })); });
  expect((await screen.findByText("Errore di persistenza")).textContent).toBeTruthy(); expect(screen.queryByText("Profilo salvato.")).toBeNull(); expect(screen.getByText("Alpha Fixture")).toBeTruthy();
});
it("onboarding collects names once, and shows success only after confirmation", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(account))); vi.stubGlobal("fetch", fetcher);
  render(<ProfileEditor initialAccount={{ ...account, profile: null }} edition={edition} />);
  fireEvent.change(screen.getByRole("textbox", { name: /^Nome/ }), { target: { value: "Alpha" } }); fireEvent.change(screen.getByRole("textbox", { name: /^Cognome/ }), { target: { value: "Fixture" } });
  fireEvent.click(screen.getByRole("button", { name: "Salva profilo" })); await screen.findByText("Profilo salvato."); expect(screen.queryByLabelText("Nome")).toBeNull();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1)); expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ firstName: "Alpha", lastName: "Fixture", avatarId: "santa" });
});
it("never activates the official edition on render", () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); render(<EditionAdmin initialEdition={{ ...edition, closesAt: null, locked: false }} initialParticipants={[]} />);
  expect(fetcher).not.toHaveBeenCalled(); expect((screen.getByRole("button", { name: "Attiva manualmente l’edizione 2026" }) as HTMLButtonElement).disabled).toBe(true);
});
