import type { EmailMessage } from "@/lib/repositories/types";

export function ThreadTimeline({ messages }: { messages: EmailMessage[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Thread timeline</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {messages.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No message rows are stored for this lead yet.</p>
        ) : (
          messages.map((message) => (
            <article key={message.gmailMessageId} className="p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    message.direction === "inbound"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {message.direction}
                </span>
                <time className="text-xs text-slate-500">{formatDate(message.date)}</time>
              </div>
              <p className="text-sm font-medium text-slate-900">{message.subject}</p>
              <p className="mt-1 text-xs text-slate-500">
                {message.from} to {message.to}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {message.bodyText || message.snippet}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

