import { google } from "googleapis";
import { NextResponse } from "next/server";
import { isAllowedEmail, setSessionCookie } from "@/lib/auth/session";
import { getGoogleOAuthClient } from "@/lib/gmail/client";
import { env } from "@/lib/system/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return new NextResponse("Missing OAuth code.", { status: 400 });

  const client = getGoogleOAuthClient("/api/auth/google/callback");
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email;
  if (!email) return new NextResponse("Google profile did not include an email.", { status: 400 });
  if (!isAllowedEmail(email)) return new NextResponse("Forbidden", { status: 403 });

  const response = NextResponse.redirect(`${env.appBaseUrl}/leads`);
  setSessionCookie(response, {
    email,
    name: profile.data.name ?? undefined,
    picture: profile.data.picture ?? undefined,
  });
  return response;
}
