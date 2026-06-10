import { Database, KeyRound, MailCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GmailSyncButton } from "@/components/gmail-sync-button";
import { getSession } from "@/lib/auth/session";
import { getLeadRepository } from "@/lib/repositories";
import { env, hasGoogleOAuthConfig, hasSheetsConfig } from "@/lib/system/env";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const syncState = await getLeadRepository()
    .getSyncState(session.email)
    .catch(() => null);

  return (
    <AppShell session={session}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Connect only your own Gmail inbox and monitor sheet sync status.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <MailCheck className="size-4 text-slate-500" />
            <h2 className="text-sm font-semibold">Gmail inbox</h2>
          </div>
          <p className="text-sm text-slate-600">{session.email}</p>
          <p className="mt-2 text-xs text-slate-500">
            Last sync: {syncState?.lastSyncedAt ?? "Not synced yet"}
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href="/api/gmail/connect"
              className="inline-flex h-9 items-center rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Connect
            </a>
            <GmailSyncButton />
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Database className="size-4 text-slate-500" />
            <h2 className="text-sm font-semibold">Google Sheets</h2>
          </div>
          <p className="text-sm text-slate-600">
            {hasSheetsConfig() ? "Configured" : "Using demo repository until env vars are set"}
          </p>
          <a
            href={`https://docs.google.com/spreadsheets/d/${env.googleSheetsSpreadsheetId ?? ""}/edit`}
            className="mt-4 inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            Open spreadsheet
          </a>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="size-4 text-slate-500" />
            <h2 className="text-sm font-semibold">Configuration</h2>
          </div>
          <Status label="Google OAuth" ok={hasGoogleOAuthConfig()} />
          <Status label="Gemini API" ok={Boolean(env.geminiApiKey)} />
          <Status label="Token encryption" ok={Boolean(env.tokenEncryptionKey)} />
        </section>
      </div>
    </AppShell>
  );
}

function Status({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`rounded-md px-2 py-1 text-xs ${
          ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {ok ? "Ready" : "Missing"}
      </span>
    </div>
  );
}
