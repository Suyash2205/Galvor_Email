import Link from "next/link";
import { ArrowUpRight, Mail, Search } from "lucide-react";
import { StatusPill } from "./status-pill";
import type { Lead } from "@/lib/repositories/types";

interface LeadInboxProps {
  leads: Lead[];
  search?: string;
  stage?: string;
  interest?: string;
}

export function LeadInbox({ leads, search = "", stage = "", interest = "" }: LeadInboxProps) {
  return (
    <section className="space-y-4">
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_180px_180px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search company, email, subject"
            className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </label>
        <input
          name="stage"
          defaultValue={stage}
          placeholder="Stage"
          className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
        />
        <select
          name="interest"
          defaultValue={interest}
          className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
        >
          <option value="">All interest</option>
          <option>Hot</option>
          <option>Warm</option>
          <option>Neutral</option>
          <option>Not Interested</option>
          <option>OOO</option>
        </select>
        <button className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="grid grid-cols-[1.2fr_1.2fr_1.8fr_110px_120px_44px] border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 max-lg:hidden">
          <span>Company</span>
          <span>Contact</span>
          <span>Latest reply</span>
          <span>Interest</span>
          <span>Stage</span>
          <span />
        </div>
        {leads.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <Mail className="size-9 text-slate-300" />
            <div>
              <p className="text-sm font-medium text-slate-800">No replied threads yet</p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Once Gmail sync finds an external inbound reply for your inbox, it will appear here.
              </p>
            </div>
          </div>
        ) : (
          leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="grid gap-3 border-b border-slate-100 px-4 py-4 hover:bg-slate-50 lg:grid-cols-[1.2fr_1.2fr_1.8fr_110px_120px_44px] lg:items-center"
            >
              <div>
                <p className="font-medium text-slate-950">{lead.company}</p>
                <p className="mt-1 text-xs text-slate-500">{lead.emailSubject || "No subject"}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-700">
                  {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.emailAddress}
                </p>
                <p className="truncate text-xs text-slate-500">{lead.emailAddress}</p>
              </div>
              <p className="line-clamp-2 text-sm text-slate-600">
                {lead.emailSummary || lead.lastReplySnippet || "Summary pending"}
              </p>
              <StatusPill value={lead.interestSignal} />
              <span className="text-sm text-slate-600">{lead.overallStage || "Unstaged"}</span>
              <span className="hidden justify-self-end text-slate-400 lg:inline-flex">
                <ArrowUpRight size={18} />
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

