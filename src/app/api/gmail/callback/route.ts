import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAuthorizedSession } from "@/lib/auth/session";
import { encryptToken } from "@/lib/crypto/tokens";
import { getGoogleOAuthClient } from "@/lib/gmail/client";
import { getLeadRepository } from "@/lib/repositories";
import { env } from "@/lib/system/env";

export async function GET(request: Request) {
  const auth = await getAuthorizedSession();
  if (!auth.session) return new NextResponse("Unauthorized", { status: auth.status });
  const session = auth.session;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return new NextResponse("Missing OAuth code.", { status: 400 });

  const client = getGoogleOAuthClient("/api/gmail/callback");
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email;
  if (!email || email.toLowerCase() !== session.email.toLowerCase()) {
    return new NextResponse("You can only connect your own Gmail inbox.", { status: 403 });
  }
  if (!tokens.refresh_token) {
    return new NextResponse("Google did not return a refresh token. Reconnect with consent.", {
      status: 400,
    });
  }

  await getLeadRepository().setSyncState({
    gmailAccount: email,
    refreshTokenEncrypted: encryptToken(tokens.refresh_token),
    lastSyncedAt: new Date().toISOString(),
  });

  return NextResponse.redirect(`${env.appBaseUrl}/settings`);
}
