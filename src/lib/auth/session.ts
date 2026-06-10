import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/system/env";

const cookieName = "galvor_session";

export interface AppSession {
  email: string;
  name?: string;
  picture?: string;
}

export async function getSession(): Promise<AppSession | null> {
  const store = await cookies();
  const value = store.get(cookieName)?.value;
  if (value) return verifySessionCookie(value);

  const demoEmail = env.demoUserEmail;
  if (process.env.NODE_ENV !== "production" && demoEmail) {
    return { email: demoEmail };
  }

  return null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  assertAllowedEmail(session.email);
  return session;
}

export async function getAuthorizedSession() {
  const session = await getSession();
  if (!session) return { session: null, status: 401 };
  if (!isAllowedEmail(session.email)) return { session: null, status: 403 };
  return { session, status: 200 };
}

export function setSessionCookie(response: NextResponse, session: AppSession) {
  response.cookies.set(cookieName, signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(cookieName);
}

export function assertAllowedEmail(email: string) {
  if (!isAllowedEmail(email)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export function isAllowedEmail(email: string) {
  if (env.allowedEmails.length === 0) return true;
  return env.allowedEmails.includes(email.toLowerCase());
}

function signSession(session: AppSession) {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = signatureFor(payload);
  return `${payload}.${signature}`;
}

function verifySessionCookie(value: string): AppSession | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = signatureFor(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AppSession;
  } catch {
    return null;
  }
}

function signatureFor(payload: string) {
  const secret = env.nextAuthSecret || "dev-only-secret-change-me";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
