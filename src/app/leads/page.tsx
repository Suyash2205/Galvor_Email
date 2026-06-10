import { AppShell } from "@/components/app-shell";
import { LeadInbox } from "@/components/lead-inbox";
import { getSession } from "@/lib/auth/session";
import { getLeadRepository } from "@/lib/repositories";
import type { InterestSignal } from "@/lib/repositories/types";
import { redirect } from "next/navigation";

interface LeadsPageProps {
  searchParams: Promise<{
    search?: string;
    stage?: string;
    interest?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const session = await getSession();
  if (!session) redirect("/");
  const params = await searchParams;
  const leads = await getLeadRepository().getLeads({
    connectedInbox: session.email,
    search: params.search,
    stage: params.stage,
    interestSignal: parseInterest(params.interest),
  });

  return (
    <AppShell session={session}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Lead inbox</h1>
          <p className="mt-1 text-sm text-slate-600">
            Showing replied Gmail threads scoped to {session.email}.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          {leads.length} lead{leads.length === 1 ? "" : "s"}
        </div>
      </div>
      <LeadInbox
        leads={leads}
        search={params.search}
        stage={params.stage}
        interest={params.interest}
      />
    </AppShell>
  );
}

function parseInterest(value?: string): InterestSignal | undefined {
  if (
    value === "Hot" ||
    value === "Warm" ||
    value === "Neutral" ||
    value === "Not Interested" ||
    value === "OOO"
  ) {
    return value;
  }
  return undefined;
}
