import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginButton } from "@/components/LoginButton";
import { SignOutButton } from "@/components/SignOutButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();

  // Redirect authorized users away from login
  if (session?.user.email?.toLowerCase() === allowedEmail) {
    redirect("/propose");
  }

  const params = await searchParams;

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
