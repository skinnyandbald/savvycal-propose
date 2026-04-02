import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { LoginButton } from "@/components/LoginButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
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
