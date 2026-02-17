"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      return;
    }
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
