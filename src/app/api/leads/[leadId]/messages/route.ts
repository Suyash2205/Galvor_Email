import { NextResponse } from "next/server";
import { getAuthorizedSession } from "@/lib/auth/session";
import { getLeadRepository } from "@/lib/repositories";

interface RouteContext {
  params: Promise<{ leadId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await getAuthorizedSession();
  if (!auth.session) return new NextResponse("Unauthorized", { status: auth.status });
  const session = auth.session;
  const { leadId } = await context.params;
  const messages = await getLeadRepository().getThreadMessages(leadId, session.email);
  return NextResponse.json({ messages });
}
