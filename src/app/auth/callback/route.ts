import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/env";
import { safeReturnPath } from "@/lib/auth/return-path";

export async function GET(request: NextRequest) {
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const origin = appOrigin();
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    try {
      const client = await createClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin), { headers: { "Cache-Control": "private, no-store" } });
    } catch { /* Show a recoverable error without exposing auth links or service details. */ }
  }
  const failure = new URL("/login", origin);
  failure.searchParams.set("error", "callback");
  failure.searchParams.set("next", next);
  return NextResponse.redirect(failure, { headers: { "Cache-Control": "private, no-store" } });
}
