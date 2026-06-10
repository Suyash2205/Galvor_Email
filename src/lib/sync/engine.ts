import { randomUUID } from "crypto";
import type { gmail_v1 } from "googleapis";
import { decryptToken } from "@/lib/crypto/tokens";
import { throttleGemini } from "@/lib/gemini/rate-limiter";
import { summarizeThread } from "@/lib/gemini/summarize";
import { getGmailClient } from "@/lib/gmail/client";
import {
  directionFor,
  isClearlyNegativeThread,
  isAutomatedSender,
  isLeadThread,
  isLikelyMarketingThread,
} from "@/lib/gmail/lead-detector";
import { getLeadRepository } from "@/lib/repositories";
import type { EmailMessage, Lead } from "@/lib/repositories/types";
import { env } from "@/lib/system/env";

const backfillQuery = "newer_than:180d";
const maxThreadsPerRun = 350;
const maxSummariesPerRun = 8;

export interface GmailSyncResult {
  gmailAccount: string;
  status: "ok" | "needs_connection" | "error";
  scannedThreads: number;
  leadThreads: number;
  upsertedMessages: number;
  summarizedThreads: number;
  error?: string;
}

export async function syncGmailAccount(gmailAccount: string): Promise<GmailSyncResult> {
  const repository = getLeadRepository();
  const state = await repository.getSyncState(gmailAccount);

  if (!state?.refreshTokenEncrypted) {
    return {
      gmailAccount,
      status: "needs_connection",
      scannedThreads: 0,
      leadThreads: 0,
      upsertedMessages: 0,
      summarizedThreads: 0,
      error: "Connect Gmail from Settings before syncing.",
    };
  }

  try {
    const refreshToken = decryptToken(state.refreshTokenEncrypted);
    const gmail = getGmailClient(refreshToken);
    const profile = await gmail.users.getProfile({ userId: "me" });
    const historyCursor = profile.data.historyId ?? state.historyCursor;
    const threadIds = await listThreadIds(gmail);

    let scannedThreads = 0;
    let leadThreads = 0;
    let upsertedMessages = 0;
    let summarizedThreads = 0;

    for (const threadId of threadIds) {
      scannedThreads += 1;
      const gmailThread = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full",
      });
      const parsed = parseGmailThread(gmailThread.data, gmailAccount);
      if (!parsed || !isLeadThread(parsed.messages, [gmailAccount])) continue;
      if (isLikelyMarketingThread(parsed.subject, parsed.messages)) continue;
      if (isClearlyNegativeThread(parsed.messages, [gmailAccount])) continue;

      const externalContact = getPrimaryExternalContact(parsed.messages, gmailAccount);
      if (!externalContact) continue;

      const existing = await repository.findLeadForGmailThread(
        parsed.gmailThreadId,
        externalContact.email,
        gmailAccount,
      );

      leadThreads += 1;
      const leadId = existing?.id ?? randomUUID();
      const messages = parsed.messages.map((message) => ({ ...message, leadId }));
      const latestInbound = [...messages].reverse().find((message) => message.direction === "inbound");
      const firstInbound = messages.find((message) => message.direction === "inbound");

      await repository.upsertThreadMessages(messages);
      upsertedMessages += messages.length;

      const summary =
        summarizedThreads < maxSummariesPerRun
          ? await summarizeWithThrottle(parsed.subject, messages)
          : {
              ...buildUnsummarizedPlaceholder(messages),
              source: "fallback" as const,
            };
      if (summarizedThreads < maxSummariesPerRun) summarizedThreads += 1;

      const lead: Lead = {
        id: leadId,
        company: existing?.company || inferCompany(externalContact.email),
        category: existing?.category,
        firstName: existing?.firstName || externalContact.name.split(" ")[0] || "",
        lastName: existing?.lastName || externalContact.name.split(" ").slice(1).join(" "),
        emailAddress: externalContact.email,
        phoneNumber: existing?.phoneNumber,
        owner: existing?.owner || gmailAccount,
        connectedInbox: gmailAccount,
        gmailThreadId: parsed.gmailThreadId,
        emailSubject: parsed.subject,
        firstReplyDate: firstInbound?.date,
        lastReplyFrom: latestInbound?.from,
        lastReplySnippet: latestInbound?.snippet || latestInbound?.bodyText,
        threadMessageCount: messages.length,
        emailSummary: summary.summary,
        interestSignal: summary.interestSignal,
        suggestedNextStep: summary.suggestedNextStep,
        emailStatus: existing?.emailStatus || "Replied",
        emailOutcome: existing?.emailOutcome,
        emailNotes: existing?.emailNotes,
        nextAction: existing?.nextAction,
        nextActionDate: existing?.nextActionDate,
        overallStage: existing?.overallStage || "New Reply",
        priority: existing?.priority || priorityFor(summary.interestSignal),
        lastTouchDate: latestInbound?.date?.slice(0, 10),
        dashboardUrl: `${env.appBaseUrl}/leads/${leadId}`,
        lastSyncedAt: new Date().toISOString(),
        syncSource: "gmail",
      };

      await repository.upsertLead(lead);
    }

    await repository.setSyncState({
      gmailAccount,
      refreshTokenEncrypted: state.refreshTokenEncrypted,
      historyCursor,
      watchExpiration: state.watchExpiration,
      lastSyncedAt: new Date().toISOString(),
    });

    return {
      gmailAccount,
      status: "ok",
      scannedThreads,
      leadThreads,
      upsertedMessages,
      summarizedThreads,
    };
  } catch (error) {
    return {
      gmailAccount,
      status: "error",
      scannedThreads: 0,
      leadThreads: 0,
      upsertedMessages: 0,
      summarizedThreads: 0,
      error: error instanceof Error ? error.message : "Unknown Gmail sync error.",
    };
  }
}

