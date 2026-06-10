import type { EmailMessage, Lead, LeadFilters, LeadUpdateInput, SyncState } from "./types";

export interface LeadRepository {
  getLeads(filters: LeadFilters): Promise<Lead[]>;
  getLeadById(leadId: string, connectedInbox: string): Promise<Lead | null>;
  findLeadForGmailThread(
    gmailThreadId: string,
    emailAddress: string,
    connectedInbox: string,
  ): Promise<Lead | null>;
  updateLead(
    leadId: string,
    connectedInbox: string,
    updates: LeadUpdateInput,
  ): Promise<Lead | null>;
  upsertLead(lead: Lead): Promise<void>;
  getThreadMessages(leadId: string, connectedInbox: string): Promise<EmailMessage[]>;
  upsertThreadMessages(messages: EmailMessage[]): Promise<void>;
  getSyncState(gmailAccount: string): Promise<SyncState | null>;
  setSyncState(state: SyncState): Promise<void>;
}
