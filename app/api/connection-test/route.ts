import { NextResponse } from "next/server";
import { testConnection } from "@/lib/gemini";
import { credentialsFrom, errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const credentials = credentialsFrom(request);
    await testConnection(credentials);
    return NextResponse.json({ ok: true, message: "Gemini connection successful." }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
