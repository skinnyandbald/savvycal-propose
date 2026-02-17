import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/propose";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Verify email is allowed
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const allowedEmail = process.env.ALLOWED_EMAIL;

      if (user?.email === allowedEmail) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Not allowed — sign out and redirect to login with error
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}/login?error=unauthorized`,
      );
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
