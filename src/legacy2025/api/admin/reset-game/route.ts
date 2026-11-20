import { api, ApiError, sameOrigin } from "@/lib/api";
import { requireAdmin } from "@/legacy2025/auth";
// No destructive query exists here. A scoped, atomic replacement needs verified DDL.
export const POST = api(async (req: Request) => {
  await requireAdmin();
  sameOrigin(req);
  throw new ApiError(410, "Reset globale disabilitato per proteggere i dati storici.");
});
