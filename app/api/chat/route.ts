import { NextResponse } from "next/server";
import { answerChat } from "@/lib/gemini";
import { guard, errorResponse, jsonBody, HttpError } from "@/lib/http";
import { validateAnalysis, validateLead } from "@/lib/validation";
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
    const source = body.lead && typeof body.lead === "object" && !Array.isArray(body.lead)
      ? (body.lead as Record<string, unknown>) : {};
    const analysis = validateAnalysis(source.analysis);
    const score = typeof source.score === "number" && Number.isFinite(source.score) ? source.score : undefined;
    const priority = source.priority === "Hot" || source.priority === "Warm" || source.priority === "Cold"
      ? source.priority : undefined;
    const answer = await answerChat(credentials, lead, history, body.question.trim(), analysis, score, priority);
    return NextResponse.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
