"use client";

import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="rounded-lg bg-white px-6 py-3 text-base font-medium text-zinc-900 shadow-sm active:bg-zinc-100"
    >
      Sign in with Google
    </button>
  );
}
