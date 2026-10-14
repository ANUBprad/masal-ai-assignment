import { NextResponse } from "next/server";
import { answerChat } from "@/lib/gemini";
import { guard, errorResponse, jsonBody, HttpError } from "@/lib/http";
import { validateLead } from "@/lib/validation";
import type { ChatMessage } from "@/types/lead";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const credentials = guard(request);
    const body = await jsonBody(request);
    let lead;
    try {
      lead = validateLead(body.lead);
    } catch (error) {
      throw new HttpError(error instanceof Error ? error.message : "Lead details are invalid.", 400);
    }
    if (typeof body.question !== "string" || !body.question.trim() || body.question.length > 5000) {
      throw new HttpError("Enter a question of up to 5,000 characters.", 400);
    }
    const history = Array.isArray(body.history) ? body.history.filter((item): item is ChatMessage =>
      !!item && typeof item === "object" &&
      ["user", "assistant"].includes(String((item as ChatMessage).role)) &&
      typeof (item as ChatMessage).content === "string"
    ).slice(-10) : [];
    const answer = await answerChat(credentials, lead, history, body.question.trim());
    return NextResponse.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
