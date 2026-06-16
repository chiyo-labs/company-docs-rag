# 納品物チェックリスト — Company Docs RAG

作成日: 2026-06-16

---

## プロジェクト概要

社内文書（PDF）を対象とした RAG（Retrieval-Augmented Generation）システム。
自然言語で質問すると、関連文書をベクトル検索して Claude が回答を生成する。
Supabase Auth による認証・API 保護を備えた社内利用想定のシステム。

---

## リンク

| 項目 | URL |
|---|---|
| GitHub リポジトリ | https://github.com/chiyo-labs/company-docs-rag |
| Vercel 本番 URL | https://company-docs-rag.vercel.app|
| Supabase Dashboard | https://supabase.com/dashboard |

---

## 実装済み機能一覧

### 文書取り込みパイプライン

| 機能 | 状態 | 備考 |
|---|---|---|
| PDF 取り込み | ✅ 完了 | `docs/pdf/` 以下の PDF を一括取り込み |
| チャンキング処理 | ✅ 完了 | 1500 字・200 字オーバーラップ |
| OpenAI Embedding | ✅ 完了 | `text-embedding-3-small`（1536 次元）|
| pgvector 保存 | ✅ 完了 | Supabase `documents` テーブル、HNSW インデックス |

### RAG コア

| 機能 | 状態 | 備考 |
|---|---|---|
| ベクトル検索 | ✅ 完了 | cosine similarity、`match_documents` RPC |
| Claude 回答生成 | ✅ 完了 | `claude-opus-4-8`、該当なし判定あり |
| 出典表示 | ✅ 完了 | ファイル名（日本語）+ ページ番号 |
| 回答時間表示 | ✅ 完了 | 検索 + 生成の合計時間を UI に表示 |

### 認証・セキュリティ

| 機能 | 状態 | 備考 |
|---|---|---|
| Supabase Auth ログイン | ✅ 完了 | メール/パスワード認証 |
| API 保護 | ✅ 完了 | 未認証リクエストに 401 を返却 |
| ドメイン制限 | ✅ 完了 | `ALLOWED_EMAIL_DOMAIN` 環境変数で制御 |
| middleware ルート保護 | ✅ 完了 | 未認証 → `/login` リダイレクト |

### 履歴・デプロイ

| 機能 | 状態 | 備考 |
|---|---|---|
| 会話履歴保存 | ✅ 完了 | `conversations` テーブル、user_id 紐付け |
| 会話履歴表示 | ✅ 完了 | 最新 10 件を UI に表示 |
| Vercel 本番デプロイ | ✅ 完了 | GitHub 連携による自動デプロイ |

### 未実装

| 機能 | 状態 | 備考 |
|---|---|---|
| 新規登録フォーム | — 非実装 | 管理者が Supabase Dashboard でユーザーを手動作成 |
| 出典クリック PDF 表示 | 🔲 今後の改善 | Supabase Storage 連携が必要 |

---

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) + TypeScript |
| スタイリング | Tailwind CSS |
| データベース | Supabase (PostgreSQL + pgvector) |
| 認証 | Supabase Auth + @supabase/ssr |
| Embedding | OpenAI `text-embedding-3-small` |
| 回答生成 | Anthropic Claude `claude-opus-4-8` |
| ホスティング | Vercel |

---

## 動作確認項目

### 認証フロー

- [ ] 本番 URL にアクセスすると `/login` にリダイレクトされる
- [ ] 正しい認証情報でログインできる
- [ ] 誤ったパスワードでエラーメッセージが表示される
- [ ] ログアウト後に `/login` にリダイレクトされる

### RAG 機能

- [ ] 質問を入力して送信できる
- [ ] 回答が生成される（10〜30 秒程度）
- [ ] 回答に出典ファイル名とページ番号が表示される
- [ ] 回答時間が表示される
- [ ] 関連文書がない質問で「該当する情報が見つかりません」と回答される

### 会話履歴

- [ ] 質問後に履歴セクションが表示される
- [ ] ページリロード後も履歴が保持されている
- [ ] 別のアカウントでログインしても他ユーザーの履歴が見えない

### API 保護

- [ ] Cookie なしで `POST /api/ask` を叩くと 401 が返る
- [ ] Cookie なしで `GET /api/conversations` を叩くと 401 が返る

---

## セキュリティ確認項目

- [ ] `.env.local` が `.gitignore` に含まれており GitHub に公開されていない
- [ ] Vercel の機密キー（`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`）が Sensitive 設定になっている
- [ ] `SUPABASE_SERVICE_ROLE_KEY` がブラウザバンドルに含まれていない（`NEXT_PUBLIC_` プレフィックスなし）
- [ ] API ルートで `getUser()` による JWT サーバー検証を実施している
- [ ] `conversations` の SELECT が `user_id = user.id` で明示フィルタリングされている
- [ ] Supabase Auth の Site URL / Redirect URLs に本番ドメインのみ登録されている

---

## 未実装・今後の改善項目

| 項目 | 優先度 | 概要 |
|---|---|---|
| 出典クリックで PDF 表示 | 高 | Supabase Storage に PDF を配置し、ページ番号付き URL で表示 |
| 会話履歴の検索 | 中 | キーワードで過去の質問を検索する機能 |
| 管理者向けアップロード UI | 中 | Web 画面から PDF をアップロード・インジェストできる機能 |
| 部署別アクセス制御 | 低 | RLS + `metadata.department` によるドキュメント閲覧制限 |
| 新規ユーザー登録フォーム | 低 | 現状は Supabase Dashboard で手動作成 |

---

## 評価結果

```
npm run eval:yes
```

12 問 / 12 問正解（該当あり 8 問・該当なし 4 問）

---

*最終更新: 2026-06-16*
