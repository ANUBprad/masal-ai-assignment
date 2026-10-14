import { NextResponse } from "next/server";
import { safeAiError } from "@/lib/ai";
import { HttpError, guard } from "@/lib/guard";

export { HttpError, guard };

export function errorResponse(error: unknown) {
  const status = error instanceof HttpError ? error.status : 502;
  const message = error instanceof HttpError ? error.message : safeAiError(error);
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError("Request body must be a valid JSON object.", 400);
  }
}
