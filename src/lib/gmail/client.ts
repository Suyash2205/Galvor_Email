import { google } from "googleapis";
import { env } from "@/lib/system/env";

export function getGoogleOAuthClient(redirectPath: string) {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new Error("Google OAuth environment variables are not configured.");
  }

  return new google.auth.OAuth2({
    clientId: env.googleClientId,
    clientSecret: env.googleClientSecret,
    redirectUri: `${env.appBaseUrl}${redirectPath}`,
  });
}

export function getGmailClient(refreshToken: string) {
  const auth = getGoogleOAuthClient("/api/gmail/callback");
  auth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth });
}

