import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { env } from "@/lib/system/env";

export async function POST() {
  const response = NextResponse.redirect(env.appBaseUrl);
  clearSessionCookie(response);
  return response;
}

