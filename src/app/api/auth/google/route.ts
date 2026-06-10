import { NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/gmail/client";
import { hasGoogleOAuthConfig } from "@/lib/system/env";

export async function GET() {
  if (!hasGoogleOAuthConfig()) {
    return new NextResponse("Google OAuth is not configured.", { status: 501 });
  }

  const client = getGoogleOAuthClient("/api/auth/google/callback");
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "email", "profile"],
  });
  return NextResponse.redirect(url);
}

