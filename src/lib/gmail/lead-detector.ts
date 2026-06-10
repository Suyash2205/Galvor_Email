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
    normalizedSubject.includes("unsubscribe") ||
    normalizedSubject.includes("newsletter") ||
    normalizedSubject.includes("verify your email")
  ) {
    return true;
  }

  return messages.some((message) => {
    const text = `${message.bodyText} ${message.snippet}`.toLowerCase();
    return text.includes("unsubscribe") && text.includes("manage preferences");
  });
}

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return match?.[1] ?? value;
}
