import Link from "next/link";
import { Inbox, Settings } from "lucide-react";
import type { AppSession } from "@/lib/auth/session";

interface AppShellProps {
  children: React.ReactNode;
  session: AppSession;
}

export function AppShell({ children, session }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/leads" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-slate-950 text-sm font-semibold text-white">
              G
            </span>
            <span>
              <span className="block text-sm font-semibold leading-4">Galvor</span>
              <span className="block text-xs text-slate-500">Email leads</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/leads"
              className="inline-flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              title="Lead inbox"
            >
              <Inbox size={18} />
            </Link>
            <Link
              href="/settings"
              className="inline-flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              title="Settings"
            >
              <Settings size={18} />
            </Link>
            <span className="ml-3 hidden max-w-[240px] truncate text-sm text-slate-600 sm:inline">
              {session.email}
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

