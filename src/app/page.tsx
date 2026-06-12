"use client";

import { useState } from "react";

type Source = {
  source_file: string;
  page_number: number | null;
};

type AnswerResult = {
  answer: string;
  sources: Source[];
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
    } catch {
      setErrorMsg("ネットワークエラーが発生しました");
      setStatus("error");
    }
  }

  const displayedSources = result?.sources.slice(0, 3) ?? [];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">Company Docs RAG</h1>
        <p className="mt-1 text-sm text-gray-500">社内文書に質問できます</p>

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
      </div>
    </main>
  );
}
