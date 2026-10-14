import { providerPlan, type ProviderKey } from "./providers.ts";
import { allowRequest, clientIp } from "./rate-limit.ts";

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function guard(request: Request): ProviderKey[] {
  if (!allowRequest(clientIp(request))) {
    throw new HttpError("Too many requests. Please wait a few minutes and try again.", 429);
  }
  const plan = providerPlan();
  if (!plan.length) {
    throw new HttpError("AI is not configured. Add a provider API key on the server.", 503);
  }
  return plan;
}
