import type { AppSession } from "./session";

export function assertInboxAccess(session: AppSession, connectedInbox: string) {
  if (session.email.toLowerCase() !== connectedInbox.toLowerCase()) {
    throw new Response("Forbidden", { status: 403 });
  }
}

