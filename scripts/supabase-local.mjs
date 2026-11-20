import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const commands = { start: ["start"], status: ["status", "-o", "json"], stop: ["stop"], migrate: ["migration", "up", "--local"], configure: ["status", "-o", "json"] };
const command = process.argv[2];
if (process.argv.length !== 3 || !Object.hasOwn(commands, command)) throw new Error("Allowed: start, status, stop, migrate, configure (local only).");
const binary = process.platform === "win32" ? "supabase.exe" : "supabase";
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^SUPABASE_/i.test(name)));
env.SUPABASE_PROJECT_ID = "fanta-claus-local";
// Capture CLI output: start/status can contain keys. Never print it to logs.
const result = spawnSync(binary, commands[command], { encoding: "utf8", windowsHide: true, env });
if (result.error || result.status !== 0) {
  console.error("Comando locale non eseguito. Verificare Supabase CLI >=2.108 (o v3), Docker e configurazione locale. Nessuna operazione remota richiesta."); process.exit(1);
}
if (command === "configure") {
  const status = JSON.parse(result.stdout);
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  if (status.API_URL !== "http://127.0.0.1:54321" || typeof key !== "string") throw new Error("Unexpected local configuration; nothing written.");
  writeFileSync(".env.local", `SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_PUBLISHABLE_KEY=${key}\nAPP_ORIGIN=http://localhost:3000\n`, { flag: "wx" });
  console.log("Configurazione locale creata in .env.local; file preesistenti mai sovrascritti.");
} else console.log(`Supabase locale: ${command} completato. Valori delle chiavi omessi.`);
