// 文字数ベースのトークン近似
// 日本語: ~1〜1.5文字/token、英語: ~4文字/token
// 1500文字 ≈ 500〜1000トークン (混在テキストの目安)
const MAX_CHUNK_CHARS = 1500;
const OVERLAP_CHARS = 200; // ≈ 100トークン

export type Chunk = {
  text: string;
  index: number;
};

export function chunkText(
  text: string,
  maxChars = MAX_CHUNK_CHARS,
  overlapChars = OVERLAP_CHARS
): Chunk[] {
  // \n\n 以上の空行で段落分割
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    // 1段落が maxChars を超える場合は行単位に細分化
    const parts = para.length > maxChars
      ? para.split("\n").filter(Boolean)
      : [para];

    for (const part of parts) {
      const joiner = buffer ? "\n\n" : "";
      const candidate = buffer + joiner + part;

      if (candidate.length > maxChars && buffer) {
        // バッファを確定チャンクとして保存
        chunks.push({ text: buffer.trim(), index: chunks.length });
        // 末尾 overlapChars 文字を次チャンクの先頭に引き継ぐ
        const overlap = buffer.length > overlapChars
          ? buffer.slice(-overlapChars)
          : buffer;
        buffer = overlap + "\n\n" + part;
      } else {
        buffer = candidate;
      }
    }
  }

  if (buffer.trim()) {
    chunks.push({ text: buffer.trim(), index: chunks.length });
  }

  return chunks;
}
