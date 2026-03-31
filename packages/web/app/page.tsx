import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();

  if (!session) {
    redirect("/login");
  }

  if (session.user.email?.toLowerCase() !== allowedEmail) {
    redirect("/login?error=unauthorized");
  }

  redirect("/propose");
}
