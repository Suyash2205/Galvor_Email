import { NextResponse } from "next/server";
import { getAuthorizedSession } from "@/lib/auth/session";
import { getGoogleOAuthClient } from "@/lib/gmail/client";
import { hasGoogleOAuthConfig } from "@/lib/system/env";

export async function GET() {
  const auth = await getAuthorizedSession();
  if (!auth.session) return new NextResponse("Unauthorized", { status: auth.status });
  if (!hasGoogleOAuthConfig()) {
    return new NextResponse("Google OAuth is not configured.", { status: 501 });
  }

  const client = getGoogleOAuthClient("/api/gmail/callback");
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
  return NextResponse.redirect(url);
}
