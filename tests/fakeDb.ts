// Behavioral test double for the query methods used by this app, not PostgreSQL/RLS.
export type Row = Record<string, unknown>;
type Operation = { table: string; kind: string; values?: Row | Row[]; filters: [string, unknown][] };
export class FakeDb {
  tables: Record<string, Row[]> = {};
  calls: Operation[] = [];
  failures = new Set<string>();
  before?: (operation: Operation) => Promise<void>;
  reset() {
    this.tables = {
      players: [
        { owner_id: "a", name: "A", display_name: "A", is_admin: false, access_code: "CODEA" },
        { owner_id: "b", name: "B", display_name: "B", is_admin: false, access_code: "CODEB" },
        { owner_id: "admin", name: "Admin", display_name: "Admin", is_admin: true, access_code: "ADMIN" },
      ],
      game_settings: [
        { key: "team_lock_deadline", value: { deadlineIso: "2025-12-15T11:30:00Z" } },
        { key: "leaderboard_published", value: { published: false } },
        { key: "vote_points", value: { best_wrapping: 5, worst_wrapping: -5, most_fitting: 10 } },
      ],
      teams: [{ owner_id: "a", members: ["a", "b"], captain_id: "a" }, { owner_id: "b", members: ["b"], captain_id: "b" }],
      gifts: [{ santa_owner_id: "a", receiver_owner_id: "b", category_id: "bad", bonus_points: 2 }, { santa_owner_id: "b", receiver_owner_id: "a", category_id: "good", bonus_points: 0 }],
      gift_categories: [{ id: "bad", code: "BAD", label: "Malus", points: -10 }, { id: "good", code: "GOOD", label: "Bonus", points: 10 }, { id: "unused", code: "UNUSED", label: "Unused", points: 0 }],
      package_votes: [
        { voter_owner_id: "a", target_owner_id: "b", vote_type: "best_wrapping" },
        { voter_owner_id: "b", target_owner_id: "a", vote_type: "best_wrapping" },
        { voter_owner_id: "b", target_owner_id: "a", vote_type: "worst_wrapping" },
        { voter_owner_id: "admin", target_owner_id: "a", vote_type: "worst_wrapping" },
        { voter_owner_id: "a", target_owner_id: "b", vote_type: "most_fitting" },
      ],
    };
    this.calls = []; this.failures.clear(); this.before = undefined;
  }
  get writes() { return this.calls.filter(call => call.kind !== "select"); }
  from(table: string) { return new Query(this, table); }
}
class Query implements PromiseLike<{ data: Row[] | Row | null; error: { code: string } | null }> {
  kind = "select";
  projection = "*";
  values?: Row | Row[];
  filters: [string, unknown][] = [];
  singleMode = "";
  maximum = Infinity;
  conflict = "";
  constructor(private db: FakeDb, private table: string) {}
  select(columns = "*") { this.projection = columns; return this; }
  eq(column: string, value: unknown) { this.filters.push([column, value]); return this; }
  order() { return this; }
  limit(value: number) { this.maximum = value; return this; }
  maybeSingle() { this.singleMode = "maybe"; return this; }
  single() { this.singleMode = "one"; return this; }
  insert(values: Row | Row[]) { this.kind = "insert"; this.values = values; return this; }
  update(values: Row) { this.kind = "update"; this.values = values; return this; }
  upsert(values: Row, options?: { onConflict?: string }) { this.kind = "upsert"; this.values = values; this.conflict = options?.onConflict ?? "id"; return this; }
  delete() { this.kind = "delete"; return this; }
  async execute() {
    const operation = { table: this.table, kind: this.kind, values: this.values, filters: this.filters };
    this.db.calls.push(structuredClone(operation));
    await this.db.before?.(operation);
    if (this.db.failures.has(`${this.table}:${this.kind}`) || this.db.failures.has(`${this.table}:${this.filters[0]?.[1]}`)) return { data: null, error: { code: "ISOLATED_FAILURE" } };
    const rows = this.db.tables[this.table] ?? [];
    const matches = (row: Row) => this.filters.every(([key, value]) => JSON.stringify(row[key]) === JSON.stringify(value));
    let selected = rows.filter(matches).slice(0, this.maximum);
    if (this.kind === "update") selected.forEach(row => Object.assign(row, this.values));
    if (this.kind === "delete") this.db.tables[this.table] = rows.filter(row => !selected.includes(row));
    if (this.kind === "insert" || this.kind === "upsert") {
      selected = [];
      for (const value of Array.isArray(this.values) ? this.values : [this.values ?? {}]) {
        const keys = this.conflict.split(",");
        const existing = this.kind === "upsert" ? rows.find(row => keys.every(key => row[key] === value[key])) : undefined;
        if (existing) { Object.assign(existing, value); selected.push(existing); }
        else { const inserted = structuredClone(value); if (this.table === "gift_categories") inserted.id = "created"; rows.push(inserted); selected.push(inserted); }
      }
      this.db.tables[this.table] = rows;
    }
    const project = (row: Row) => this.projection === "*" ? row : Object.fromEntries(this.projection.split(",").map(key => [key.trim(), row[key.trim()]]));
    const data = selected.map(project);
    if (this.singleMode && (data.length > 1 || (this.singleMode === "one" && !data.length))) return { data: null, error: { code: "PGRST116" } };
    return { data: structuredClone(this.singleMode ? data[0] ?? null : data), error: null };
  }
  then<TResult1 = { data: Row[] | Row | null; error: { code: string } | null }, TResult2 = never>(onfulfilled?: ((value: { data: Row[] | Row | null; error: { code: string } | null }) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
    return this.execute().then(onfulfilled, onrejected);
  }
}
