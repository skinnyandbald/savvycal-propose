"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-zinc-500 active:text-zinc-300"
    >
      Sign out
    </button>
  );
}
