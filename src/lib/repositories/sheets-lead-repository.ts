import { randomUUID } from "crypto";
import type { sheets_v4 } from "googleapis";
import { emailThreadColumns, systemColumns, trackerColumns } from "./columns";
import type { LeadRepository } from "./lead-repository";
import type { EmailMessage, Lead, LeadFilters, LeadUpdateInput, SyncState } from "./types";
import { getSheetsClient, getSpreadsheetId } from "@/lib/sheets/client";
import { env } from "@/lib/system/env";

type Row = Record<string, string>;

const trackerTabs = ["Tracker", "Positiv Leads"] as const;
let schemaEnsuredAt = 0;
let schemaEnsurePromise: Promise<void> | null = null;
const schemaTtlMs = 10 * 60 * 1000;

export class SheetsLeadRepository implements LeadRepository {
  private sheets = getSheetsClient();
  private spreadsheetId = getSpreadsheetId();

  async getLeads(filters: LeadFilters): Promise<Lead[]> {
    const [rows, positiveRows] = await this.readRowsMany(["Tracker", "Positiv Leads"]);
    const merged = [...rows, ...positiveRows]
      .map(rowToLead)
      .filter((lead): lead is Lead => Boolean(lead))
      .filter((lead) => lead.connectedInbox.toLowerCase() === filters.connectedInbox.toLowerCase())
      .filter((lead) => !filters.stage || lead.overallStage === filters.stage)
      .filter((lead) => !filters.interestSignal || lead.interestSignal === filters.interestSignal)
      .filter((lead) => {
        if (!filters.search) return true;
        const haystack = [
          lead.company,
          lead.emailAddress,
          lead.emailSubject,
          lead.emailSummary,
          lead.lastReplySnippet,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(filters.search.toLowerCase());
      });

    return dedupeLeads(merged);
  }

  async getLeadById(leadId: string, connectedInbox: string): Promise<Lead | null> {
    const leads = await this.getLeads({ connectedInbox });
    return leads.find((lead) => lead.id === leadId) ?? null;
  }

  async findLeadForGmailThread(
    gmailThreadId: string,
    emailAddress: string,
    connectedInbox: string,
  ): Promise<Lead | null> {
    const leads = await this.getLeads({ connectedInbox });
    return (
      leads.find(
        (lead) =>
          lead.gmailThreadId === gmailThreadId ||
          lead.emailAddress.toLowerCase() === emailAddress.toLowerCase(),
      ) ?? null
    );
  }

  async updateLead(
    leadId: string,
    connectedInbox: string,
    updates: LeadUpdateInput,
  ): Promise<Lead | null> {
    await this.ensureSchema();
    for (const tab of trackerTabs) {
      const sheet = await this.getSheet(tab);
      const rowIndex = sheet.rows.findIndex(
        (row) =>
          row["Lead ID"] === leadId &&
          row["Connected Inbox"].toLowerCase() === connectedInbox.toLowerCase(),
      );
      if (rowIndex === -1) continue;

      const nextRow = {
        ...sheet.rows[rowIndex],
        ...leadUpdateToRow(updates),
        "Last Synced At": new Date().toISOString(),
        "Sync Source": "dashboard",
      };

      await this.writeRow(tab, rowIndex + 2, sheet.headers, nextRow);
      return rowToLead(nextRow);
    }

    return null;
  }

  async upsertLead(lead: Lead): Promise<void> {
    await this.ensureSchema();
    const sheet = await this.getSheet("Tracker");
    const rowIndex = sheet.rows.findIndex((row) => row["Lead ID"] === lead.id);
    const row = leadToRow(lead);
    if (rowIndex >= 0) {
      await this.writeRow("Tracker", rowIndex + 2, sheet.headers, row);
      return;
    }

    await this.appendRow("Tracker", sheet.headers, row);
  }

  async getThreadMessages(leadId: string, connectedInbox: string): Promise<EmailMessage[]> {
    const lead = await this.getLeadById(leadId, connectedInbox);
    if (!lead) return [];
    const rows = await this.readRows("Email Threads");
    return rows
      .filter((row) => row["Lead ID"] === leadId)
      .map(rowToEmailMessage)
      .filter((message): message is EmailMessage => Boolean(message))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async upsertThreadMessages(messages: EmailMessage[]): Promise<void> {
    await this.ensureSchema();
    const sheet = await this.getSheet("Email Threads");
    for (const message of messages) {
      const row = emailMessageToRow(message);
      const rowIndex = sheet.rows.findIndex(
        (item) => item["Gmail Message ID"] === message.gmailMessageId,
      );
      if (rowIndex >= 0) {
        await this.writeRow("Email Threads", rowIndex + 2, sheet.headers, row);
      } else {
        await this.appendRow("Email Threads", sheet.headers, row);
      }
    }
  }

  async getSyncState(gmailAccount: string): Promise<SyncState | null> {
    await this.ensureSchema();
    const rows = await this.readRows("_System");
    const row = rows.find(
      (item) => item["Gmail Account Email"].toLowerCase() === gmailAccount.toLowerCase(),
    );
    if (!row) return null;
    return {
      gmailAccount: row["Gmail Account Email"],
      refreshTokenEncrypted: row["Refresh Token Encrypted"],
      historyCursor: row["History Cursor"],
      watchExpiration: row["Watch Expiration"],
      lastSyncedAt: row["Last Synced At"],
    };
  }

  async setSyncState(state: SyncState): Promise<void> {
    await this.ensureSchema();
    const sheet = await this.getSheet("_System");
    const row = {
      "Gmail Account Email": state.gmailAccount,
      "Refresh Token Encrypted": state.refreshTokenEncrypted ?? "",
      "History Cursor": state.historyCursor ?? "",
      "Watch Expiration": state.watchExpiration ?? "",
      "Last Synced At": state.lastSyncedAt ?? new Date().toISOString(),
    };
    const rowIndex = sheet.rows.findIndex(
      (item) =>
        item["Gmail Account Email"].toLowerCase() === state.gmailAccount.toLowerCase(),
    );
    if (rowIndex >= 0) {
      await this.writeRow("_System", rowIndex + 2, sheet.headers, row);
      return;
    }
    await this.appendRow("_System", sheet.headers, row);
  }

  private async ensureSchema() {
    if (Date.now() - schemaEnsuredAt < schemaTtlMs) return;
    if (schemaEnsurePromise) return schemaEnsurePromise;

    schemaEnsurePromise = this.ensureSchemaInternal().finally(() => {
      schemaEnsurePromise = null;
    });

    return schemaEnsurePromise;
  }

  private async ensureSchemaInternal() {
    const metadata = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    const existingTitles = new Set(
      metadata.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean),
    );

    const requests: sheets_v4.Schema$Request[] = [];
    for (const title of ["Email Threads", "_System"]) {
      if (!existingTitles.has(title)) {
        requests.push({ addSheet: { properties: { title, hidden: title === "_System" } } });
      }
    }

    if (requests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests },
      });
    }

    await Promise.all([
      this.ensureColumns("Tracker", trackerColumns),
      this.ensureColumns("Positiv Leads", trackerColumns),
      this.ensureColumns("Email Threads", emailThreadColumns),
      this.ensureColumns("_System", systemColumns),
    ]);

    schemaEnsuredAt = Date.now();
  }

  private async ensureColumns(tab: string, requiredColumns: readonly string[]) {
    const headers = await this.readHeaders(tab);
    if (headers.length === 0) {
      await this.updateRange(`${quoteTab(tab)}!A1`, [[...requiredColumns]]);
      return;
    }

    const missing = requiredColumns.filter((column) => !headers.includes(column));
    if (missing.length === 0) return;

    await this.updateRange(`${quoteTab(tab)}!A1`, [[...headers, ...missing]]);
  }

  private async getSheet(tab: string) {
    const values = await this.readValues(tab);
    const headers = values[0] ?? [];
    const rows = values.slice(1).map((cells) => cellsToRow(headers, cells));
    return { headers, rows };
  }

  private async readRows(tab: string): Promise<Row[]> {
    const sheet = await this.getSheet(tab);
    return sheet.rows;
  }

  private async readRowsMany(tabs: string[]): Promise<Row[][]> {
    const response = await this.sheets.spreadsheets.values.batchGet({
      spreadsheetId: this.spreadsheetId,
      ranges: tabs.map((tab) => `${quoteTab(tab)}!A:AZ`),
    });

    return tabs.map((_, index) => {
      const values = (response.data.valueRanges?.[index]?.values as string[][] | undefined) ?? [];
      const headers = values[0] ?? [];
      return values.slice(1).map((cells) => cellsToRow(headers, cells));
    });
  }

  private async readHeaders(tab: string): Promise<string[]> {
    const values = await this.readValues(tab);
    return values[0] ?? [];
  }

  private async readValues(tab: string): Promise<string[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${quoteTab(tab)}!A:AZ`,
    });
    return (response.data.values as string[][] | undefined) ?? [];
  }

  private async writeRow(tab: string, rowNumber: number, headers: string[], row: Row) {
    await this.updateRange(
      `${quoteTab(tab)}!A${rowNumber}:${columnName(headers.length)}${rowNumber}`,
      [headers.map((header) => row[header] ?? "")],
    );
  }

  private async appendRow(tab: string, headers: string[], row: Row) {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${quoteTab(tab)}!A:${columnName(headers.length)}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers.map((header) => row[header] ?? "")] },
    });
  }

  private async updateRange(range: string, values: unknown[][]) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }
}

export function leadToRow(lead: Lead): Row {
  return {
    "Lead ID": lead.id || randomUUID(),
    "Company/Brand": lead.company,
    Category: lead.category ?? "",
    "First Name": lead.firstName ?? "",
    "Last Name": lead.lastName ?? "",
    "Email Address": lead.emailAddress,
    "Phone Number": lead.phoneNumber ?? "",
    Owner: lead.owner ?? "",
    "Connected Inbox": lead.connectedInbox,
    "Gmail Thread ID": lead.gmailThreadId ?? "",
    "Email Subject": lead.emailSubject ?? "",
    "First Reply Date": lead.firstReplyDate ?? "",
    "Last Reply From": lead.lastReplyFrom ?? "",
    "Last Reply Snippet": lead.lastReplySnippet ?? "",
    "Thread Message Count": String(lead.threadMessageCount ?? 0),
    "Email Summary": lead.emailSummary ?? "",
    "Interest Signal": lead.interestSignal ?? "Neutral",
    "Suggested Next Step": lead.suggestedNextStep ?? "",
    "Email Status": lead.emailStatus ?? "",
    "Email Outcome": lead.emailOutcome ?? "",
    "Email Notes": lead.emailNotes ?? "",
    "Next Action": lead.nextAction ?? "",
    "Next Action Date": lead.nextActionDate ?? "",
    "Overall Stage": lead.overallStage ?? "",
    Priority: lead.priority ?? "",
    "Last Touch Date": lead.lastTouchDate ?? "",
    "Dashboard URL": lead.dashboardUrl ?? `${env.appBaseUrl}/leads/${lead.id}`,
    "Last Synced At": lead.lastSyncedAt ?? new Date().toISOString(),
    "Sync Source": lead.syncSource ?? "dashboard",
  };
}

function rowToLead(row: Row): Lead | null {
  const emailAddress = row["Email Address"];
  const connectedInbox = row["Connected Inbox"];
  if (!emailAddress || !connectedInbox) return null;
  return {
    id: row["Lead ID"] || randomUUID(),
    company: row["Company/Brand"] || row.Company || emailAddress,
    category: row.Category,
    firstName: row["First Name"],
    lastName: row["Last Name"],
    emailAddress,
    phoneNumber: row["Phone Number"],
    owner: row.Owner,
    connectedInbox,
    gmailThreadId: row["Gmail Thread ID"],
    emailSubject: row["Email Subject"],
    firstReplyDate: row["First Reply Date"],
    lastReplyFrom: row["Last Reply From"],
    lastReplySnippet: row["Last Reply Snippet"],
    threadMessageCount: Number(row["Thread Message Count"] || 0),
    emailSummary: row["Email Summary"],
    interestSignal: parseInterestSignal(row["Interest Signal"]),
    suggestedNextStep: row["Suggested Next Step"],
    emailStatus: row["Email Status"],
    emailOutcome: row["Email Outcome"],
    emailNotes: row["Email Notes"],
    nextAction: row["Next Action"],
    nextActionDate: row["Next Action Date"],
    overallStage: row["Overall Stage"],
    priority: row.Priority,
    lastTouchDate: row["Last Touch Date"],
    dashboardUrl: row["Dashboard URL"],
    lastSyncedAt: row["Last Synced At"],
    syncSource: parseSyncSource(row["Sync Source"]),
  };
}

function rowToEmailMessage(row: Row): EmailMessage | null {
  if (!row["Lead ID"] || !row["Gmail Message ID"]) return null;
  return {
    leadId: row["Lead ID"],
    gmailMessageId: row["Gmail Message ID"],
    gmailThreadId: row["Gmail Thread ID"],
    direction: row.Direction === "outbound" ? "outbound" : "inbound",
    from: row.From,
    to: row.To,
    date: row.Date,
    subject: row.Subject,
    bodyText: row["Body Text"],
    snippet: row.Snippet,
    hasAttachments: row["Has Attachments"] === "yes",
  };
}

function emailMessageToRow(message: EmailMessage): Row {
  return {
    "Lead ID": message.leadId,
    "Gmail Message ID": message.gmailMessageId,
    "Gmail Thread ID": message.gmailThreadId,
    Direction: message.direction,
    From: message.from,
    To: message.to,
    Date: message.date,
    Subject: message.subject,
    "Body Text": message.bodyText,
    Snippet: message.snippet,
    "Has Attachments": message.hasAttachments ? "yes" : "no",
  };
}

function leadUpdateToRow(updates: LeadUpdateInput): Row {
  return {
    ...(updates.emailStatus !== undefined ? { "Email Status": updates.emailStatus } : {}),
    ...(updates.emailOutcome !== undefined ? { "Email Outcome": updates.emailOutcome } : {}),
    ...(updates.emailNotes !== undefined ? { "Email Notes": updates.emailNotes } : {}),
    ...(updates.nextAction !== undefined ? { "Next Action": updates.nextAction } : {}),
    ...(updates.nextActionDate !== undefined ? { "Next Action Date": updates.nextActionDate } : {}),
    ...(updates.overallStage !== undefined ? { "Overall Stage": updates.overallStage } : {}),
    ...(updates.priority !== undefined ? { Priority: updates.priority } : {}),
    ...(updates.interestSignal !== undefined ? { "Interest Signal": updates.interestSignal } : {}),
  };
}

function cellsToRow(headers: string[], cells: string[]): Row {
  return headers.reduce<Row>((row, header, index) => {
    row[header] = cells[index] ?? "";
    return row;
  }, {});
}

function parseInterestSignal(value?: string): Lead["interestSignal"] {
  if (
    value === "Hot" ||
    value === "Warm" ||
    value === "Neutral" ||
    value === "Not Interested" ||
    value === "OOO"
  ) {
    return value;
  }
  return "Neutral";
}

function parseSyncSource(value?: string): Lead["syncSource"] {
  if (value === "sheet" || value === "gmail" || value === "dashboard") return value;
  return undefined;
}

function dedupeLeads(leads: Lead[]) {
  return [...new Map(leads.map((lead) => [lead.id, lead])).values()];
}

function quoteTab(tab: string) {
  return `'${tab.replaceAll("'", "''")}'`;
}

function columnName(index: number) {
  let name = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}
