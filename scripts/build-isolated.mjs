import { spawnSync } from "node:child_process";
// Build with explicitly inert credentials; .env files cannot override process.env.
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", APP_ORIGIN: "http://localhost:3000", SUPABASE_PUBLISHABLE_KEY: "isolated-build-placeholder", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "isolated-build-placeholder", SUPABASE_URL: "http://127.0.0.1:9", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_SERVICE_ROLE_KEY: "isolated-build-placeholder", NEXT_PUBLIC_SUPABASE_ANON_KEY: "isolated-build-placeholder", SESSION_SECRET: "isolated-build-placeholder-at-least-32-bytes" };
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env, stdio: "inherit" });
process.exit(result.status ?? 1);
