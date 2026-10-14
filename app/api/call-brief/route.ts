import { NextResponse } from "next/server";
import { generateCallBrief } from "@/lib/providers";
import { guard, errorResponse, jsonBody, HttpError } from "@/lib/http";
import { validateLead } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const plan = guard(request);
    const body = await jsonBody(request);
    let lead;
    try {
      lead = validateLead(body.lead);
    } catch (error) {
      throw new HttpError(error instanceof Error ? error.message : "Lead details are invalid.", 400);
    }
    const brief = await generateCallBrief(plan, lead);
    return NextResponse.json({ brief }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
