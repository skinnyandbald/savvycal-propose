import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { LoginButton } from "@/components/LoginButton";
import { SignOutButton } from "@/components/SignOutButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const params = await searchParams;

  // Don't redirect authenticated users away from login if they have an error
  // (e.g. unauthorized account needs to sign out and try a different account)
  if (session && !params.error) {
    redirect("/propose");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">Propose Times</h1>
      {params.error === "unauthorized" && (
        <>
          <p className="text-sm text-red-400">Access denied. Not an authorized account.</p>
          <SignOutButton />
        </>
      )}
      {params.error === "auth" && (
        <p className="text-sm text-red-400">Authentication failed. Please try again.</p>
      )}
      <LoginButton />
    </div>
  );
}
