import type { EmailMessage } from "@/lib/repositories/types";

const automatedSenders = [
  "noreply@",
  "no-reply@",
  "mailer-daemon",
  "postmaster@",
  "notifications@",
  "newsletter@",
  "marketing@",
];

export function isLeadThread(messages: EmailMessage[], connectedInboxes: string[]) {
  return messages.some(
    (message) =>
      isExternalInbound(message, connectedInboxes) && !isAutomatedSender(message.from),
  );
}

export function directionFor(from: string, connectedInboxes: string[]) {
  return connectedInboxes.some((email) => email.toLowerCase() === extractEmail(from).toLowerCase())
    ? "outbound"
    : "inbound";
}

export function isExternalInbound(message: EmailMessage, connectedInboxes: string[]) {
  return (
    message.direction === "inbound" &&
    !connectedInboxes.some(
      (email) => email.toLowerCase() === extractEmail(message.from).toLowerCase(),
    )
  );
}

export function isAutomatedSender(from: string) {
  const normalized = from.toLowerCase();
  return automatedSenders.some((token) => normalized.includes(token));
}

export function isLikelyMarketingThread(subject: string, messages: EmailMessage[]) {
  const normalizedSubject = subject.toLowerCase();
  if (
    normalizedSubject.includes("newsletter") ||
    normalizedSubject.includes("verify your email") ||
    normalizedSubject.includes("confirm your subscription")
  ) {
    return true;
  }

  return messages.every((message) => isAutomatedSender(message.from));
}

export function isClearlyNegativeThread(messages: EmailMessage[], connectedInboxes: string[]) {
  const inboundMessages = messages.filter((message) => isExternalInbound(message, connectedInboxes));
  if (inboundMessages.length === 0) return false;

  return inboundMessages.every((message) => {
    const text = normalizeReplyText(message.bodyText || message.snippet);
    return hardNegativePatterns.some((pattern) => pattern.test(text));
  });
}

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return match?.[1] ?? value;
}

function normalizeReplyText(value: string) {
  return value
    .toLowerCase()
    .split(/\nOn .+ wrote:|\nFrom:|\nSent:|\n> /i)[0]
    .replace(/\s+/g, " ")
    .trim();
}

const hardNegativePatterns = [
  /\bnot interested\b/,
  /\bno interest\b/,
  /\bplease remove\b/,
  /\bremove me\b/,
  /\bstop emailing\b/,
  /\bdon't email\b/,
  /\bdo not email\b/,
  /\bunsubscribe\b/,
];
