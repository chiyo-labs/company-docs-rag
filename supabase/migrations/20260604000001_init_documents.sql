-- ============================================================
-- Migration: init_documents
-- RAGシステム用ドキュメントテーブルと類似検索RPC関数
-- ============================================================

-- 1. pgvector拡張を有効化
create extension if not exists vector;

-- 2. documentsテーブル
--    metadata (jsonb) には将来の部署別アクセス制御用フィールドを格納可能
--    例: {"department": "engineering", "confidential": false}
create table documents (
  id          bigserial    primary key,
  content     text         not null,
  embedding   vector(1536),              -- text-embedding-3-small 出力次元
  source_file text         not null,     -- 元ファイル名 (例: "handbook.pdf")
  page_number integer,                   -- null許容: Markdown/txt等に対応
  metadata    jsonb        default '{}', -- 拡張用: department, tags, etc.
  created_at  timestamptz  default now()
);

-- 3. HNSWベクトルインデックス
--    - IVFFlatと違い事前のlists設定が不要で小規模から大規模まで対応
--    - m=16, ef_construction=64 はpgvectorのデフォルト推奨値
--    - 200本PDF規模でも再作成なしで使用可能
create index documents_embedding_hnsw_idx
  on documents
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. source_fileによる絞り込みクエリ用インデックス
create index documents_source_file_idx
  on documents (source_file);

-- 5. match_documents RPC関数
--    cosine similarityで類似文書を検索する
--    similarity = 1 - cosine_distance (1に近いほど類似)
create or replace function match_documents(
  query_embedding  vector(1536),
  match_threshold  float,
  match_count      int
)
returns table (
  id          bigint,
  content     text,
  source_file text,
  page_number integer,
  metadata    jsonb,
  similarity  float
)
language sql stable
as $$
  select
    id,
    content,
    source_file,
    page_number,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
