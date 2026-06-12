import fs from "fs";
import path from "path";
import readline from "readline";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getServerClient } from "../src/lib/supabase";
import { OPENAI_API_KEY, ANTHROPIC_API_KEY } from "../src/lib/env";
import { searchDocuments } from "../src/retrieval/search";
import { generateAnswer } from "../src/generation/answer";

const CSV_PATH = path.resolve(
  process.cwd(),
  "docs/test/case3-test-questions.csv"
);

type TestQuestion = {
  no: number;
  question: string;
  expectedAnswer: string;
  expectedSource: string;
  expectedSection: string;
  kind: "該当あり" | "該当なし";
};

type EvalResult = {
  No: number;
  質問: string;
  種別: string;
  期待出典: string;
  実際出典: string;
  回答抜粋: string;
  判定: string;
};

function parseCsv(filePath: string): TestQuestion[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.trim().split("\n").slice(1); // skip header

  return lines.map((line) => {
    // CSVは「1,質問,期待される回答,出典文書,出典セクション,種別」の順
    // 月額3,000円のようにカンマを含むセルがあるため、単純splitは不可
    // 最初のフィールドとして番号を取り出し、残りをパース
    const firstComma = line.indexOf(",");
    const no = Number(line.slice(0, firstComma));
    const rest = line.slice(firstComma + 1);

    // 末尾の種別（該当あり or 該当なし〜）を取り出す
    const kindMatch = rest.match(/,(該当あり|該当なし[^,]*)$/);
    if (!kindMatch) throw new Error(`種別が見つかりません: ${line}`);

    const kindRaw = kindMatch[1];
    const kind: TestQuestion["kind"] = kindRaw.startsWith("該当あり")
      ? "該当あり"
      : "該当なし";

    // 種別の前の部分を取り出す
    const body = rest.slice(0, rest.length - kindMatch[0].length);

    // 最後の2フィールド（出典文書, 出典セクション）を後ろから取り出す
    const sectionMatch = body.match(/,([^,]*)$/);
    const section = sectionMatch ? sectionMatch[1] : "";
    const bodyWithoutSection = sectionMatch
      ? body.slice(0, body.length - sectionMatch[0].length)
      : body;

    const sourceMatch = bodyWithoutSection.match(/,([^,]*)$/);
    const source = sourceMatch ? sourceMatch[1] : "";
    const bodyWithoutSource = sourceMatch
      ? bodyWithoutSection.slice(0, bodyWithoutSection.length - sourceMatch[0].length)
      : bodyWithoutSection;

    // 残りは「質問,期待される回答」 - 質問は最初のカンマまで
    const qComma = bodyWithoutSource.indexOf(",");
    const question = bodyWithoutSource.slice(0, qComma);
    const expectedAnswer = bodyWithoutSource.slice(qComma + 1);

    return { no, question, expectedAnswer, expectedSource: source, expectedSection: section, kind };
  });
}

function judge(answer: string, kind: TestQuestion["kind"]): string {
  const noInfo = answer.includes("該当する情報が見つかりません");
  if (kind === "該当あり") return noInfo ? "❌ 取りこぼし" : "✅ 回答あり";
  return noInfo ? "✅ 正しく拒否" : "❌ ハルシネーション";
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N]: `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function main(): Promise<void> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY が未設定です");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY が未設定です");

  const questions = parseCsv(CSV_PATH);
  const skipConfirm = process.argv.includes("--yes");

  console.log(`\n📋 評価対象: ${questions.length} 問`);
  console.log("   該当あり:", questions.filter((q) => q.kind === "該当あり").length, "問");
  console.log("   該当なし:", questions.filter((q) => q.kind === "該当なし").length, "問");
  console.log("\n⚠️  OpenAI Embedding + Claude Opus API コストが発生します。");

  if (!skipConfirm) {
    const ok = await confirm("実行しますか？");
    if (!ok) {
      console.log("中止しました。");
      process.exit(0);
    }
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const supabase = getServerClient();
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const results: EvalResult[] = [];

  for (const q of questions) {
    process.stdout.write(`  [${q.no}/12] ${truncate(q.question, 25)} ... `);

    const chunks = await searchDocuments(q.question, openai, supabase);
    const { answer, sources } = await generateAnswer(q.question, chunks, anthropic);

    const actualSources = [...new Set(sources.map((s) => s.source_file))].join(", ");
    const verdict = judge(answer, q.kind);

    results.push({
      No: q.no,
      質問: truncate(q.question, 20),
      種別: q.kind,
      期待出典: truncate(q.expectedSource, 30),
      実際出典: truncate(actualSources || "（なし）", 35),
      回答抜粋: truncate(answer, 50),
      判定: verdict,
    });

    console.log(verdict);
  }

  console.log("\n" + "=".repeat(80));
  console.log("【評価結果】");
  console.table(results);

  const passed = results.filter((r) => r.判定.startsWith("✅")).length;
  console.log(`\n✅ ${passed} / ${results.length} 問 正解`);
  console.log(
    `❌ ${results.length - passed} 問 要確認: ` +
      results
        .filter((r) => r.判定.startsWith("❌"))
        .map((r) => `#${r.No}`)
        .join(", ") || "なし"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
