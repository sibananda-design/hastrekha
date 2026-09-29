<!-- Converted from "Hastrekha AI – Palm Reading App PRD.docx". Note: v1 uses OpenAI instead of the Claude API described below. -->

# Hastrekha AI – Palm Reading App PRD

Sep 29, 2026 · @Shiva

## Overview

Hastrekha AI (working name) is a 3-screen web app where a user uploads a palm photo, gets an AI palmistry reading rooted in Indian Samudrika Shastra, and chats with an AI astrologer about it. Every new user gets 1 free reading and 1 free chat question; after that, each reading costs ₹99 via Razorpay.

Problem. Palm readers are hard to access, inconsistent, and rarely allow follow-up questions. Users want a quick, private, personalised reading they can explore at their own pace.

Goals for v1

- Ship a working app on Vercel with Google and Phone OTP login, palm upload, AI reading and capped chat.

- Convert free users to paid: target 8% of free users buy at least one ₹99 reading within 7 days.

- Deliver a reading in under 20 seconds from clicking "Predict my future".

Non-goals for v1

- Hindi or regional languages (English only).

- Native mobile apps (responsive web only).

- Horoscope charts (kundli), human astrologers, or monthly subscriptions.

## Target users

The core user is an Indian adult, 20–45, on a smartphone, curious about astrology and comfortable paying by UPI.

Persona

Who

What they want

What converts them

Curious Priya

24, working professional, Pune

A fun, quick read of love and career

Accurate-feeling free reading, easy UPI pay

Worried Rakesh

38, small business owner, Lucknow

Guidance on money and family decisions

Specific, respectful answers in chat

Gifting Anjali

30, homemaker, Chennai

Readings for family members

Easy repeat purchase at ₹99 each

## User flow

A user logs in, uploads a palm, gets a reading, and chats; payment appears only when credits or questions run out.

user flow · login to reading to chat, with payment gates

A rejected photo sends the user back to upload without using a credit; each chat answer uses 1 question until the reading's allowance (1 free, 10 paid) is gone.

## Screen requirements

The app has three screens plus a slide-out "My Readings" panel and a payment modal; no other pages in v1.

### Screen 1 – Login (/login)

- Brand logo, tagline ("Your palm, your path"), and a short 3-point value strip: upload, get reading, ask questions.

- "Continue with Google" button (Supabase Google OAuth).

- "Continue with Phone" – +91 prefilled, 10-digit input, "Send OTP", 6-digit OTP entry, 30-second resend timer.

- Checkbox: "I agree to the Terms and understand readings are for entertainment" – required to continue.

- On first login, create a profile row with 1 free reading credit and 1 free chat question.

- Returning users with a completed profile skip straight to Screen 2.

- Errors: invalid OTP, expired OTP, OAuth cancelled – each shows an inline message, never a blank screen.

### Screen 2 – Upload palm (/upload)

- Header: logo, credits badge ("1 free reading" or "0 readings – ₹99"), "My Readings", profile menu with logout.

- Details form: Name, Date of birth (date picker), Gender (Male / Female / Other / Prefer not to say), Hand (Left / Right). Prefilled from the last reading.

- Upload zone: drag-and-drop or tap to use camera / gallery. JPG, PNG, HEIC; max 10 MB.

- Photo guide with 3 tips: open palm, good light, whole hand in frame. Show a sample illustration.

- Preview with Retake / Remove.

- Image quality check by the AI before charging: if no palm is detected or the photo is too blurry, show "Please upload a clearer palm photo" and do NOT consume a credit.

- "Predict my future" button – enabled only when all fields and the photo are valid. If the user has 0 credits, it opens the payment modal first.

- Loading state (10–20 s): animated diya or mandala with rotating messages ("Reading your heart line…").

### Screen 3 – Predictions and chat (/reading/[id])

- Two-column layout on desktop: left = uploaded palm image (zoomable) with name, DOB, hand; right = prediction cards. On mobile: image on top, cards below.

- Prediction cards, in order:

- Palm lines: Heart, Head, Life, Fate – each with a 2–3 line meaning.

- Life areas: Career, Love and marriage, Health, Wealth – each with a short prediction.

- Mounts and traits: key planetary mounts (Jupiter, Saturn, Sun, Mercury, Venus, Moon, Mars) and 3–5 personality traits.

- Remedies and lucky items: lucky colour, number, day, gemstone, and 2–3 simple remedies.

- Actions: "Download as PDF", "Share" (image card to WhatsApp), "New reading".

- Chat widget, bottom-right: floating button opens a chat panel (full-screen sheet on mobile).

