import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { getServerClient } from "../lib/supabase";
import { OPENAI_API_KEY } from "../lib/env";
import { chunkText } from "./chunker";
import { embedTexts } from "./embed";

const DOCS_DIR = path.join(process.cwd(), "docs", "sample");
const SUPPORTED_EXTS = new Set([".md", ".txt"]);

async function ingestFile(filePath: string, openai: OpenAI): Promise<void> {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  const sourceType = ext === ".md" ? "markdown" : "txt";

  const content = fs.readFileSync(filePath, "utf-8");
  const chunks = chunkText(content);
  console.log(`[${fileName}] チャンク数: ${chunks.length}`);

  const embeddings = await embedTexts(openai, chunks.map((c) => c.text));

  const supabase = getServerClient();

  // 既存レコードを削除 (冪等な再インジェストのため)
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("source_file", fileName);
  if (deleteError) {
    throw new Error(`削除エラー [${fileName}]: ${deleteError.message}`);
  }

  // チャンクを一括 INSERT
  const rows = chunks.map((chunk, i) => ({
    content: chunk.text,
    embedding: embeddings[i],
    source_file: fileName,
    page_number: null,
    metadata: { source_type: sourceType },
  }));

  const { error: insertError } = await supabase.from("documents").insert(rows);
  if (insertError) {
    throw new Error(`INSERT エラー [${fileName}]: ${insertError.message}`);
  }

  console.log(`[${fileName}] 保存件数: ${rows.length}`);
}

async function main(): Promise<void> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY が未設定です");
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  if (!fs.existsSync(DOCS_DIR)) {
    throw new Error(`ディレクトリが存在しません: ${DOCS_DIR}`);
  }

  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => SUPPORTED_EXTS.has(path.extname(f)))
    .map((f) => path.join(DOCS_DIR, f));

  if (files.length === 0) {
    console.log("対象ファイルが見つかりませんでした。");
    return;
  }

  console.log(`\n対象ファイル: ${files.length} 件`);
  for (const file of files) {
    await ingestFile(file, openai);
  }
  console.log("\nインジェスト完了");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
