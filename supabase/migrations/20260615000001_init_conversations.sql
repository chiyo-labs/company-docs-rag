-- ============================================================
-- Migration: init_conversations
-- ユーザーごとの質問・回答履歴テーブル
-- ============================================================

create table conversations (
  id          bigserial    primary key,
  user_id     uuid         not null references auth.users(id) on delete cascade,
  query       text         not null,
  answer      text         not null,
  sources     jsonb        not null default '[]',
  elapsed_ms  integer,
  created_at  timestamptz  not null default now()
);

-- user_id + 新しい順での絞り込みクエリ用インデックス
create index conversations_user_id_created_at_idx
  on conversations (user_id, created_at desc);
