# Hastrekha AI

AI palm reading rooted in Samudrika Shastra. Upload a palm, get a reading, chat with the astrologer.
Built from [PRD.md](PRD.md) and the Google Stitch "Temple Heritage" designs.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Auth, Postgres + RLS, Storage) · OpenAI (vision + streaming chat) · Razorpay · Vercel

## Screens

| Route | What it does |
| --- | --- |
| `/login` | Google OAuth, phone OTP (+91, 6-digit, 30 s resend), consent checkbox, optional email magic link |
| `/upload` | Details form (prefilled), camera/gallery/drag-drop, HEIC → JPEG, resize to 1568 px, loading mandala |
| `/reading/[id]` | Zoomable palm, 4 prediction cards, PDF download, WhatsApp share card, streaming chat widget |
| My Readings panel · Payment modal | Slide-out history with delete; Razorpay Checkout for ₹99 |
| `/terms` `/privacy` `/refund` | Legal pages required for Razorpay activation |

## Server routes

| Route | Purpose |
| --- | --- |
| `POST /api/reading` | Validates details (18+), rate limit 5/h, AI read → Zod check (retry once) → rejects unclear photos **without** using a credit → stores image + reading and consumes the credit atomically (`create_reading_with_credit`) |
| `POST /api/chat` | Rate limit 30/h, decrements the question + stores it in one transaction (`use_question`), streams the answer, refunds the question if the AI fails |
| `POST /api/payments/order` · `verify` · `webhook` | Razorpay order, HMAC-verified checkout success, webhook (`payment.captured`, `payment.failed`, refunds). All idempotent |
| `POST /api/auth/otp` | Sends SMS OTP with 5/phone/hour limit |
| `DELETE /api/readings/[id]` · `DELETE /api/account` | Permanent deletion (payments kept, anonymised) |

## Database

Schema lives in `supabase/migrations/`. Highlights:

- RLS on every table; the browser can only **select** its own rows. All credit/question/payment writes go through `SECURITY DEFINER` functions executable only by the service role.
- Signup trigger grants 1 free credit, unless the (hashed) phone/email has already received one.
- Private `palms` bucket, path `{user_id}/{reading_id}.jpg`, served via 60-minute signed URLs.
- Admin stats: `select * from admin.daily_stats;` in the Supabase SQL editor (signups, readings, payments, revenue, AI tokens per day).

## Local development

```bash
cp .env.example .env.local   # then fill in the secrets
npm install
npm run dev
```

## Environment variables

See `.env.example`. Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RAZORPAY_*`) must only be set in `.env.local` and Vercel project settings — never committed.

## One-time dashboard setup

1. **Supabase → Authentication → URL configuration:** Site URL = production URL; add `http://localhost:3000/**` and `https://<your-vercel-domain>/**` to Redirect URLs.
2. **Supabase → Authentication → Providers → Google:** add the Google OAuth client ID/secret (Google Cloud console redirect URI: `https://ahxabfwpsotbrquwzrju.supabase.co/auth/v1/callback`).
3. **Supabase → Authentication → Providers → Phone:** enable and configure Twilio / MSG91 (or another SMS provider).
4. **Razorpay → Settings → Webhooks:** URL `https://<your-domain>/api/payments/webhook`, events `payment.captured`, `payment.failed`, `refund.processed`; copy the secret into `RAZORPAY_WEBHOOK_SECRET`.
