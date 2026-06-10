import { Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasGoogleOAuthConfig } from "@/lib/system/env";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/leads");

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-slate-950 text-white">
            <Inbox size={19} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-950">Galvor Email Leads</h1>
            <p className="text-sm text-slate-500">Sign in with your Galvor email.</p>
          </div>
        </div>

        {hasGoogleOAuthConfig() ? (
          <a
            href="/api/auth/google"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign in with Google
          </a>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Add Google OAuth credentials to `.env.local` to enable email sign-in.
          </div>
        )}
      </section>
    </main>
  );
}