- Shows remaining questions: "1 free question" or "7 of 10 questions left".

- 3 suggested starter questions ("When will I get married?", "Is this a good year for a job change?", "How can I improve my health?").

- AI answers use the reading and the user's details as context.

- When questions run out, the input greys out and shows "Unlock a new reading with 10 questions for ₹99" with a Pay button.

- Disclaimer footer on every reading: for entertainment and self-reflection; not medical, legal or financial advice.

### My Readings panel

- Slide-out list of past readings: date, thumbnail, name, hand, questions used.

- Tapping one opens its Screen 3 in read-only chat mode if its questions are used up.

- Delete a reading (removes image and text permanently, with confirmation).

### Payment modal

- Shows what ₹99 buys: 1 new reading + 10 chat questions.

- Opens Razorpay Checkout (UPI, cards, net banking, wallets).

- On success: credit added, user returns to where they were. On failure or cancel: friendly retry message, no credit change.

## Pricing and entitlements

Pricing is pay-per-use: 1 free reading with 1 chat question on signup, then ₹99 per reading with 10 chat questions.

Tier

Price

Readings

Chat questions per reading

When granted

Free

₹0

1

1

Once per account, on first login

Paid

₹99 (incl. GST)

1 per purchase

10

On verified Razorpay payment

Rules

- One reading credit is consumed only when a reading is successfully generated. Failed AI calls or rejected photos refund the credit automatically.

- Chat questions belong to a reading, not the account. Unused questions stay on that reading forever.

- Credits are granted only by the server after verifying the Razorpay signature (webhook payment.captured), never by the browser.

- Anti-abuse on the free tier: one free credit per Google account and per phone number; if the same phone is linked to a second Google account, no second free credit.

- Refunds are handled manually via Razorpay dashboard in v1; a refunded payment removes an unused credit.

- Invoices: Razorpay payment receipt emailed to the user; GST handling to be confirmed with an accountant.

## AI design

The Claude API does two jobs: read the palm image into a structured JSON reading, then answer chat questions grounded in that reading. Use a vision-capable Claude model (for example claude-sonnet-5-5); all calls run server-side so the API key never reaches the browser.

### Step 1 – Palm validation and reading

One call with the image, name, DOB, gender and hand. The system prompt tells Claude to act as an expert in Indian palmistry (Samudrika Shastra), stay warm and positive, avoid fear-based predictions, and never predict death, serious illness or specific dates of disasters. It must return JSON only:

{  "is_valid_palm": true,  "quality_issue": null,  "summary": "2-3 sentence overview",  "lines": { "heart": "", "head": "", "life": "", "fate": "" },  "life_areas": { "career": "", "love_marriage": "", "health": "", "wealth": "" },  "mounts": [ { "name": "Jupiter", "strength": "prominent", "meaning": "" } ],  "traits": [ "" ],  "remedies": {    "lucky_colour": "", "lucky_number": 0, "lucky_day": "", "gemstone": "",    "simple_remedies": [ "" ]  },  "zodiac_sign": "derived from DOB"}

If is_valid_palm is false, the server returns quality_issue to the UI and does not consume a credit. The server validates the JSON against a schema (Zod) and retries once on malformed output.

### Step 2 – Chat

- Each message sends: system prompt (astrologer persona + safety rules), the stored reading JSON, the user's details, the last 10 messages, and the new question.

- Answers: 80–150 words, warm, in simple English, tied back to specific lines or mounts.

- Stream the answer to the UI for a fast first word.

- The server decrements questions_remaining in the same database transaction that stores the question; a question is refunded if the AI call fails.

- Off-topic or harmful questions (medical diagnosis, self-harm, legal, investment tips) get a gentle redirect plus a suggestion to consult a professional; these still count as a question.

### Cost guardrails

- Resize images to max 1568 px on the long edge before sending.

- Cap chat answers at about 400 output tokens.

- Log token usage per reading in the database to track cost against the ₹99 price.

## Tech stack and architecture

Next.js on Vercel serves the UI and four server routes; Supabase handles auth, data and images; Claude reads palms and chats; Razorpay takes payments.

Layer

Choice

Frontend

Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, designed first in Google Stitch

Auth

Supabase Auth: Google OAuth + Phone OTP (SMS via Twilio or MSG91)

Database and files

Supabase Postgres with RLS; Supabase Storage (private bucket)

AI

Claude API (Anthropic TypeScript SDK), vision model for reading, streaming for chat

Payments

Razorpay Orders API + Checkout.js + webhooks

