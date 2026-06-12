/**
 * 必須環境変数の存在チェック。
 * サーバー起動時またはインジェストスクリプト実行時に呼び出すことで、
 * 実行途中での KeyError を防ぐ。
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `環境変数 "${key}" が設定されていません。.env.local を確認してください。`
    );
  }
  return value;
}

// --- Supabase ---
export const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// SERVICE_ROLE_KEY はサーバーサイド専用 (クライアントバンドルに含めない)
export const SUPABASE_SERVICE_ROLE_KEY =
  typeof window === "undefined"
    ? requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    : null;

// --- OpenAI (Embedding生成) ---
export const OPENAI_API_KEY =
  typeof window === "undefined" ? requireEnv("OPENAI_API_KEY") : null;

// --- Anthropic (回答生成) --- 回答生成機能実装時まで任意
export const ANTHROPIC_API_KEY =
  typeof window === "undefined" ? (process.env.ANTHROPIC_API_KEY ?? null) : null;
