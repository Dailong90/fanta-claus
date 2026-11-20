import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./fakeDb";
const identity = vi.hoisted(() => ({ ownerId: null as string | null }));
const state = vi.hoisted(() => ({ db: null as unknown as FakeDb }));
vi.mock("@/lib/session", () => ({ getSessionFromCookies: async () => identity.ownerId ? { ownerId: identity.ownerId } : null }));
vi.mock("@/lib/supabaseAdmin", () => ({ default: { from: (table: string) => state.db.from(table) } }));
import * as categories from "@/legacy2025/api/admin/categories/route";
import * as gifts from "@/legacy2025/api/admin/gifts/route";
import * as deadline from "@/legacy2025/api/admin/team-deadline/route";
import * as points from "@/legacy2025/api/admin/vote-points/route";
import * as publish from "@/legacy2025/api/admin/leaderboard-publish/route";
import * as reset from "@/legacy2025/api/admin/reset-game/route";
import * as base from "@/legacy2025/api/admin/base-data/route";
import * as awardsAdmin from "@/legacy2025/api/admin/awards/route";
import * as awards from "@/legacy2025/api/awards/route";
import * as leaderboard from "@/legacy2025/api/leaderboard/route";
import * as votes from "@/legacy2025/api/votes/route";
import * as team from "@/legacy2025/api/team/route";
import * as session from "@/legacy2025/api/session/route";
import * as publicCategories from "@/legacy2025/api/categories/route";
import { teamVersion } from "@/lib/teams";
const req = (path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) => new Request(`https://game.test/api/${path}`, { method, headers: { "x-fanta-owner-id": "admin", ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
beforeEach(() => { state.db = new FakeDb(); state.db.reset(); identity.ownerId = null; vi.useFakeTimers(); vi.setSystemTime(new Date("2025-12-14T10:00:00Z")); });
afterEach(() => vi.useRealTimers());
const protectedCalls = [
  ["category POST", () => categories.POST(req("admin/categories", "POST", { code: "C", label: "Category", points: 1 }))],
  ["category PUT", () => categories.PUT(req("admin/categories", "PUT", { id: "unused", code: "C", label: "Category", points: 2 }))],
  ["category DELETE", () => categories.DELETE(req("admin/categories?id=unused", "DELETE"))],
  ["gifts GET", () => gifts.GET()],
  ["gifts POST", () => gifts.POST(req("admin/gifts", "POST", { santa_owner_id: "a", category_id: "good" }))],
  ["deadline POST", () => deadline.POST(req("admin/team-deadline", "POST", { deadlineIso: "2025-12-15T11:30:00Z" }))],
  ["points GET", () => points.GET()],
  ["points POST", () => points.POST(req("admin/vote-points", "POST", { best_wrapping: 5, worst_wrapping: -5, most_fitting: 10 }))],
  ["publish POST", () => publish.POST(req("admin/leaderboard-publish", "POST", { published: true }))],
  ["reset POST", () => reset.POST(req("admin/reset-game", "POST"))],
  ["base GET", () => base.GET()],
  ["awards GET", () => awardsAdmin.GET()],
  ["preview GET", () => leaderboard.GET(req("leaderboard?preview=1", "GET", undefined, { "x-fanta-owner-id": "admin" }))],
] as const;
describe.each(protectedCalls)("authorization %s", (name, call) => {
  it.each([null, "a", "b"])("rejects actor %s with no writes", async actor => {
    identity.ownerId = actor;
    const before = structuredClone(state.db.tables);
    const response = await call();
    expect(response.status).toBe(actor === null ? 401 : 403);
    expect(state.db.writes).toHaveLength(0); expect(state.db.tables).toEqual(before);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("accepts an authoritative administrator (reset remains disabled)", async () => {
    identity.ownerId = "admin";
    const response = await call();
    expect(response.status).toBe(name === "reset POST" ? 410 : 200);
    if (name === "reset POST") expect(state.db.writes).toHaveLength(0);
  });
});
it("rechecks removed players, revoked admin role and DB verification errors", async () => {
  identity.ownerId = "missing"; expect((await base.GET()).status).toBe(401);
  identity.ownerId = "admin"; state.db.tables.players[2].is_admin = false; expect((await base.GET()).status).toBe(403);
  state.db.failures.add("players:select"); expect((await base.GET()).status).toBe(503); expect(state.db.writes).toHaveLength(0);
});
it("keeps necessary public reads and excludes credentials and roles", async () => {
  expect((await deadline.GET()).status).toBe(200); expect((await publish.GET()).status).toBe(200);
  expect((await publicCategories.GET()).status).toBe(200);
  expect(await (await session.GET()).json()).toEqual({ player: null });
  const response = await leaderboard.GET(req("leaderboard", "GET", undefined, { "x-fanta-owner-id": "admin" }));
  const body = await response.json(); expect(body.isPublished).toBe(false); expect(body.teams.every((row: { totalPoints: number }) => row.totalPoints === 0)).toBe(true);
  expect(body).not.toHaveProperty("voting"); expect(body).not.toHaveProperty("votingDetails");
  expect(JSON.stringify(body)).not.toMatch(/access_code|is_admin|CODEA|receiver_owner_id/);
  expect(await (await awards.GET()).json()).toEqual({ best_wrapping: [], worst_wrapping: [], most_fitting: [] });
});
it("blocks impersonation by vote query/body; arbitrary identity headers never become authority", async () => {
  expect((await votes.GET(req("votes?voter_owner_id=a"))).status).toBe(401);
  identity.ownerId = "a";
  expect((await votes.GET(req("votes?voter_owner_id=b"))).status).toBe(403);
  expect((await votes.POST(req("votes", "POST", { voter_owner_id: "b", target_owner_id: "admin", vote_type: "best_wrapping" }))).status).toBe(403);
  const own = await (await votes.GET(req("votes", "GET", undefined, { "x-fanta-owner-id": "b" }))).json();
  expect(own.votes.every((vote: { voter_owner_id: string }) => vote.voter_owner_id === "a")).toBe(true);
  expect(state.db.writes).toHaveLength(0);
});
it("persists only the current player's valid vote and handles retries", async () => {
  identity.ownerId = "a"; vi.setSystemTime(new Date("2025-12-15T12:00:00Z"));
  const body = { target_owner_id: "admin", vote_type: "best_wrapping" };
  for (let index = 0; index < 2; index++) expect((await votes.POST(req("votes", "POST", body, { "x-fanta-owner-id": "b" }))).status).toBe(200);
  expect(state.db.tables.package_votes.filter(row => row.voter_owner_id === "a" && row.vote_type === "best_wrapping")).toEqual([{ voter_owner_id: "a", ...body }]);
});
it.each([null, [], { target_owner_id: "a", vote_type: "best_wrapping" }, { target_owner_id: "missing", vote_type: "best_wrapping" }, { target_owner_id: 123, vote_type: "best_wrapping" }, { target_owner_id: "b", vote_type: "__proto__" }, { target_owner_id: "b", vote_type: "best_wrapping", is_admin: true }])("rejects malformed/self/missing vote %j without mutation", async body => {
  identity.ownerId = "a"; vi.setSystemTime(new Date("2025-12-15T12:00:00Z"));
  expect((await votes.POST(req("votes", "POST", body))).status).toBe(400); expect(state.db.writes).toHaveLength(0);
});
it.each([
  ["2025-12-15T11:29:59.999Z", 403], ["2025-12-15T11:30:00Z", 200], ["2025-12-16T11:59:59.999Z", 200], ["2025-12-16T12:00:00Z", 403], ["2026-11-20T12:00:00Z", 403],
])("enforces voting boundary %s -> %d", async (time, status) => {
  identity.ownerId = "a"; vi.setSystemTime(new Date(time));
  expect((await votes.POST(req("votes", "POST", { target_owner_id: "b", vote_type: "best_wrapping" }))).status).toBe(status);
  if (status !== 200) expect(state.db.writes).toHaveLength(0);
});
it("rechecks time immediately before write, and refuses missing/invalid settings and published results", async () => {
  identity.ownerId = "a"; vi.setSystemTime(new Date("2025-12-16T11:59:59Z"));
  state.db.before = async operation => { if (operation.table === "players" && operation.filters[0]?.[1] === "b") vi.setSystemTime(new Date("2025-12-16T12:00:00Z")); };
  expect((await votes.POST(req("votes", "POST", { target_owner_id: "b", vote_type: "best_wrapping" }))).status).toBe(403); expect(state.db.writes).toHaveLength(0);
  state.db.before = undefined; vi.setSystemTime(new Date("2025-12-15T12:00:00Z"));
  state.db.tables.game_settings[0].value = { deadlineIso: "garbage" };
  expect((await votes.POST(req("votes", "POST", { target_owner_id: "b", vote_type: "best_wrapping" }))).status).toBe(503);
  state.db.tables.game_settings.shift(); expect((await votes.POST(req("votes", "POST", { target_owner_id: "b", vote_type: "best_wrapping" }))).status).toBe(503);
  expect(state.db.writes).toHaveLength(0);
});
it("preserves omitted gift fields and supports explicit null, creation and partial bonus updates", async () => {
  identity.ownerId = "admin";
  expect((await gifts.POST(req("admin/gifts", "POST", { santa_owner_id: "a", category_id: "good" }))).status).toBe(200);
  expect(state.db.tables.gifts[0]).toMatchObject({ receiver_owner_id: "b", bonus_points: 2, category_id: "good" });
  expect(state.db.writes[0].values).toEqual({ category_id: "good" });
  expect((await gifts.POST(req("admin/gifts", "POST", { santa_owner_id: "a", receiver_owner_id: null, bonus_points: -3 }))).status).toBe(200);
  expect(state.db.tables.gifts[0]).toMatchObject({ receiver_owner_id: null, bonus_points: -3, category_id: "good" });
  expect((await gifts.POST(req("admin/gifts", "POST", { santa_owner_id: "admin", category_id: "good" }))).status).toBe(200);
  expect(state.db.tables.gifts[2]).toMatchObject({ receiver_owner_id: null, bonus_points: 0 });
});
it("does not write after gift read/reference errors", async () => {
  identity.ownerId = "admin"; state.db.failures.add("gifts:select");
  expect((await gifts.POST(req("admin/gifts", "POST", { santa_owner_id: "a", category_id: "good" }))).status).toBe(503);
  state.db.failures.clear(); expect((await gifts.POST(req("admin/gifts", "POST", { santa_owner_id: "a", receiver_owner_id: "missing" }))).status).toBe(400);
  expect(state.db.writes).toHaveLength(0);
});
it.each([null, [], {}, { deadlineIso: "2026-02-30T12:00:00Z" }, { deadlineIso: "2026-12-01" }, { deadlineIso: false }])("rejects invalid deadline %j", async body => {
  identity.ownerId = "admin"; expect((await deadline.POST(req("admin/team-deadline", "POST", body))).status).toBe(400); expect(state.db.writes).toHaveLength(0);
});
it("rejects cross-origin mutations before writes and bounds JSON input", async () => {
  identity.ownerId = "admin";
  expect((await publish.POST(req("admin/leaderboard-publish", "POST", { published: true }, { origin: "https://evil.test" }))).status).toBe(403);
  expect((await publish.POST(req("admin/leaderboard-publish", "POST", { published: true, extra: "x".repeat(20_000) }))).status).toBe(413);
  expect((await publish.POST(new Request("https://game.test/api/admin/leaderboard-publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status).toBe(400);
  expect(state.db.writes).toHaveLength(0);
});
it("does not hide vote/configuration read failures behind a successful leaderboard", async () => {
  identity.ownerId = "admin";
  for (const failure of ["package_votes:select", "game_settings:vote_points", "game_settings:leaderboard_published", "gifts:select", "teams:select", "gift_categories:select", "players:select"]) {
    state.db.failures.add(failure); expect((await leaderboard.GET(req("leaderboard?preview=1"))).status).toBe(503); state.db.failures.clear();
  }
  state.db.tables.package_votes[0].vote_type = "unknown";
  expect((await awardsAdmin.GET()).status).toBe(503);
});
it("retains the 2025 scoring formula for malus, captain, ties and santa/receiver distinction", async () => {
  identity.ownerId = "admin";
  const body = await (await leaderboard.GET(req("leaderboard?preview=1"))).json();
  // A: (-10 + 2 + 5 - 5) * 2 = -16. B: 10 + 5 + 10 = 25.
  expect(body.teams.find((row: { ownerId: string }) => row.ownerId === "a").totalPoints).toBe(9);
  expect(body.teams.find((row: { ownerId: string }) => row.ownerId === "b").totalPoints).toBe(50);
  expect(body.voting.best_wrapping.winners).toHaveLength(2);
  const awardBody = await (await awardsAdmin.GET()).json();
  expect(awardBody.best_wrapping.map((row: { ownerId: string }) => row.ownerId).sort()).toEqual(["a", "b"]);
  state.db.tables.game_settings[1].value = "true"; identity.ownerId = null;
  const publicBody = await (await leaderboard.GET(req("leaderboard"))).json();
  expect(publicBody.teams).toEqual(body.teams); expect(publicBody).not.toHaveProperty("votingDetails");
  expect(await (await awards.GET()).json()).toEqual(awardBody);
});
const teamBody = () => ({ members: ["b"], captain_id: "b", version: teamVersion({ members: ["a", "b"], captain_id: "a" }) });
it("protects team ownership, validates members and persists the authenticated owner", async () => {
  expect((await team.GET(req("team"))).status).toBe(401); identity.ownerId = "a";
  expect((await team.GET(req("team?owner_id=b"))).status).toBe(403);
  expect((await team.PUT(req("team", "PUT", { ...teamBody(), owner_id: "b" }))).status).toBe(403);
  expect(state.db.writes).toHaveLength(0);
  const response = await team.PUT(req("team", "PUT", teamBody(), { "x-fanta-owner-id": "b" })); expect(response.status).toBe(200);
  expect(state.db.tables.teams[0]).toMatchObject({ owner_id: "a", members: ["b"], captain_id: "b" });
  expect(state.db.tables.teams[1]).toMatchObject({ owner_id: "b", members: ["b"] });
});
it.each([{ members: ["b", "b"], captain_id: "b" }, { members: ["b"], captain_id: "a" }, { members: ["missing"], captain_id: null }, { members: Array(8).fill("a"), captain_id: null }])("rejects invalid team %j", async invalid => {
  identity.ownerId = "a"; expect((await team.PUT(req("team", "PUT", { ...teamBody(), ...invalid }))).status).toBe(400); expect(state.db.writes).toHaveLength(0);
});
it.each(["2025-12-15T11:30:00Z", "2025-12-15T11:30:00.001Z"])("locks teams at %s", async time => {
  identity.ownerId = "a"; vi.setSystemTime(new Date(time)); expect((await team.PUT(req("team", "PUT", teamBody()))).status).toBe(403); expect(state.db.writes).toHaveLength(0);
});
it("stops writes on load errors and stale versions", async () => {
  identity.ownerId = "a"; state.db.failures.add("teams:select"); expect((await team.PUT(req("team", "PUT", teamBody()))).status).toBe(503);
  state.db.failures.clear(); expect((await team.PUT(req("team", "PUT", { ...teamBody(), version: "old" }))).status).toBe(409); expect(state.db.writes).toHaveLength(0);
});
it("coordinates simultaneous writes in one process, detects a stale tab and accepts an idempotent retry", async () => {
  identity.ownerId = "a";
  const first = teamBody();
  const results = await Promise.all([team.PUT(req("team", "PUT", first)), team.PUT(req("team", "PUT", { ...first, members: ["a"], captain_id: "a" }))]);
  expect(results.map(response => response.status)).toEqual([200, 409]); expect(state.db.writes).toHaveLength(1);
  expect((await team.PUT(req("team", "PUT", first))).status).toBe(200); expect(state.db.writes).toHaveLength(1);
});

it.each([null, [], {}, { code: "", label: "Test", points: 1 }, { code: "C", label: "Test", points: "2" }, { code: "C", label: "Test", points: null }, { code: "C", label: "Test", points: 1, is_admin: true }])("validates category payload %j without writes", async body => {
  identity.ownerId = "admin"; expect((await categories.POST(req("admin/categories", "POST", body))).status).toBe(400); expect(state.db.writes).toHaveLength(0);
});
it.each([null, [], {}, { best_wrapping: 1, worst_wrapping: "-5", most_fitting: 10 }, { best_wrapping: null, worst_wrapping: -5, most_fitting: 10 }])("validates points payload %j without writes", async body => {
  identity.ownerId = "admin"; expect((await points.POST(req("admin/vote-points", "POST", body))).status).toBe(400); expect(state.db.writes).toHaveLength(0);
});
it.each([null, [], {}, { published: "true" }, { published: 1 }])("validates publishing payload %j without writes", async body => {
  identity.ownerId = "admin"; expect((await publish.POST(req("admin/leaderboard-publish", "POST", body))).status).toBe(400); expect(state.db.writes).toHaveLength(0);
});
it.each([null, [], {}, { santa_owner_id: "a", bonus_points: "3" }, { santa_owner_id: "a", receiver_owner_id: false }, { santa_owner_id: "a", category_id: "missing" }])("validates gift payload %j without writes", async body => {
  identity.ownerId = "admin"; expect((await gifts.POST(req("admin/gifts", "POST", body))).status).toBe(400); expect(state.db.writes).toHaveLength(0);
});
it("does not report success on rejected writes or delete categories in use", async () => {
  identity.ownerId = "admin";
  expect((await categories.DELETE(req("admin/categories?id=good", "DELETE"))).status).toBe(409); expect(state.db.writes).toHaveLength(0);
  state.db.failures.add("gifts:update"); const snapshot = structuredClone(state.db.tables.gifts);
  expect((await gifts.POST(req("admin/gifts", "POST", { santa_owner_id: "a", bonus_points: 9 }))).status).toBe(503); expect(state.db.tables.gifts).toEqual(snapshot);
  state.db.failures.clear(); identity.ownerId = "a"; state.db.failures.add("teams:update");
  expect((await team.PUT(req("team", "PUT", teamBody()))).status).toBe(503);
  expect(state.db.tables.teams[0].members).toEqual(["a", "b"]);
});
it("keeps partial and empty teams compatible with 2025 persistence", async () => {
  identity.ownerId = "a";
  expect((await team.PUT(req("team", "PUT", { ...teamBody(), members: [], captain_id: null }))).status).toBe(200);
  expect(state.db.tables.teams[0].members).toEqual([]);
});
it("blocks modifications once results are published", async () => {
  identity.ownerId = "a"; state.db.tables.game_settings[1].value = { published: true };
  expect((await team.PUT(req("team", "PUT", teamBody()))).status).toBe(403);
  vi.setSystemTime(new Date("2025-12-15T12:00:00Z")); expect((await votes.POST(req("votes", "POST", { target_owner_id: "b", vote_type: "best_wrapping" }))).status).toBe(403);
  expect(state.db.writes).toHaveLength(0);
});

it("reads legacy null members as empty without silently persisting a replacement", async () => {
  identity.ownerId = "a"; state.db.tables.teams[0].members = null; state.db.tables.teams[0].captain_id = null;
  const response = await team.GET(req("team")); expect(response.status).toBe(200);
  expect((await response.json()).team).toEqual({ members: [], captain_id: null }); expect(state.db.writes).toHaveLength(0);
});
it("preserves a legacy null bonus when an omitted field is updated", async () => {
  identity.ownerId = "admin"; state.db.tables.gifts[0].bonus_points = null;
  expect((await gifts.POST(req("admin/gifts", "POST", { santa_owner_id: "a", category_id: "good" }))).status).toBe(200);
  expect(state.db.tables.gifts[0].bonus_points).toBeNull();
});

it("normalizes historical vote aliases identically for leaderboard and awards", async () => {
  identity.ownerId = "admin"; state.db.tables.package_votes[0].vote_type = "bestWrapping";
  state.db.tables.package_votes[2].vote_type = "WORST_WRAPPING";
  const result = await (await awardsAdmin.GET()).json(); expect(result.best_wrapping).toHaveLength(2); expect(result.worst_wrapping[0].ownerId).toBe("a");
  const board = await (await leaderboard.GET(req("leaderboard?preview=1"))).json(); expect(board.teams.find((row: { ownerId: string }) => row.ownerId === "a").totalPoints).toBe(9);
});
