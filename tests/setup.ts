import { beforeEach, vi } from "vitest";
beforeEach(() => {
  // Inert values overwrite any developer environment. DB is mocked in route tests.
  vi.stubEnv("SESSION_SECRET", "isolated-test-secret-at-least-32-bytes");
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:9");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "isolated-test-placeholder");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "isolated-test-placeholder");
  vi.stubEnv("APP_ORIGIN", "https://game.test");
  // A forgotten mock must fail locally, never reach any external service.
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Unmocked network is disabled in tests"))));
});
