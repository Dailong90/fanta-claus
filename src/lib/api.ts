import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// All API responses, including private errors, must bypass shared caches.
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function api<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try { return await handler(...args); }
    catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status);
      // Do not serialize DB errors, request bodies, tokens or configuration values.
      return json({ error: "Errore interno. Riprova tra poco." }, 500);
    }
  };
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (req.headers.get("sec-fetch-site") === "cross-site" ||
      (origin !== null && origin !== new URL(req.url).origin)) {
    throw new ApiError(403, "Origine della richiesta non consentita.");
  }
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  sameOrigin(req);
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "È richiesto un body JSON.");
  }
  // Bound actual bytes, including requests without Content-Length.
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "JSON non valido.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 16_384) {
      await reader.cancel();
      throw new ApiError(413, "Richiesta troppo grande.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new ApiError(400, "JSON non valido."); }
  if (!isRecord(body)) throw new ApiError(400, "È richiesto un oggetto JSON.");
  return body;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function textField(value: unknown, name: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new ApiError(400, `Campo ${name} non valido.`);
  }
  return value.trim();
}

export function numberField(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new ApiError(400, `Campo ${name} non valido.`);
  }
  return value;
}

export function onlyFields(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some(key => !allowed.includes(key))) {
    throw new ApiError(400, "Campi della richiesta non consentiti.");
  }
}
