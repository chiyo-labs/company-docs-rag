import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getServerClient } from "../src/lib/supabase";
import { OPENAI_API_KEY, ANTHROPIC_API_KEY } from "../src/lib/env";
import { searchDocuments } from "../src/retrieval/search";
import { generateAnswer } from "../src/generation/answer";

const QUERY = "有給休暇の申請方法を教えてください";

async function main(): Promise<void> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY が未設定です");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY が未設定です");

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const supabase = getServerClient();
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  console.log(`\nクエリ: "${QUERY}"\n`);

  const chunks = await searchDocuments(QUERY, openai, supabase);
  console.log(`検索ヒット: ${chunks.length} 件\n`);

  const { answer, sources } = await generateAnswer(QUERY, chunks, anthropic);

  console.log("=".repeat(60));
  console.log("【回答】");
  console.log(answer);
  console.log("=".repeat(60));

  if (sources.length > 0) {
    console.log("\n【出典】");
    for (const src of sources) {
      const page = src.page_number != null ? ` (p.${src.page_number})` : "";
      console.log(`  - ${src.source_file}${page}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
