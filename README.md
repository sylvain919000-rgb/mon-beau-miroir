# Mon Beau Miroir

A photo-rating web app: each member uploads **one** photo, others rate it 1–10
(with optional per-attribute scores that are **private by default**), and
messaging is paid (single credits, a 15-minute inbox pass, or a subscription).

## Stack
- **Next.js** (App Router, TypeScript, React Server Components)
- **Tailwind CSS v4** — all style values come from tokens in `app/globals.css`
- **Supabase** — Postgres, Auth, private Storage bucket, Row Level Security
- **Stripe** — Checkout + webhooks (from Phase 3)

## Getting started
1. Create a Supabase project. In the SQL editor, run
   `supabase/migrations/0001_init.sql` once.
2. In Supabase → Authentication → Providers, enable Email and Google.
3. Copy `.env.example` to `.env.local` and fill in the values.
4. `npm install && npm run dev`

## Code map
| Path | Purpose |
|---|---|
| `app/globals.css` | **The only file allowed to contain raw style values.** |
| `lib/copy.ts` | Every legal / product string, centralized for review & i18n. |
| `lib/constants.ts` | Business rules (pass duration, attributes, thresholds). |
| `lib/database.types.ts` | Typed mirror of the SQL schema. |
| `supabase/migrations/` | Database schema + RLS. New changes = new files. |
| `lib/supabase/` | Browser / server / service-role clients + session middleware. |
| `app/api/photo-url/` | Authorization gate that signs private photo URLs. |
| `components/fallbacks/` | Avatar initials, SVG photo placeholder, glass skeleton. |
| `components/high-score-gate.tsx` | The mandatory "Are you sure?" modal for any 9/10 score. |
| `app/feed/` | The rating queue: overall + optional attribute scores. |
| `app/p/[photoId]/` | Public photo page; attribute breakdown only when shared. |
| `tests/mission.spec.ts` | Playwright mission flow — must pass after every phase. |
| `lib/billing/` | Product/price map, Stripe client, entitlement summary. |
| `app/api/stripe/webhook/` | The only place money becomes access (idempotent). |
| `app/inbox/` | Free teasers always; full threads behind read access. |
| `app/me/insights/` | Owner analytics: distribution, trend, radar/bars, preview. |
| `scripts/seed.mjs` | Dev-only fake raters/ratings: `npm run seed -- <user-id>`. |
| `app/terms`, `app/privacy` | Plain-English legal pages (lawyer review before launch). |
| `app/admin/` | Moderation desk: pending photos + reports, fully audited. |
| `lib/moderation/` | Moderation provider interface (manual now, API-ready). |
| `scripts/ci.sh` | Full gate: tokens + prices + lint + build (`npm run ci`). |

## Security model (summary)
- The `photos` storage bucket is **private**; images are served only through
  `/api/photo-url/[photoId]`, which enforces moderation + ownership before
  signing a 60-second URL.
- Row Level Security enforces: single-photo visibility rules, attribute-rating
  privacy, and paid message reading — even against a hostile API client.
- Messages can only be created through the `send_message` RPC, which checks
  entitlements and burns credits atomically. Direct inserts are revoked.

## Tests
`npm run test:e2e` runs the Playwright mission flow (first time:
`npx playwright install chromium`). It starts the dev server itself and
covers the public pages and consent gating without needing Supabase data.

## Stripe setup (Phase 3)
1. Create 5 Prices in Stripe, all in USD: $1.99 one-off (single message),
   $1.99 one-off (inbox pass), $1.99 one-off (gender-split reveal),
   $7.99/month, $59/year — put their ids in `.env.local` (see `.env.example`).
2. Webhook endpoint: `POST /api/stripe/webhook`, events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Locally:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Enable the Customer Portal once in Stripe Dashboard → Settings → Billing.

## Email notifications
Transactional emails (photo in review / photo approved / rating
milestones 1-3-5-10) are sent through Resend's HTTP API — no SDK.
Set `RESEND_API_KEY` and a verified `EMAIL_FROM` in the environment;
without them, sends are logged and skipped, and no user flow is ever
blocked by email problems.

## Moderation & admin
- Every photo starts `pending` and is invisible to others until approved.
- Make yourself admin (SQL editor):
  `update public.profiles set is_admin = true where username = 'you';`
  then open `/admin` for the pending queue and open reports.
- Every admin decision writes a `moderation_audit` row.
- To automate screening later, implement `PhotoModerationProvider` in
  `lib/moderation/provider.ts` against a vision moderation API.
