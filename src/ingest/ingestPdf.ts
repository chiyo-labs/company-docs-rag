import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { getServerClient } from "../lib/supabase";
import { OPENAI_API_KEY } from "../lib/env";
import { chunkText, type Chunk } from "./chunker";
import { embedTexts } from "./embed";
import { parsePdf } from "./parsePdf";

const DOCS_DIR = path.join(process.cwd(), "docs", "pdf");

type PdfChunk = Chunk & { pageNumber: number };

async function ingestFile(filePath: string, openai: OpenAI): Promise<void> {
  const fileName = path.basename(filePath);

  const pdfPages = await parsePdf(filePath);
  console.log(`[${fileName}] ページ数: ${pdfPages.length}`);

  // ページ単位でチャンク化してページ番号を付与
  const chunks: PdfChunk[] = [];
  for (const page of pdfPages) {
    const pageChunks = chunkText(page.text);
    for (const chunk of pageChunks) {
      chunks.push({ ...chunk, pageNumber: page.pageNumber });
    }
  }
  console.log(`[${fileName}] チャンク数: ${chunks.length}`);

  const embeddings = await embedTexts(openai, chunks.map((c) => c.text));

  const supabase = getServerClient();

  // 冪等な再インジェスト: 既存レコードを先に削除
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("source_file", fileName);
  if (deleteError) {
    throw new Error(`削除エラー [${fileName}]: ${deleteError.message}`);
  }

  const rows = chunks.map((chunk, i) => ({
    content: chunk.text,
    embedding: embeddings[i],
    source_file: fileName,
    page_number: chunk.pageNumber,
    metadata: { source_type: "pdf" },
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
    .filter((f) => path.extname(f).toLowerCase() === ".pdf")
    .map((f) => path.join(DOCS_DIR, f));

  if (files.length === 0) {
    console.log("対象PDFが見つかりませんでした。");
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
