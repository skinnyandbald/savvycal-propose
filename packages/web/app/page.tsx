import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function Home() {
  const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();
  if (!allowedEmail) {
    throw new Error("ALLOWED_EMAIL is not configured");
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  if (session.user.email?.toLowerCase() !== allowedEmail) {
    redirect("/login?error=unauthorized");
  }

  redirect("/propose");
}