Hosting and CI

Vercel (preview per pull request, production on main), GitHub for version control

Build tool

Claude Code, working from this PRD saved as PRD.md in the repo

architecture · browser, Vercel routes, Supabase, Claude, Razorpay

The browser only signs in, reads its own rows, and opens Razorpay Checkout; every credit change, AI call and payment verification happens in a server route with secret keys held in Vercel env vars.

## Data model and security

Four Supabase tables, each protected by Row Level Security so a user can only ever read their own rows; palm images live in a private Storage bucket.

Table

Key columns

Notes

profiles

id (= auth.users.id), full_name, phone, email, dob, gender, free_credit_used (bool), reading_credits (int), created_at

Created by a trigger on signup with reading_credits = 1

readings

id, user_id, image_path, name, dob, gender, hand, result_json (jsonb), is_free (bool), questions_total (1 or 10), questions_remaining, input_tokens, output_tokens, created_at

One row per generated reading

chat_messages

id, reading_id, user_id, role (user / assistant), content, created_at

Ordered by created_at

payments

id, user_id, razorpay_order_id, razorpay_payment_id, amount_paise (9900), status (created / captured / failed / refunded), created_at

Written only by server routes and the webhook

Storage

- Bucket palms (private). Path: {user_id}/{reading_id}.jpg.

- Images are shown via short-lived signed URLs (60 minutes).

- Images are kept with the reading until the user deletes the reading or their account.

Security rules

- RLS on all tables: user_id = auth.uid() for select; inserts and updates to credits, questions and payments only via server code using the service-role key.

- Service-role key, Claude API key and Razorpay secret stored only in Vercel environment variables, never in client code or GitHub.

- Razorpay webhook verifies the X-Razorpay-Signature header before granting credit; idempotent on razorpay_payment_id.

- Rate limits: 5 readings per user per hour, 30 chat messages per user per hour, 5 OTP requests per phone per hour.

- Account deletion: a "Delete my account" option in the profile menu removes profile, readings, messages and images (payments kept for tax records, anonymised).

- Privacy policy states palm images are biometric-like personal data, processed by Anthropic's API for the reading, and not used for anything else. Align with India's DPDP Act 2023 consent requirements.

## Quality, legal, metrics and build plan

The app must feel fast on a mid-range Android phone on 4G, carry clear entertainment disclaimers, and ship in six build phases.

### Non-functional requirements

- Performance: Login and Upload pages load in under 2.5 s on 4G (Lighthouse mobile score 85+). Reading in under 20 s; first chat token in under 3 s.

- Responsive: works from 360 px phones to desktop; the chat is a bottom sheet on mobile.

- Accessibility: WCAG AA contrast, all buttons labelled, keyboard usable, text at least 16 px.

- Reliability: every AI or payment failure shows a friendly message and never loses a credit.

- Observability: Vercel logs plus a simple admin SQL view of signups, readings, payments and AI cost per day.

### Legal and trust

- Terms of Service, Privacy Policy and Refund Policy pages (required by Razorpay for account activation).

- Disclaimer on Login, Reading and Chat: readings are for entertainment and self-reflection only.

- Users must be 18+ (checked from DOB; under-18 DOB blocks the reading).

### Success metrics (first 60 days)

Metric

Target

Signup to first reading completed

70%

Free users who ask their free chat question

60%

Free to paid conversion within 7 days

8%

Repeat purchase within 30 days (of paying users)

25%

Reading generation success rate

97%

Average AI cost per paid reading

under ₹15

### Build plan for Claude Code

- Setup: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui repo on GitHub, linked to Vercel; Supabase project; env vars.

- Auth: Google OAuth and Phone OTP (SMS provider such as Twilio or MSG91 configured in Supabase), profile trigger, protected routes.

- Upload: details form, image upload to Storage, client-side resize, validation.

- Reading: /api/reading route calling Claude, JSON schema check, credit logic, Screen 3 cards.

- Chat: /api/chat streaming route, question counter, greyed-out state.

- Payments and polish: Razorpay order + checkout + webhook, My Readings panel, PDF download, legal pages, error states, launch.

### Open questions

- Final brand name and domain.

- SMS provider choice for OTP and its per-SMS cost.

- GST registration and whether ₹99 is inclusive of GST.

## Appendix – Google Stitch prompt

Paste the prompt below into Google Stitch (web app mode). Generate the three screens first, then ask for the panel and modal as follow-ups if Stitch drops them.

