// @vitest-environment jsdom
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
const fixture = vi.hoisted(() => ({ acknowledge: undefined as (() => void) | undefined }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/data/participants", () => ({ participants: [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }] }));
vi.mock("@/components/TeamBuilder", () => ({ default: function TestBuilder({ onPersisted }: { onPersisted?: () => void }) {
  useEffect(() => { fixture.acknowledge = onPersisted; }, [onPersisted]);
  return <div>Builder fixture</div>;
} }));
vi.mock("@/components/VotingPanel", () => ({ default: () => <div>Voting fixture</div> }));
import ProfiloClientShell from "@/app/profilo/ProfiloClientShell";
afterEach(() => { cleanup(); vi.useRealTimers(); });
const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
it("refreshes at lock and ignores an older summary after a late save acknowledgement", async () => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(new Date("2025-12-15T11:29:59Z"));
  let finishOld: (value: Response) => void = () => undefined;
  const old = new Promise<Response>(resolve => { finishOld = resolve; });
  let reads = 0;
  let scoreReads = 0;
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url.includes("team-deadline")) return Promise.resolve(response({ deadlineIso: "2025-12-15T11:30:00Z" }));
    if (url === "/api/leaderboard") {
      scoreReads++;
      const member = scoreReads === 1 ? { id: "a", name: "Alpha", points: 0, isCaptain: true } : { id: "b", name: "Beta", points: 0, isCaptain: true };
      return Promise.resolve(response({ teams: [{ ownerId: "owner", ownerName: "Owner", totalPoints: 0, members: [member] }] }));
    }
    if (url === "/api/team") { reads++; return reads === 1 ? old : Promise.resolve(response({ team: { members: ["b"], captain_id: "b" }, version: "new" })); }
    return Promise.reject(new Error("Unexpected fixture request"));
  }));
  render(<ProfiloClientShell playerId="owner" initialName="Owner" initialIsAdmin={false} />);
  await screen.findByText("Builder fixture"); expect(fixture.acknowledge).toBeTypeOf("function");
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  await waitFor(() => expect(reads).toBe(1)); expect(screen.queryByText("Builder fixture")).toBeNull();
  await act(async () => fixture.acknowledge?.());
  await waitFor(() => expect(reads).toBe(2)); await screen.findByText("Beta");
  await act(async () => finishOld(response({ team: { members: [], captain_id: null }, version: "old" })));
  expect(screen.queryByText("Alpha")).toBeNull(); expect(screen.getByText("Beta")).toBeTruthy();
});
