# Galvor Email Leads

Private Gmail reply dashboard for Galvor outreach. The app is a Next.js 15 App Router project with Google Sheets as the primary repository and a repository boundary ready for a later Supabase swap.

## Current foundation

- `/leads` inbox scoped to the signed-in user's Gmail address.
- `/leads/[leadId]` detail page with email summary, thread timeline, and editable CRM fields.
- `/settings` page for Gmail connection status and environment readiness.
- `LeadRepository` interface with `SheetsLeadRepository` and a local `DemoLeadRepository` fallback.
- Google OAuth routes for app login and Gmail connection.
- Encrypted Gmail refresh-token storage in the `_System` sheet tab.
- Gemini Flash-Lite summarization helper with rule-based fallback.
- Cron route stubs for Gmail and Sheets sync.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Without Sheets credentials, the app uses demo data. To use the live sheet, fill these values:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=1ndpjC1UVcobZu9CCCvt4hKFqSipZgit6zm_ec__-L8g
```

Share the spreadsheet with the service account email as an editor.

For Google email sign-in and Gmail connect:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
ALLOWED_EMAILS=sunil@galvor.com
APP_BASE_URL=http://localhost:3000
TOKEN_ENCRYPTION_KEY=
```

For local development without Google login, set:

```bash
DEMO_USER_EMAIL=sunil@galvor.com
```

Leave `DEMO_USER_EMAIL` empty for the real sign-in flow. The dashboard will show a Google sign-in button and only allow `sunil@galvor.com`.

## Gmail sync

After signing in:

1. Open `/settings`.
2. Click `Connect` and approve Gmail access for `sunil@galvor.com`.
3. Click the sync icon.

The sync imports up to 50 recent Gmail threads per run from the last 90 days, keeps only threads with an external inbound reply, writes message rows to `Email Threads`, upserts the lead row in `Tracker`, and stores the Gmail cursor/token metadata in `_System`.

Gemini summaries use `gemini-2.5-flash-lite` when `GEMINI_API_KEY` is set. If Gemini is missing or rate-limited, the app writes a deterministic fallback summary instead.

## Privacy rule

For now, the app is configured for one login: `sunil@galvor.com`. All leads stay in one shared Google Sheet. The `Connected Inbox` column marks ownership, and every repository read/write still checks `connectedInbox = session.email`, so this can expand to more users later without splitting sheets.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

## Next implementation steps

1. Complete Gmail history parsing and backfill in `src/lib/sync/engine.ts`.
2. Convert Gmail messages into `EmailMessage` rows using `src/lib/gmail/lead-detector.ts`.
3. Queue Gemini summaries with `src/lib/gemini/rate-limiter.ts`.
4. Add privacy-focused API tests for cross-inbox denial.
5. Add a `SupabaseLeadRepository` behind the existing interface when ready.