Design a responsive web app called "Hastrekha AI" – an AI palm reading app rooted in Indian palmistry (Samudrika Shastra). Audience: Indian adults 20–45, mostly on smartphones. Language: English. Design mobile-first (360px) and also show the desktop layout (1440px).VISUAL STYLE – "Temple Heritage", LIGHT theme:- Background: warm sandstone/ivory (#FBF6EE), cards in soft cream (#FFFDF8) with thin brass borders.- Primary: deep maroon (#7A1F2B) for buttons and headings. Accent: antique brass/gold (#B8893B). Secondary: soft terracotta (#C8643B). Text: dark brown-charcoal (#2B2320).- Subtle rangoli/kolam line patterns on page edges and card corners, a faint mandala behind the hero, temple-arch (gopuram-inspired) shapes for image frames. Keep ornaments light and never behind body text.- Typography: an elegant serif with Indian character for headings (e.g. "Yatra One" or "Tiro Devanagari Latin" style), clean sans-serif for body (e.g. "Poppins" or "Mukta"), body text 16px minimum.- Rounded corners 12px, generous whitespace, soft shadows only. Icons: simple line icons; use a diya, lotus and palm motif for brand touches.- Must feel trustworthy, calm and premium – not cluttered or superstitious. Easy to navigate with one clear primary action per screen.SCREEN 1 – LOGIN- Centered card over sandstone background with rangoli border.- Logo (palm inside a lotus), app name, tagline "Your palm, your path".- Three small steps with icons: Upload your palm → Get your reading → Ask the astrologer.- Button "Continue with Google" (white with Google icon).- Divider "or".- Phone login: +91 prefix field, 10-digit number, maroon "Send OTP" button; show the OTP state with 6 boxes and a "Resend in 30s" timer.- Checkbox: "I agree to the Terms and understand readings are for entertainment."- Small badge: "First reading free".SCREEN 2 – UPLOAD PALM- Top bar: logo left; right side a credits chip ("1 free reading"), "My Readings" link, profile avatar menu.- Heading "Let us read your palm".- Details card: Name, Date of birth (date picker), Gender (segmented: Male / Female / Other / Prefer not to say), Hand (toggle with left/right hand icons).- Large upload zone framed like a temple arch: dashed brass border, palm outline illustration, "Tap to take a photo or upload" with Camera and Gallery buttons. Show file limits (JPG, PNG, HEIC, max 10 MB).- Photo tips row with 3 icons: Open palm, Good light, Whole hand in frame.- After upload: preview thumbnail with Retake and Remove.- Full-width maroon primary button "Predict my future" with a small diya icon.- Also design the loading state: a slowly rotating mandala/diya with messages like "Reading your heart line…".SCREEN 3 – PREDICTIONS AND CHAT- Desktop: two columns. Left (40%): the uploaded palm image in an arched brass frame, zoom icon, and a small info card (Name, DOB, Zodiac sign, Hand). Right (60%): scrollable prediction cards.- Mobile: image on top, cards below.- Top summary card: 2–3 line overview of the reading.- Card 1 "Palm Lines": four rows – Heart, Head, Life, Fate line – each with a small line icon and 2 lines of text.- Card 2 "Life Areas": 2x2 grid – Career, Love & Marriage, Health, Wealth – each with an icon and short prediction.- Card 3 "Mounts & Traits": planetary mount chips (Jupiter, Saturn, Sun, Mercury, Venus, Moon, Mars) with strength labels, plus personality trait tags.- Card 4 "Remedies & Lucky Items": lucky colour swatch, lucky number, lucky day, gemstone, and 2–3 simple remedies.- Action row: "Download PDF", "Share on WhatsApp", "New reading".- Disclaimer footer: "For entertainment and self-reflection only."- Chat: floating round maroon button bottom-right with a lotus/chat icon labelled "Ask the Astrologer". Open state: panel (desktop 380px wide) or full-screen bottom sheet (mobile) with header, a counter chip "1 free question" or "7 of 10 questions left", 3 suggested question chips, message bubbles (user in maroon, astrologer in cream with brass border), and an input with send button.- Also show the LOCKED chat state: input greyed out, message "You've used your free question", card "Unlock a new reading + 10 questions for ₹99" with a brass "Pay ₹99" button.EXTRA COMPONENTS- "My Readings" slide-out panel: list of past readings with thumbnail, name, date, hand, questions used, and a delete icon.- Payment modal: what ₹99 includes (1 reading + 10 questions), UPI / card icons, maroon "Pay ₹99 securely" button, "Powered by Razorpay" note.- Friendly error states: blurry photo, payment failed, network error.