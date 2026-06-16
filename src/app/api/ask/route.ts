import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerClient } from "../../../lib/supabase";
import { searchDocuments } from "../../../retrieval/search";
import { generateAnswer } from "../../../generation/answer";
import { ALLOWED_EMAIL_DOMAIN } from "../../../lib/env";

export async function POST(req: NextRequest) {
  try {
    // --- 認証チェック ---
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Route Handler では cookies() が read-only になる場合がある
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (
      ALLOWED_EMAIL_DOMAIN &&
      !user.email?.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
    ) {
      return NextResponse.json(
        { error: "このドメインのアカウントはアクセスできません" },
        { status: 401 }
      );
    }

    // --- RAG 処理 ---
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

    const startMs = Date.now();
    const chunks = await searchDocuments(query, openai, supabase);
    const result = await generateAnswer(query, chunks, anthropic);
    const elapsedMs = Date.now() - startMs;

    // 会話履歴を保存（失敗しても回答は返す）
    const { error: insertError } = await supabase.from("conversations").insert({
      user_id: user.id,
      query,
      answer: result.answer,
      sources: result.sources,
      elapsed_ms: elapsedMs,
    });
    if (insertError) {
      console.error("会話履歴保存エラー:", insertError.message);
    }

    return NextResponse.json({ ...result, elapsedMs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
