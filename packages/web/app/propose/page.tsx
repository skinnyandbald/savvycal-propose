import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProposalForm } from "@/components/ProposalForm";

function parseSlugs(raw: string): string[] {
  return [...new Set(
    raw.split(",").map((s) => s.trim()).filter(Boolean),
  )];
}

export default async function ProposePage() {
  // Verify auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ALLOWED_EMAIL) {
    redirect("/login");
  }

  // Read link slugs from env
  const linkSlugs = parseSlugs(process.env.SAVVYCAL_LINK_SLUGS || "");

  if (linkSlugs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 pt-12">
        <h1 className="text-xl font-bold">Propose Times</h1>
        <p className="text-sm text-zinc-400">
          No scheduling links configured. Set SAVVYCAL_LINK_SLUGS env var.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Propose Times</h1>
      <ProposalForm linkSlugs={linkSlugs} />
    </div>
  );
}
