// Request-body reading with a hard byte cap. Kept in its own alias-free module
// (relative imports only) so the Node test runner can exercise it directly.
import { HttpError } from "./guard.ts";

// Upper bound on an accepted request body. The six intake fields plus a chat
// question and a short history are comfortably under this; the cap stops an
// unauthenticated caller from streaming a multi-megabyte body into memory before
// any field validation runs.
export const MAX_BODY_BYTES = 128 * 1024;

// Reads the body with a hard byte cap. It checks the declared Content-Length
// first (a cheap rejection) and then enforces the same cap while streaming, so
// an absent or falsified header cannot bypass the limit.
async function readLimitedText(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HttpError("Request body is too large.", 413);
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new HttpError("Request body is too large.", 413);
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(buffer);
}

export async function jsonBody(request: Request, maxBytes: number = MAX_BODY_BYTES): Promise<Record<string, unknown>> {
  const text = await readLimitedText(request, maxBytes);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new HttpError("Request body must be a valid JSON object.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("Request body must be a valid JSON object.", 400);
  }
  return value as Record<string, unknown>;
}
