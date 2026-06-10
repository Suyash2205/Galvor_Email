import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CrmFieldsForm } from "@/components/crm-fields-form";
import { EmailSummaryCard } from "@/components/email-summary-card";
import { ThreadTimeline } from "@/components/thread-timeline";
import { getSession } from "@/lib/auth/session";
import { getLeadRepository } from "@/lib/repositories";

interface LeadDetailPageProps {
  params: Promise<{ leadId: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const session = await getSession();
  if (!session) redirect("/");
  const { leadId } = await params;
  const repository = getLeadRepository();
  const lead = await repository.getLeadById(leadId, session.email);
  if (!lead) notFound();
  const messages = await repository.getThreadMessages(leadId, session.email);

  return (
    <AppShell session={session}>
      <div className="mb-5">
        <Link
          href="/leads"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Back to inbox
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
              {lead.company}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {lead.emailAddress} · {lead.emailSubject || "No subject"}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            {lead.threadMessageCount} messages
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <EmailSummaryCard lead={lead} />
          <CrmFieldsForm lead={lead} />
        </div>
        <ThreadTimeline messages={messages} />
      </div>
    </AppShell>
  );
}
