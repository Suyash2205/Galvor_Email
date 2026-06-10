import { google } from "googleapis";
import { env } from "@/lib/system/env";

export function getSheetsClient() {
  if (
    !env.googleServiceAccountEmail ||
    !env.googleServiceAccountPrivateKey ||
    !env.googleSheetsSpreadsheetId
  ) {
    throw new Error("Google Sheets service account environment variables are not configured.");
  }

  const auth = new google.auth.JWT({
    email: env.googleServiceAccountEmail,
    key: env.googleServiceAccountPrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export function getSpreadsheetId() {
  if (!env.googleSheetsSpreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is required.");
  }

  return env.googleSheetsSpreadsheetId;
}

