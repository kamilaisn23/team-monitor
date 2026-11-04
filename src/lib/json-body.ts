import { NextResponse } from "next/server";

export const MAX_JSON_BYTES = 32 * 1024;
type Result = { ok: true; value: Record<string, unknown> } | { ok: false; response: NextResponse };
export async function readJsonObject(req: Request): Promise<Result> {
  const fail = (message: string, status = 400): Result => ({ ok: false, response: NextResponse.json({ error: message }, { status }) });
  const declared = req.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_JSON_BYTES)) {
    await req.body?.cancel().catch(() => undefined);
    return fail("JSON body cannot exceed 32 KiB", 413);
  }
  if (!req.body) return fail("A JSON object is required");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) { await reader.cancel(); return fail("JSON body cannot exceed 32 KiB", 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) return fail("A JSON object is required");
    return { ok: true, value: value as Record<string, unknown> };
  } catch { return fail("Malformed JSON body"); }
  finally { reader.releaseLock(); }
}
