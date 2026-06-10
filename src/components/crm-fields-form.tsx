"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import type { Lead } from "@/lib/repositories/types";

export function CrmFieldsForm({ lead }: { lead: Lead }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">CRM fields</h2>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={saving}
        >
          <Save size={15} />
          {saving ? "Saving" : "Save"}
        </button>
      </div>

      <div className="grid gap-3">
        <Field label="Email status" name="emailStatus" defaultValue={lead.emailStatus} />
        <Field label="Email outcome" name="emailOutcome" defaultValue={lead.emailOutcome} />
        <Field label="Overall stage" name="overallStage" defaultValue={lead.overallStage} />
        <Field label="Priority" name="priority" defaultValue={lead.priority} />
        <Field label="Next action" name="nextAction" defaultValue={lead.nextAction} />
        <Field label="Next action date" name="nextActionDate" defaultValue={lead.nextActionDate} />
        <label className="grid gap-1">
          <span className="text-xs font-medium text-slate-500">Interest signal</span>
          <select
            name="interestSignal"
            defaultValue={lead.interestSignal}
            className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
          >
            <option>Hot</option>
            <option>Warm</option>
            <option>Neutral</option>
            <option>Not Interested</option>
            <option>OOO</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-slate-500">Email notes</span>
          <textarea
            name="emailNotes"
            defaultValue={lead.emailNotes}
            rows={5}
            className="resize-y rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </label>
      </div>
      {saved ? <p className="mt-3 text-sm text-emerald-700">Saved to repository.</p> : null}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}

