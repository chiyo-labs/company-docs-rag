import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Docs RAG",
  description: "社内ドキュメント RAG システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
