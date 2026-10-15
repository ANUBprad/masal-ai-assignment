import { NextResponse } from "next/server";
import { AiFailure, safeAiError } from "@/lib/providers";
import { HttpError, guard } from "@/lib/guard";

export { HttpError, guard };
export { jsonBody, MAX_BODY_BYTES } from "./body.ts";

export function errorResponse(error: unknown) {
  const status = error instanceof HttpError ? error.status
    : error instanceof AiFailure ? error.status : 502;
  const message = error instanceof HttpError ? error.message : safeAiError(error);
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
