import { NextResponse } from "next/server";
import { getAuthorizedSession } from "@/lib/auth/session";
import { syncGmailAccount } from "@/lib/sync/engine";

export async function POST() {
  const auth = await getAuthorizedSession();
  if (!auth.session) return new NextResponse("Unauthorized", { status: auth.status });
  const session = auth.session;
  return NextResponse.json(await syncGmailAccount(session.email));
}
