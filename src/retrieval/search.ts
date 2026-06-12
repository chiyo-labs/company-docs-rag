import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase";
import { embedTexts } from "../ingest/embed";

export type SearchResult = {
  id: number;
  source_file: string;
  page_number: number | null;
  similarity: number;
  content: string;
};

export type SearchOptions = {
  matchThreshold?: number;
  matchCount?: number;
};

export async function searchDocuments(
  query: string,
  openai: OpenAI,
  supabase: SupabaseClient<Database>,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { matchThreshold = 0.3, matchCount = 3 } = options;

  const [queryEmbedding] = await embedTexts(openai, [query]);

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) throw new Error(`match_documents エラー: ${error.message}`);
  if (!data) return [];

  // RPC の ORDER BY に加え、クライアント側でも降順を保証する
  return [...data].sort((a, b) => b.similarity - a.similarity);
}
