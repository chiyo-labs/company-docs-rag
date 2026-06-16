# 振り返りドキュメント — Company Docs RAG

作成日: 2026-06-16

---

## プロジェクト概要

社内文書（PDF）を対象とした RAG システムを、設計・実装・デプロイまで一気通貫で構築した。
PDF の取り込みからベクトル検索・Claude による回答生成・認証・会話履歴保存・Vercel 本番デプロイまでを一人で完結させた。

| 項目 | 内容 |
|---|---|
| 期間 | 2026-06 |
| 技術領域 | RAG / LLM / Next.js / Supabase / Vercel |
| 評価結果 | 12 / 12 問正解 |
| 本番 URL | https://company-docs-rag.vercel.app/ |

---

## 学んだこと

### RAG パイプラインの全体像を理解できた

PDF 取り込み → チャンキング → OpenAI Embedding → pgvector 保存 → 類似検索 → Claude 回答生成という一連の流れを実装することで、RAG の各ステップがなぜ必要なのかを体感として理解できた。特に「チャンクの粒度が検索精度に直結する」という点は、実際に調整しながら学んだ重要な知見だった。

### RAG は検索精度がすべての起点になると理解できた

どれだけ高品質なプロンプトを書いても、検索で的外れなチャンクが返ってくれば回答精度は上がらない。`matchThreshold` の調整・チャンクサイズの設計・HNSW インデックスの選定など、ベクトル検索の品質が RAG 全体の品質を決めることを理解した。

### Supabase Auth による認証実装を経験できた

`@supabase/ssr` を使った Cookie ベースのセッション管理、middleware によるルート保護、API route での JWT サーバー検証（`getUser()`）を一から実装した。認証を「後から追加する」際の難しさ（既存 RAG 機能を壊さずに組み込む設計）も経験できた。

### Vercel デプロイまで含めて一通りの開発サイクルを経験できた

ローカル開発から本番デプロイまでを完走した。Supabase Auth の Site URL / Redirect URLs を本番ドメインに設定し忘れると認証が壊れるなど、本番環境特有の落とし穴も経験を通じて学んだ。

### 評価テストで 12 / 12 を達成できた

「該当あり」8 問・「該当なし」4 問の計 12 問を自動評価スクリプトで検証し、全問正解を達成した。評価スクリプトを自作することで、RAG の品質をどう定量的に測るかという視点も身についた。

---

## 苦労した点

### 1. similarity スコアの調整

日本語テキストと `text-embedding-3-small` の組み合わせでは、similarity が 0.3〜0.5 程度にしか上がらなかった。最初は `matchThreshold=0.5` にしていたため全件フィルタアウトされ、回答が常に「該当なし」になる問題が発生した。

### 2. ログイン後のリダイレクトループ

Supabase Auth でログイン成功後に `router.refresh()` を呼ぶと、セッション Cookie が middleware に届く前にリクエストが飛んでしまい、`/login` へのリダイレクトループが発生した。ブラウザのネットワークタブとサーバーログを照合して原因を特定するのに時間がかかった。

### 3. `@supabase/ssr` の導入

従来の `@supabase/supabase-js` だけでは Next.js App Router でのセッション管理に限界があり、`@supabase/ssr` への移行が必要だった。クライアント / サーバー / middleware でそれぞれ異なるクライアント生成パターンを理解するのに手間がかかった。

### 4. TypeScript 型定義の整合

Supabase の `Database` 型に `conversations` テーブルを追加する際、`jsonb` 型（`sources` カラム）をどう型付けするかで悩んだ。

---

## 解決方法

| 問題 | 解決策 |
|---|---|
| similarity が低くフィルタされる | `matchThreshold` を 0.5 → 0.3 に調整。日本語+英語混在テキストの特性として許容範囲に設定 |
| ログイン後のリダイレクトループ | `router.refresh() + router.push("/")` を `window.location.href = "/"` に変更。フルリロードでセッション Cookie を確実に伝達 |
| SSR 認証の理解 | `@supabase/ssr` の公式ドキュメントを精読し、middleware / Server Component / Client Component の 3 パターンを整理 |
| jsonb の型付け | `ConversationSource[]` 型を定義して `Database` 型の `sources` カラムに明示的に適用 |

---

## 技術的な成長

| 技術領域 | 習得前 | 習得後 |
|---|---|---|
| RAG パイプライン | 概念のみ知っていた | 設計・実装・評価まで一貫して経験 |
| pgvector | 未経験 | HNSW インデックス・RPC 関数の設計ができる |
| Supabase Auth | 未経験 | middleware・JWT 検証・Cookie セッションを実装できる |
| Next.js App Router | 基礎のみ | Server Component / Client Component の使い分けを理解 |
| Vercel デプロイ | 未経験 | 環境変数設定・本番 Auth 設定を含めて完走できる |

---

## 今後改善したい点

### 短期（次のスプリントで対応できる）

- **出典クリックで PDF 該当ページ表示**: Supabase Storage に PDF を配置し、`#page=N` 付き URL で表示する。ユーザー体験を大きく向上させる最優先改善。
- **会話履歴の検索機能**: キーワードで過去の質問を絞り込める機能。履歴が蓄積するほど価値が上がる。

### 中期

- **管理者向けアップロード UI**: 現状はインジェストが CLI 操作のため、Web 画面から PDF をアップロード・インジェストできると運用負荷が下がる。
- **エラーモニタリング**: Sentry 等を導入して本番エラーを可視化する。

### 長期

- **部署別アクセス制御**: `metadata.department` + RLS により、閲覧できる文書を部署単位で制限する。
- **ストリーミングレスポンス**: 現状は回答完成まで待つ実装。Server-Sent Events でトークンを逐次表示すれば体感速度が改善する。

---

## 次の RAG 案件に活かせること

### 設計フェーズ

- チャンクサイズは「1 質問で参照するテキスト量」を基準に決める。大きすぎると関係ない情報が混入し、小さすぎると文脈が欠落する。
- 評価スクリプトは実装初期から用意する。精度の変化を定量的に追えないと、チューニングが勘頼りになる。

### 実装フェーズ

- Supabase Auth は `@supabase/ssr` 一択。`@supabase/auth-helpers-nextjs` は deprecated のため使用しない。
- API ルートの認証チェックは `getUser()`（サーバー検証）を使う。`getSession()`（ローカル読み取り）はセキュリティ上不十分。
- ログイン後リダイレクトは `window.location.href` でフルリロードする。`router.push()` だと Cookie 伝播のタイミング問題が起きやすい。

### デプロイフェーズ

- Vercel デプロイ後は必ず Supabase Auth の Redirect URLs に本番ドメインを追加する（忘れると認証が壊れる）。
- 機密キーは Vercel の Sensitive 設定を使う。誤って NEXT_PUBLIC_ プレフィックスをつけると、ブラウザに漏洩する。

---

*最終更新: 2026-06-16*
