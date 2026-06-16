"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Source = {
  source_file: string;
  page_number: number | null;
};

type AnswerResult = {
  answer: string;
  sources: Source[];
  elapsedMs: number;
};

type Conversation = {
  id: number;
  query: string;
  answer: string;
  sources: Source[];
  elapsed_ms: number | null;
  created_at: string;
};

type Status = "idle" | "loading" | "done" | "error";

const FILE_LABELS: Record<string, string> = {
  "case3-doc1-employment-rules (1).pdf": "就業規則",
  "case3-doc2-expense-manual.pdf": "経費精算マニュアル",
  "case3-doc3-security-policy.pdf": "情報セキュリティ規程",
  "case3-doc4-remote-work.pdf": "リモートワーク規程",
  "case3-doc5-it-onboarding.pdf": "社内ITツール申請ガイド",
};

function getFileLabel(sourceFile: string): string {
  const filename = sourceFile.split(/[\\/]/).pop() ?? sourceFile;
  return FILE_LABELS[filename] ?? filename;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<Conversation[]>([]);
  const router = useRouter();

  async function loadHistory() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setHistory(data as Conversation[]);
      }
    } catch {
      // 履歴取得失敗はサイレントに無視
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadHistory(); }, []);

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "エラーが発生しました");
        setStatus("error");
        return;
      }

      setResult(data as AnswerResult);
      setStatus("done");
      await loadHistory();
    } catch {
      setErrorMsg("ネットワークエラーが発生しました");
      setStatus("error");
    }
  }

  const displayedSources = result?.sources.slice(0, 3) ?? [];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Company Docs RAG
            </h1>
            <p className="mt-1 text-sm text-gray-500">社内文書に質問できます</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            ログアウト
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="質問を入力してください..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={status === "loading" || !query.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" && (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {status === "loading" ? "回答生成中..." : "質問する"}
            </button>
          </div>
        </form>

        {status === "error" && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {status === "done" && result && (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                回答
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {result.answer}
              </p>
              <p className="mt-3 text-right text-xs text-gray-400">
                回答時間: {(result.elapsedMs / 1000).toFixed(1)}秒
              </p>
            </div>

            {displayedSources.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  出典
                </p>
                <div className="flex flex-wrap gap-2">
                  {displayedSources.map((src, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      📄 {getFileLabel(src.source_file)}
                      {src.page_number != null && (
                        <span className="text-blue-400">p.{src.page_number}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-10">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              過去の質問履歴（最新 {history.length} 件）
            </p>
            <div className="space-y-3">
              {history.map((conv) => (
                <div
                  key={conv.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium text-gray-700">
                      {conv.query}
                    </p>
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(conv.created_at).toLocaleString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {conv.answer}
                  </p>
                  {conv.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {conv.sources.slice(0, 3).map((src, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                        >
                          {getFileLabel(src.source_file)}
                          {src.page_number != null && (
                            <span className="ml-1 text-gray-400">
                              p.{src.page_number}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
