import type { LeadRepository } from "./lead-repository";
import type { EmailMessage, Lead, LeadFilters, LeadUpdateInput, SyncState } from "./types";

const now = new Date().toISOString();

const leads: Lead[] = [
  {
    id: "demo-lead-001",
    company: "Northstar Foods",
    category: "CPG",
    firstName: "Maya",
    lastName: "Rao",
    emailAddress: "maya@northstar.example",
    owner: "Sunil",
    connectedInbox: "sunil@galvor.com",
    gmailThreadId: "demo-thread-001",
    emailSubject: "Re: Galvor retail intelligence",
    firstReplyDate: "2026-06-08T09:30:00.000Z",
    lastReplyFrom: "Maya Rao <maya@northstar.example>",
    lastReplySnippet: "This looks relevant. Can you send over a short deck and pricing?",
    threadMessageCount: 3,
    emailSummary:
      "Maya replied positively and asked for a short deck plus pricing. The next useful move is to send material and propose a 20-minute walkthrough.",
    interestSignal: "Hot",
    suggestedNextStep: "Send deck and pricing, then ask for a walkthrough slot.",
    emailStatus: "Replied",
    overallStage: "Qualified",
    priority: "High",
    lastTouchDate: "2026-06-08",
    lastSyncedAt: now,
    syncSource: "gmail",
  },
];

const messages: EmailMessage[] = [
  {
    leadId: "demo-lead-001",
    gmailMessageId: "demo-message-001",
    gmailThreadId: "demo-thread-001",
    direction: "outbound",
    from: "sunil@galvor.com",
    to: "maya@northstar.example",
    date: "2026-06-08T08:45:00.000Z",
    subject: "Galvor retail intelligence",
    bodyText: "Hi Maya, sharing a quick note on how Galvor helps teams spot retail signals.",
    snippet: "sharing a quick note on how Galvor helps teams spot retail signals",
    hasAttachments: false,
  },
  {
    leadId: "demo-lead-001",
    gmailMessageId: "demo-message-002",
    gmailThreadId: "demo-thread-001",
    direction: "inbound",
    from: "maya@northstar.example",
    to: "sunil@galvor.com",
    date: "2026-06-08T09:30:00.000Z",
    subject: "Re: Galvor retail intelligence",
    bodyText: "This looks relevant. Can you send over a short deck and pricing?",
    snippet: "This looks relevant. Can you send over a short deck and pricing?",
    hasAttachments: false,
  },
];

export class DemoLeadRepository implements LeadRepository {
  async getLeads(filters: LeadFilters) {
    return leads
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
  }

  async getLeadById(leadId: string, connectedInbox: string) {
    return (
      leads.find(
        (lead) =>
          lead.id === leadId &&
          lead.connectedInbox.toLowerCase() === connectedInbox.toLowerCase(),
      ) ?? null
    );
  }

  async findLeadForGmailThread(
    gmailThreadId: string,
    emailAddress: string,
    connectedInbox: string,
  ) {
    return (
      leads.find(
        (lead) =>
          lead.connectedInbox.toLowerCase() === connectedInbox.toLowerCase() &&
          (lead.gmailThreadId === gmailThreadId ||
            lead.emailAddress.toLowerCase() === emailAddress.toLowerCase()),
      ) ?? null
    );
  }

  async updateLead(leadId: string, connectedInbox: string, updates: LeadUpdateInput) {
    const lead = await this.getLeadById(leadId, connectedInbox);
    if (!lead) return null;
    Object.assign(lead, updates, {
      lastSyncedAt: new Date().toISOString(),
      syncSource: "dashboard" as const,
    });
    return lead;
  }

  async upsertLead(lead: Lead) {
    const index = leads.findIndex((item) => item.id === lead.id);
    if (index >= 0) leads[index] = lead;
    else leads.push(lead);
  }

  async getThreadMessages(leadId: string, connectedInbox: string) {
    const lead = await this.getLeadById(leadId, connectedInbox);
    if (!lead) return [];
    return messages.filter((message) => message.leadId === leadId);
  }

  async upsertThreadMessages(nextMessages: EmailMessage[]) {
    for (const message of nextMessages) {
      const index = messages.findIndex((item) => item.gmailMessageId === message.gmailMessageId);
      if (index >= 0) messages[index] = message;
      else messages.push(message);
    }
  }

  async getSyncState(gmailAccount: string): Promise<SyncState | null> {
    return {
      gmailAccount,
      lastSyncedAt: now,
    };
  }

  async setSyncState() {}
}
