import { NextResponse } from "next/server";
import { syncGmailAccount } from "@/lib/sync/engine";
import { env } from "@/lib/system/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (env.cronSecret && searchParams.get("secret") !== env.cronSecret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const accounts = env.allowedEmails;
  const results = await Promise.all(accounts.map((email) => syncGmailAccount(email)));
  return NextResponse.json({ results });
}

