import { NextResponse } from "next/server";
import { getAuthorizedSession } from "@/lib/auth/session";
import { getLeadRepository } from "@/lib/repositories";
import type { InterestSignal } from "@/lib/repositories/types";

export async function GET(request: Request) {
  const auth = await getAuthorizedSession();
  if (!auth.session) return new NextResponse("Unauthorized", { status: auth.status });
  const session = auth.session;
  const { searchParams } = new URL(request.url);
  const repository = getLeadRepository();
  const leads = await repository.getLeads({
    connectedInbox: session.email,
    search: searchParams.get("search") ?? undefined,
    stage: searchParams.get("stage") ?? undefined,
    interestSignal: parseInterest(searchParams.get("interest")),
  });

  return NextResponse.json({ leads });
}

function parseInterest(value: string | null): InterestSignal | undefined {
  if (
    value === "Hot" ||
    value === "Warm" ||
    value === "Neutral" ||
    value === "Not Interested" ||
    value === "OOO"
  ) {
    return value;
  }
  return undefined;
}
