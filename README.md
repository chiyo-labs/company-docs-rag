# company-docs-rag

社内ドキュメントを対象にした RAG (Retrieval-Augmented Generation) システム。
PDF・Markdown などの文書を Supabase + pgvector に格納し、Claude で回答生成する。

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) |
| データベース | Supabase (PostgreSQL + pgvector) |
| Embedding 生成 | OpenAI `text-embedding-3-small` (1536次元) |
| 回答生成 | Anthropic Claude (claude-opus-4-8) |

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <repo-url>
cd company-docs-rag
npm install
```

### 2. 環境変数を設定

```bash
cp .env.example .env.local
# .env.local を開いて各 API キーを記入
```

各キーの取得先:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
  → [Supabase Dashboard](https://supabase.com/dashboard) > Project Settings > API
- `OPENAI_API_KEY`
  → [OpenAI Platform](https://platform.openai.com/api-keys)
- `ANTHROPIC_API_KEY`
  → [Anthropic Console](https://console.anthropic.com/settings/keys)

### 3. Supabase のスキーマを適用

Supabase Dashboard の SQL Editor を開き、以下のファイルを実行する:

```
supabase/migrations/20260604000001_init_documents.sql
```

### 4. 文書をインジェスト

```bash
# テキスト / Markdown
npm run ingest

# PDF
npm run ingest:pdf
```

### 5. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開き、質問を入力する。

## プロジェクト構成

```
company-docs-rag/
├── supabase/
│   └── migrations/              # DB スキーマ・マイグレーション
├── docs/
│   ├── pdf/                     # インジェスト対象 PDF（デモ用）
│   └── test/                    # 評価用テスト質問
├── src/
│   ├── app/
│   │   ├── page.tsx             # 質問 UI（Client Component）
│   │   └── api/ask/route.ts     # RAG API エンドポイント (POST /api/ask)
│   ├── lib/
│   │   ├── env.ts               # 環境変数バリデーション
│   │   └── supabase.ts          # Supabase クライアント（browser / server）
│   ├── ingest/
│   │   ├── chunker.ts           # テキスト分割
│   │   ├── embed.ts             # OpenAI Embedding 生成
│   │   ├── ingestText.ts        # Markdown インジェスト
│   │   └── ingestPdf.ts         # PDF インジェスト
│   ├── retrieval/
│   │   └── search.ts            # pgvector 類似検索
│   └── generation/
│       └── answer.ts            # Claude による回答生成
├── scripts/
│   ├── testSearch.ts            # 検索動作確認
│   ├── testAnswer.ts            # 回答生成動作確認
│   └── evaluateRag.ts           # RAG 評価スクリプト（12問）
├── .env.example                 # 環境変数テンプレート
└── .gitignore
```

## 評価

```bash
npm run eval:yes   # 12問を自動評価（API コストが発生します）
```

## 実装フェーズ

- [x] Phase 0: DB スキーマ設計 (pgvector + documents テーブル)
- [x] Phase 0: 環境変数・プロジェクト設定
- [x] Phase 1: 文書インジェストパイプライン (PDF/Markdown → Embedding → Supabase)
- [x] Phase 1: 類似検索 + Claude による回答生成
- [x] Phase 1: Next.js UI (質問入力・回答表示・出典表示)
- [x] Phase 1: RAG 評価スクリプト (12問 / 12問正解)
- [ ] Phase 2: 部署別アクセス制御 (RLS + metadata.department)
