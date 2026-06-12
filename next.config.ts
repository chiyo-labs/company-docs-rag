import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse はインポート時にファイルシステムを参照するため
  // Next.js のバンドル対象から外してNode.jsランタイムで直接実行する
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
