import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerClient } from "../../../lib/supabase";
import { ALLOWED_EMAIL_DOMAIN } from "../../../lib/env";

export async function GET() {
  try {
    // --- 認証チェック ---
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Route Handler では cookies() が read-only になる場合がある
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (
      ALLOWED_EMAIL_DOMAIN &&
      !user.email?.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
    ) {
      return NextResponse.json(
        { error: "このドメインのアカウントはアクセスできません" },
        { status: 401 }
      );
    }

    // --- 履歴取得（service role key + user_id で明示フィルタ）---
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("id, query, answer, sources, elapsed_ms, created_at")
      .eq("user_id", user.id)          // 他ユーザーの履歴は取得不可
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
