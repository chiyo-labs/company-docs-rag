import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} from "./env";

/**
 * Supabase テーブル型の定義。
 * `supabase gen types typescript` で自動生成した型に差し替えると
 * クエリ結果が完全に型安全になる。
 */
export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: number;
          content: string;
          embedding: number[] | null;
          source_file: string;
          page_number: number | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          content: string;
          embedding?: number[] | null;
          source_file: string;
          page_number?: number | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          content?: string;
          embedding?: number[] | null;
          source_file?: string;
          page_number?: number | null;
          metadata?: Record<string, unknown>;
        };
        // GenericTable が要求する必須フィールド
        Relationships: [];
      };
    };
    // GenericSchema が要求する必須フィールド (未使用だが型制約を満たすために必要)
    Views: Record<never, never>;
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: Array<{
          id: number;
          content: string;
          source_file: string;
          page_number: number | null;
          metadata: Record<string, unknown>;
          similarity: number;
        }>;
      };
    };
  };
};

// ---- ブラウザ用クライアント (anon key) --------------------------------

let _browserClient: SupabaseClient<Database> | null = null;

/**
 * ブラウザ・サーバー両用の公開クライアント (anon key)。
 * RLS が有効な操作に使用する。singleton。
 */
export function getBrowserClient(): SupabaseClient<Database> {
  if (!_browserClient) {
    _browserClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _browserClient;
}

// ---- サーバー用クライアント (service role key) ------------------------

/**
 * サーバーサイド専用クライアント (service role key)。
 * RLS をバイパスするため、クライアントコンポーネントや
 * ブラウザから呼び出してはいけない。
 *
 * 用途: インジェストスクリプト、Server Actions、Route Handlers
 */
export function getServerClient(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerClient() はサーバーサイドでのみ呼び出せます。" +
        "クライアントコンポーネントでは getBrowserClient() を使用してください。"
    );
  }

  // SUPABASE_SERVICE_ROLE_KEY は env.ts でサーバー側のみ requireEnv() 済み。
  // ブラウザ (window あり) は上の guard で到達しないため non-null アサーションは安全。
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false, // サーバー側でセッション更新は不要
      persistSession: false,   // サーバー側でセッション永続化は不要
    },
  });
}