export async function syncSheetsToDashboard() {
  return {
    status: "ok",
    note: "Sheets is the live repository, so dashboard reads reflect sheet data on next request.",
  };
}

async function listThreadIds(gmail: gmail_v1.Gmail) {
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < maxThreadsPerRun) {
    const response = await gmail.users.threads.list({
      userId: "me",
      q: backfillQuery,
      maxResults: Math.min(25, maxThreadsPerRun - ids.length),
      pageToken,
    });
    ids.push(...(response.data.threads?.map((thread) => thread.id).filter(Boolean) as string[]));
    pageToken = response.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  return ids;
}

async function summarizeWithThrottle(subject: string, messages: EmailMessage[]) {
  await throttleGemini();
  return summarizeThread(subject, messages);
}

function buildUnsummarizedPlaceholder(messages: EmailMessage[]) {
  const latestInbound = [...messages].reverse().find((message) => message.direction === "inbound");
  return {
    summary:
      latestInbound?.snippet ||
      latestInbound?.bodyText?.slice(0, 200) ||
      "Imported from Gmail. Summary pending.",
    interestSignal: "Neutral" as const,
    suggestedNextStep: "Review the thread and decide the next follow-up.",
  };
}

function parseGmailThread(thread: gmail_v1.Schema$Thread, gmailAccount: string) {
  if (!thread.id || !thread.messages?.length) return null;
  const messages = thread.messages
    .map((message) => parseGmailMessage(message, gmailAccount, thread.id!))
    .filter((message): message is EmailMessage => Boolean(message))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (messages.length === 0) return null;

  return {
    gmailThreadId: thread.id,
    subject: messages[0]?.subject ?? "",
    messages,
  };
}

function parseGmailMessage(
  message: gmail_v1.Schema$Message,
  gmailAccount: string,
  gmailThreadId: string,
): EmailMessage | null {
  if (!message.id) return null;
  const headers = message.payload?.headers ?? [];
  const from = header(headers, "From");
  const to = header(headers, "To");
  const subject = header(headers, "Subject");
  const date = parseDate(header(headers, "Date"), message.internalDate);
  const bodyText = extractBodyText(message.payload);

  return {
    leadId: "",
    gmailMessageId: message.id,
    gmailThreadId,
    direction: directionFor(from, [gmailAccount]),
    from,
    to,
    date,
    subject,
    bodyText: bodyText.slice(0, 50000),
    snippet: message.snippet ?? bodyText.slice(0, 200),
    hasAttachments: hasAttachments(message.payload),
  };
}

function header(headers: gmail_v1.Schema$MessagePartHeader[], name: string) {
  return headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseDate(headerDate: string, internalDate?: string | null) {
  const parsed = Date.parse(headerDate);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  if (internalDate) return new Date(Number(internalDate)).toISOString();
  return new Date().toISOString();
}

function extractBodyText(part?: gmail_v1.Schema$MessagePart): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return htmlToText(decodeBase64Url(part.body.data));
  }
  return (part.parts ?? []).map(extractBodyText).filter(Boolean).join("\n\n");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function htmlToText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function hasAttachments(part?: gmail_v1.Schema$MessagePart): boolean {
  if (!part) return false;
  if (part.filename) return true;
  return (part.parts ?? []).some(hasAttachments);
}

function getPrimaryExternalContact(messages: EmailMessage[], gmailAccount: string) {
  const inbound = messages.find(
    (message) =>
      message.direction === "inbound" &&
      !isAutomatedSender(message.from) &&
      extractEmail(message.from).toLowerCase() !== gmailAccount.toLowerCase(),
  );
  if (!inbound) return null;
  const email = extractEmail(inbound.from);
  return {
    email,
    name: extractName(inbound.from, email),
  };
}

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/) ?? value.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  return (match?.[1] ?? value).trim().replace(/^"|"$/g, "");
}

function extractName(value: string, email: string) {
  return value
    .replace(`<${email}>`, "")
    .replace(email, "")
    .replace(/^"|"$/g, "")
    .trim();
}

function inferCompany(email: string) {
  const domain = email.split("@")[1] ?? email;
  const name = domain.split(".")[0] ?? domain;
  return name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function priorityFor(signal: Lead["interestSignal"]) {
  if (signal === "Hot") return "High";
  if (signal === "Warm") return "Medium";
  return "Normal";
}
