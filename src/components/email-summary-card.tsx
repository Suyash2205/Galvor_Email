import { Sparkles } from "lucide-react";
import { StatusPill } from "./status-pill";
import type { Lead } from "@/lib/repositories/types";

export function EmailSummaryCard({ lead }: { lead: Lead }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Email summary</h2>
        </div>
        <StatusPill value={lead.interestSignal} />
      </div>
      <p className="text-sm leading-6 text-slate-700">
        {lead.emailSummary || "Summary will appear after the next Gmail sync or Gemini pass."}
      </p>
      <div className="mt-4 rounded-md bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next step</p>
        <p className="mt-1 text-sm text-slate-700">
          {lead.suggestedNextStep || "Review the thread and decide the next follow-up."}
        </p>
      </div>
    </section>
  );
}

