"use client";

import { RefreshCcw } from "lucide-react";
import { useState } from "react";

export function GmailSyncButton() {
  const [status, setStatus] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  async function syncNow() {
    setSyncing(true);
    setStatus("");
    const response = await fetch("/api/gmail/sync", { method: "POST" });
    const data = (await response.json()) as {
      status?: string;
      error?: string;
      scannedThreads?: number;
      leadThreads?: number;
      upsertedMessages?: number;
    };
    setStatus(
      data.status === "ok"
        ? `Scanned ${data.scannedThreads ?? 0}, imported ${data.leadThreads ?? 0} leads, wrote ${
            data.upsertedMessages ?? 0
          } messages.`
        : data.error || "Sync did not complete.",
    );
    setSyncing(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={syncNow}
        disabled={syncing}
        className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
        title="Sync now"
      >
        <RefreshCcw size={15} className={syncing ? "animate-spin" : ""} />
      </button>
      {status ? <p className="text-xs text-slate-500">{status}</p> : null}
    </div>
  );
}
