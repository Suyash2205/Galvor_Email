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
  const { leads, error } = await loadLeads(session.email, params);

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
      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}
      <LeadInbox
        leads={leads}
        search={params.search}
        stage={params.stage}
        interest={params.interest}
      />
    </AppShell>
  );
}

async function loadLeads(
  connectedInbox: string,
  params: { search?: string; stage?: string; interest?: string },
) {
  try {
    const leads = await getLeadRepository().getLeads({
      connectedInbox,
      search: params.search,
      stage: params.stage,
      interestSignal: parseInterest(params.interest),
    });
    return { leads, error: "" };
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("Quota exceeded")
        ? "Google Sheets is temporarily rate-limiting reads. Wait a minute and refresh."
        : "Could not load leads from Google Sheets right now.";
    return { leads: [], error: message };
  }
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
