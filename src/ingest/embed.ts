import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * テキスト配列を Embedding ベクトル配列に変換する。
 * MVP では全チャンクを 1 リクエストで送信 (上限: 2048 入力 / 8192 tokens each)。
 */
export async function embedTexts(
  client: OpenAI,
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  // API は順序を保証しないため index でソート
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}
