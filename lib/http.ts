import { NextResponse } from "next/server";
import { parseAiCredentials, safeAiError } from "@/lib/ai";

export function credentialsFrom(request: Request) {
  try {
    return parseAiCredentials(request.headers);
  } catch (error) {
    throw new HttpError(error instanceof Error ? error.message : "AI credentials are required.", 400);
  }
}

export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

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
