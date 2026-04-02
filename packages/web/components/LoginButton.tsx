"use client";

import { authClient } from "@/lib/auth-client";

export function LoginButton() {
  const handleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/propose",
      errorCallbackURL: "/login?error=auth",
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
