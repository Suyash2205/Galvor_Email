import { NextResponse } from "next/server";
import { syncSheetsToDashboard } from "@/lib/sync/engine";
import { env } from "@/lib/system/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (env.cronSecret && searchParams.get("secret") !== env.cronSecret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json(await syncSheetsToDashboard());
}

