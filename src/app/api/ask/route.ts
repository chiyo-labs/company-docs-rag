import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getServerClient } from "../../../lib/supabase";
import { searchDocuments } from "../../../retrieval/search";
import { generateAnswer } from "../../../generation/answer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body?.query ?? "";

    if (!query.trim()) {
      return NextResponse.json({ error: "query が空です" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!openaiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY が設定されていません" },
        { status: 500 }
      );
    }
    if (!anthropicKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY が設定されていません" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiKey });
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const supabase = getServerClient();

    const chunks = await searchDocuments(query, openai, supabase);
    const result = await generateAnswer(query, chunks, anthropic);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
