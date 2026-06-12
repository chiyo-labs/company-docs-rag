import Anthropic from "@anthropic-ai/sdk";
import type { SearchResult } from "../retrieval/search";

export type Source = {
  source_file: string;
  page_number: number | null;
};

export type AnswerResult = {
  answer: string;
  sources: Source[];
};

const SYSTEM_PROMPT = `あなたは社内文書QAアシスタントです。
以下の「参考文書」に記載されている内容のみを根拠に質問へ回答してください。
参考文書に記載のない内容は「該当する情報が見つかりません」と答えてください。
推測や文書外の知識は使用しないでください。`;

export async function generateAnswer(
  query: string,
  chunks: SearchResult[],
  anthropic: Anthropic
): Promise<AnswerResult> {
  if (chunks.length === 0) {
    return { answer: "該当する情報が見つかりません", sources: [] };
  }

  const contextText = chunks
    .map((chunk, i) => {
      const page =
        chunk.page_number != null
          ? `（ページ: ${chunk.page_number}）`
          : "（ページなし）";
      return `[${i + 1}] ファイル: ${chunk.source_file}${page}\n${chunk.content}`;
    })
    .join("\n\n");

  const userMessage = `## 参考文書\n\n${contextText}\n\n## 質問\n${query}`;

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const response = await stream.finalMessage();

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const answer = textBlock?.text ?? "該当する情報が見つかりません";

  // source_file + page_number の組み合わせで重複除去
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const chunk of chunks) {
    const key = `${chunk.source_file}::${chunk.page_number ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      sources.push({
        source_file: chunk.source_file,
        page_number: chunk.page_number,
      });
    }
  }

  return { answer, sources };
}
