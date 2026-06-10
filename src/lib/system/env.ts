export const env = {
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  allowedEmails: parseCsv(process.env.ALLOWED_EMAILS),
  cronSecret: process.env.CRON_SECRET,
  demoUserEmail: process.env.DEMO_USER_EMAIL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googleServiceAccountPrivateKey: normalizePrivateKey(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  ),
  googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
};

export function hasSheetsConfig() {
  return Boolean(
    env.googleServiceAccountEmail &&
      env.googleServiceAccountPrivateKey &&
      env.googleSheetsSpreadsheetId,
  );
}

export function hasGoogleOAuthConfig() {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

function parseCsv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizePrivateKey(value?: string) {
  return value?.replace(/\\n/g, "\n");
}

