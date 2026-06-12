import fs from "fs";
import path from "path";
import { chunkText } from "../src/ingest/chunker";

const filePath = path.join(process.cwd(), "docs", "sample", "sample.md");
const content = fs.readFileSync(filePath, "utf-8");

console.log(`ファイル: ${path.basename(filePath)}`);
console.log(`総文字数: ${content.length}`);

const chunks = chunkText(content);

console.log(`チャンク数: ${chunks.length}`);
console.log("─".repeat(60));

for (const chunk of chunks) {
  const preview = chunk.text.slice(0, 80).replace(/\n/g, "↵");
  console.log(`[chunk ${chunk.index}] ${chunk.text.length}文字`);
  console.log(`  ${preview}${chunk.text.length > 80 ? "..." : ""}`);
  console.log();
}
