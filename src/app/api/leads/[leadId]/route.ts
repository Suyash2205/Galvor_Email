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
  const lead = await getLeadRepository().getLeadById(leadId, session.email);
  if (!lead) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await getAuthorizedSession();
  if (!auth.session) return new NextResponse("Unauthorized", { status: auth.status });
  const session = auth.session;
  const { leadId } = await context.params;
  const lead = await getLeadRepository().updateLead(leadId, session.email, await request.json());
  if (!lead) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ lead });
}
