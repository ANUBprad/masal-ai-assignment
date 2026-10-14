import { serverCredentials } from "./ai.ts";
import { allowRequest, clientIp } from "./rate-limit.ts";

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function guard(request: Request) {
  if (!allowRequest(clientIp(request))) {
    throw new HttpError("Too many requests. Please wait a few minutes and try again.", 429);
  }
  try {
    return serverCredentials();
  } catch (error) {
    throw new HttpError(error instanceof Error ? error.message : "AI is not configured.", 503);
  }
}
