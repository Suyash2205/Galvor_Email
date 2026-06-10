import type { InterestSignal } from "@/lib/repositories/types";

const styles: Record<InterestSignal, string> = {
  Hot: "border-rose-200 bg-rose-50 text-rose-700",
  Warm: "border-amber-200 bg-amber-50 text-amber-700",
  Neutral: "border-slate-200 bg-slate-50 text-slate-600",
  "Not Interested": "border-zinc-200 bg-zinc-100 text-zinc-700",
  OOO: "border-sky-200 bg-sky-50 text-sky-700",
};

export function StatusPill({ value }: { value: InterestSignal }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs ${styles[value]}`}>
      {value}
    </span>
  );
}

