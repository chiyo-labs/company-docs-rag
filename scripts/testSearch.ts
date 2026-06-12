import OpenAI from "openai";
import { getServerClient } from "../src/lib/supabase";
import { OPENAI_API_KEY } from "../src/lib/env";
import { searchDocuments } from "../src/retrieval/search";

const QUERY = "有給休暇の申請方法を教えてください";
const CONTENT_PREVIEW_CHARS = 200;

async function main(): Promise<void> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY が未設定です");

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const supabase = getServerClient();

  console.log(`\nクエリ: "${QUERY}"\n`);

  const results = await searchDocuments(QUERY, openai, supabase);

  if (results.length === 0) {
    console.log("該当する文書が見つかりませんでした。");
    return;
  }

  console.log(`検索結果: ${results.length} 件\n`);
  console.log("─".repeat(60));

  for (const [i, result] of results.entries()) {
    const preview = result.content.slice(0, CONTENT_PREVIEW_CHARS);
    const truncated = result.content.length > CONTENT_PREVIEW_CHARS ? "…" : "";

    console.log(`#${i + 1}  similarity: ${result.similarity.toFixed(3)}`);
    console.log(`    source_file: ${result.source_file}`);
    console.log(`    page_number: ${result.page_number ?? "N/A"}`);
    console.log(`    content: ${preview}${truncated}`);
    console.log("─".repeat(60));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
