# company-docs-rag

社内文書を対象とした RAG（Retrieval-Augmented Generation）システムです。
PDF 文書をベクトル化して Supabase (pgvector) へ保存し、自然言語で質問すると関連文書を検索して Claude が回答を生成します。

## 機能

- PDF 文書の取り込み・チャンキング・ベクトル化
- OpenAI Embedding による類似検索（pgvector）
- Claude による回答生成（出典ファイル名・ページ番号付き）
- Supabase Auth によるログイン認証（メール/パスワード）
- 未認証リクエストの API 保護（401 返却）
- メールドメイン制限（環境変数で制御）
- 会話履歴の保存・表示（最新 10 件）
- 回答時間の表示

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) + TypeScript |
| スタイリング | Tailwind CSS |
| データベース | Supabase (PostgreSQL + pgvector) |
| 認証 | Supabase Auth + @supabase/ssr |
| Embedding 生成 | OpenAI `text-embedding-3-small` (1536 次元) |
| 回答生成 | Anthropic Claude (`claude-opus-4-8`) |

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

| 変数名 | 説明 | 取得先 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | Dashboard > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開キー | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー（サーバー専用） | 同上 |
| `OPENAI_API_KEY` | OpenAI API キー | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | Anthropic API キー | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| `ALLOWED_EMAIL_DOMAIN` | 許可するメールドメイン（例: `example.com`）。未設定で制限なし | — |

### 3. Supabase のスキーマを適用

Supabase Dashboard の SQL Editor で以下を順に実行します。

```
supabase/migrations/20260604000001_init_documents.sql
supabase/migrations/20260615000001_init_conversations.sql
```

### 4. Supabase Auth でユーザーを作成

Supabase Dashboard > Authentication > Users からログインユーザーを手動で作成します。
ユーザー登録フォームは未実装のため、Dashboard での事前作成が必要です。

### 5. 文書をインジェスト

PDF ファイルを `docs/pdf/` に配置してから実行します。

```bash
npm run ingest:pdf
```

### 6. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開くとログイン画面が表示されます。

## プロジェクト構成

```
company-docs-rag/
├── supabase/
│   └── migrations/
│       ├── 20260604000001_init_documents.sql     # documents テーブル + pgvector
│       └── 20260615000001_init_conversations.sql  # conversations テーブル
├── docs/
│   ├── pdf/                     # インジェスト対象 PDF
│   └── test/                    # 評価用テスト質問
├── src/
│   ├── middleware.ts             # セッション検証・未認証リダイレクト・API 401
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # 質問 UI + 会話履歴表示（Client Component）
│   │   ├── login/
│   │   │   └── page.tsx         # ログイン画面
│   │   └── api/
│   │       ├── ask/
│   │       │   └── route.ts     # RAG API (POST /api/ask) + 履歴保存
│   │       └── conversations/
│   │           └── route.ts     # 会話履歴取得 (GET /api/conversations)
│   ├── lib/
│   │   ├── env.ts               # 環境変数バリデーション
│   │   └── supabase.ts          # Supabase クライアント + Database 型定義
│   ├── ingest/
│   │   ├── chunker.ts           # テキスト分割（1500 字・200 字オーバーラップ）
│   │   ├── embed.ts             # OpenAI Embedding 生成
│   │   ├── parsePdf.ts          # PDF パーサー（pdf-parse）
│   │   ├── ingestText.ts        # Markdown インジェスト
│   │   └── ingestPdf.ts         # PDF インジェスト
│   ├── retrieval/
│   │   └── search.ts            # pgvector 類似検索（match_documents RPC）
│   └── generation/
│       └── answer.ts            # Claude による回答生成
├── scripts/
│   ├── testSearch.ts            # 検索動作確認
│   ├── testAnswer.ts            # 回答生成動作確認
│   └── evaluateRag.ts           # RAG 評価スクリプト（12 問）
└── .env.example                 # 環境変数テンプレート
```

## npm スクリプト

```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run type-check   # TypeScript 型チェック
npm run ingest       # Markdown インジェスト
npm run ingest:pdf   # PDF インジェスト
npm run eval:yes     # RAG 評価（12 問・API コストあり）
```

## 評価結果

```bash
npm run eval:yes
```

12 問 / 12 問正解（該当あり 8 問・該当なし 4 問）

## 認証フロー

```
ブラウザ → /
  └─ middleware: Cookie にセッションなし
       └─ /login にリダイレクト

/login でログイン
  └─ Supabase Auth で認証
       └─ / へ遷移

POST /api/ask
  └─ Cookie から JWT を検証
       ├─ 未認証 → 401
       ├─ ドメイン制限違反 → 401
       └─ OK → RAG 処理 → 会話履歴保存 → レスポンス
```

## 今後の改善案

- 出典クリックによる PDF 該当ページ表示
- 会話履歴の検索機能
- 管理者向け文書アップロード画面
- 部署別アクセス制御（RLS + metadata.department）
