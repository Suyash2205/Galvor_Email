import type { EmailMessage, InterestSignal } from "@/lib/repositories/types";
import { env } from "@/lib/system/env";

export interface SummaryResult {
  summary: string;
  interestSignal: InterestSignal;
  suggestedNextStep: string;
  source: "gemini" | "fallback";
}

export async function summarizeThread(
  subject: string,
  messages: EmailMessage[],
): Promise<SummaryResult> {
  if (!env.geminiApiKey) return fallbackSummary(messages);

  const prompt = buildPrompt(subject, messages);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    },
  );

  if (!response.ok) return fallbackSummary(messages);
  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return fallbackSummary(messages);

  try {
    const parsed = JSON.parse(text) as Partial<SummaryResult>;
    return {
      summary: parsed.summary || fallbackSummary(messages).summary,
      interestSignal: normalizeInterest(parsed.interestSignal),
      suggestedNextStep: parsed.suggestedNextStep || "Review the reply and follow up.",
      source: "gemini",
    };
  } catch {
    return fallbackSummary(messages);
  }
}

export function fallbackSummary(messages: EmailMessage[]): SummaryResult {
  const inbound = [...messages].reverse().find((message) => message.direction === "inbound");
  const contact = inbound?.from || "the contact";
  const snippet = inbound?.snippet || inbound?.bodyText || "No inbound reply text captured.";
  return {
    summary: `${messages.length}-message thread with ${contact}. Last reply: "${truncate(snippet, 180)}"`,
    interestSignal: inferInterest(snippet),
    suggestedNextStep: inferNextStep(snippet),
    source: "fallback",
  };
}

function buildPrompt(subject: string, messages: EmailMessage[]) {
  const body = messages
    .slice(-5)
    .map(
      (message) =>
        `${message.direction.toUpperCase()} ${message.date} ${message.from} -> ${message.to}\n${redact(
          truncate(message.bodyText || message.snippet, 1600),
        )}`,
    )
    .join("\n\n");

  return `Summarize this sales email thread for a CRM.

Return strict JSON with keys summary, interestSignal, suggestedNextStep.
interestSignal must be one of: Hot, Warm, Neutral, Not Interested, OOO.
Use 1-3 sentences for summary.

Subject: ${subject}

Messages:
${body}`;
}

function redact(value: string) {
  return value
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]");
}

function normalizeInterest(value?: string): InterestSignal {
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

function inferInterest(text = ""): InterestSignal {
  const normalized = text.toLowerCase();
  if (normalized.includes("not interested") || normalized.includes("unsubscribe")) {
    return "Not Interested";
  }
  if (normalized.includes("out of office") || normalized.includes("ooo")) return "OOO";
  if (normalized.includes("pricing") || normalized.includes("demo") || normalized.includes("call")) {
    return "Hot";
  }
  if (normalized.includes("next week") || normalized.includes("later")) return "Warm";
  return "Neutral";
}

function inferNextStep(text = "") {
  const signal = inferInterest(text);
  if (signal === "Hot") return "Reply with requested details and propose a meeting time.";
  if (signal === "Warm") return "Schedule a follow-up reminder.";
  if (signal === "Not Interested") return "Mark as not interested and stop outreach.";
  if (signal === "OOO") return "Follow up after the out-of-office window.";
  return "Review the thread and send a concise follow-up.";
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

