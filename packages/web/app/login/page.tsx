import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "@/components/LoginButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // If already authenticated, redirect to propose
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email === process.env.ALLOWED_EMAIL) {
    redirect("/propose");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">Propose Times</h1>
      {params.error === "unauthorized" && (
        <p className="text-sm text-red-400">Access denied. Not an authorized account.</p>
      )}
      {params.error === "auth" && (
        <p className="text-sm text-red-400">Authentication failed. Please try again.</p>
      )}
      <LoginButton />
    </div>
  );
}
