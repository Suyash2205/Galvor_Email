export type InterestSignal = "Hot" | "Warm" | "Neutral" | "Not Interested" | "OOO";

export type EmailDirection = "inbound" | "outbound";

export interface Lead {
  id: string;
  company: string;
  category?: string;
  firstName?: string;
  lastName?: string;
  emailAddress: string;
  phoneNumber?: string;
  owner?: string;
  connectedInbox: string;
  gmailThreadId?: string;
  emailSubject?: string;
  firstReplyDate?: string;
  lastReplyFrom?: string;
  lastReplySnippet?: string;
  threadMessageCount: number;
  emailSummary?: string;
  interestSignal: InterestSignal;
  suggestedNextStep?: string;
  emailStatus?: string;
  emailOutcome?: string;
  emailNotes?: string;
  nextAction?: string;
  nextActionDate?: string;
  overallStage?: string;
  priority?: string;
  lastTouchDate?: string;
  lastSyncedAt?: string;
  syncSource?: "sheet" | "gmail" | "dashboard";
  dashboardUrl?: string;
}

export interface EmailMessage {
  leadId: string;
  gmailMessageId: string;
  gmailThreadId: string;
  direction: EmailDirection;
  from: string;
  to: string;
  date: string;
  subject: string;
  bodyText: string;
  snippet: string;
  hasAttachments: boolean;
}

export interface LeadFilters {
  connectedInbox: string;
  stage?: string;
  search?: string;
  interestSignal?: InterestSignal;
}

export interface SyncState {
  gmailAccount: string;
  refreshTokenEncrypted?: string;
  historyCursor?: string;
  watchExpiration?: string;
  lastSyncedAt?: string;
}

export interface LeadUpdateInput {
  emailStatus?: string;
  emailOutcome?: string;
  emailNotes?: string;
  nextAction?: string;
  nextActionDate?: string;
  overallStage?: string;
  priority?: string;
  interestSignal?: InterestSignal;
}

