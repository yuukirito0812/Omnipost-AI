# OmniPost AI — Multi-Channel Social Media Manager

A **real, authenticated Next.js application**, with a persistent, context-aware Gemini assistant and adapters for five official social publishing APIs. It is *not* a static HTML demo. **Hosted at https://omnipost-ai-theta.vercel.app**. Private drafts and the encrypted Gemini key connection are configured; live social-account publishing still requires approved developer access and private backend credentials.

## Application features

- Secure email sign-in (Supabase Auth) and per-user isolated content/workspace data.
- Connect Facebook Pages, Instagram Professional profiles, TikTok creator accounts, YouTube channels, and X accounts through each provider's official OAuth login flow; independently select which connected account should receive a post.
- One master post, editable title, caption, per-platform overrides, hashtags, CTA, accessibility alt text, video/image uploads, link, editorial first-comment notes, and synthetic media disclosures.
- Save drafts, send posts to review, schedule for later, publish now, duplicate content, edit, delete, and browse the calendar.
- Media library, automatic per-account job records, publishing failures, explicit unsupported-format notices, limited retry controls, export `.ics` calendar.
- Always-available right-side **Omni AI** chat, minimizable floating bubble, saved conversation history, microphone dictation where supported, real Gemini API inference using each user's own encrypted key, live context from your actual posts/calendar/connected accounts/errors. AI can propose platform-tailored posts, multi-day editorial plans, and reschedules; every write needs an explicit review/confirmation.
- Real posting adapters: Facebook Page text/photos; Instagram Professional image/Reels (processing-sensitive); TikTok video/photo via verified URL ingestion (submission state); YouTube video upload (50 MB per file in this implementation); X text only. **These have not been end-to-end tested with authorized live accounts.** Specific formats and API scopes may require further implementation or platform approval.

## Quick start

Requires Node.js 20+ and npm, an active internet connection, the existing configured Supabase project and your own Google AI Studio API key for live AI.

```bash
npm install
cp .env.example .env.local
# Add your own credentials to .env.local (never commit this file)
npm run dev
```

Open `http://localhost:3000`. Without Supabase configuration the UI shows a clear setup screen (not simulated accounts or sample AI responses). Full step-by-step instructions: **[SETUP.md](SETUP.md)**.

## What AI can and cannot do

The assistant uses `POST /api/assistant` and the Google Gemini API when the signed-in user securely connects their own API key from Settings. Vercel AI Gateway is opt-in only; the application does not require a Vercel credit card for the Gemini Free Tier option. The API verifies the signed-in user through their Supabase session and row-level policies, fetches **their** recent content, schedules, connected account names and publishing statuses, applies rate limiting, validates structured suggestions, and persists conversation to the private database. It never sends a post or changes the schedule until the user confirms in the app.

The AI service receives a bounded subset of workspace content. Obtain clients' consent before including their private information. Keys and OAuth tokens are stored server-side; platform credentials are encrypted before database storage. The AI does **not** receive your passwords or OAuth secrets.

## Free Gemini AI — no Vercel credit card required

1. Sign in to https://omnipost-ai-theta.vercel.app (existing Supabase password or email link).
2. Get an API key from https://aistudio.google.com/api-keys using a Google account with Free Tier access.
3. Open **Settings → AI connection**, enter the key and click **Connect Gemini**. OmniPost verifies it with Google and encrypts it using the server-side `CREDENTIAL_ENCRYPTION_KEY` before writing it to a user-owned Supabase row. The key is never returned to the browser.
4. Click **Test AI now**, or open the persistent sidebar and ask it for a draft. Google free-tier model access and rate limits vary; Google may use free-tier content to improve its products. Avoid including private client information without permission.

You do **not** need to add a card to Vercel or store an AI key in GitHub. The original Vercel AI Gateway path is disabled by default; it can be explicitly enabled with `AI_GATEWAY_ENABLED=true` if your team has an eligible paid/verified account. Without a valid personal or server key, OmniPost does **not** fake an AI response.

## Interface and validation

The top-right account avatar opens a profile menu (settings, content, AI, sign-out). The My Brand tile opens workspace shortcuts and customization. Content calendar dates can start a draft; media assets can be removed with confirmation. Vercel builds now run `npm test` (AI contract + UI action audit) before compiling, checking the 72 button elements audited in the source.

## Deployment, approvals and limits

- Configure `APP_URL` with the final HTTPS origin before registering OAuth callbacks. Callbacks: `<APP_URL>/api/oauth/callback/facebook`, `/instagram`, `/tiktok`, `/youtube`, `/x`.
- Each platform requires your own developer app with appropriate write permissions; you cannot just supply a username/password. Facebook is Pages only, Instagram Professional accounts only. TikTok unreviewed Direct Post apps may be restricted to private; newly unverified YouTube upload projects may also be restricted to private. X API is paid/usage-based. This code cannot bypass those restrictions.
- Image/media access uses a public-read Supabase Storage bucket because certain provider APIs fetch images from publicly accessible URLs. Never store private documents there.
- Schedule publishing by calling `/api/cron/publish` with `Authorization: Bearer <CRON_SECRET>`. A GitHub Actions 5-minute workflow is included, but can be delayed or skipped. Production reliability needs durable queued workers, reconciliation and idempotent provider callbacks; do not promise precise posting SLAs on the included example scheduler.
- Current media upload is capped at 50 MB. No automatic media transcoding. No Facebook Reels/video adapter, X media adapter, or engagement insights API yet. Instagram/TikTok video processing status may need follow-up reconciliation.
- A generated caption or a submitted TikTok job is **not proof** of a successfully published post. Per-account status and errors are reported separately.

## Repository layout

- `app/page.tsx` — dashboard, composer, calendar, media assets, account selection, publishing activity, settings.
- `components/AssistantPanel.tsx` — persistent AI chat and proposed-action approval controls.
- `app/api/assistant/route.ts` — authenticated Gemini assistant, workspace context, conversation history.
- `app/api/ai/route.ts` — direct one-shot content generation.
- `app/api/posts/route.ts` — post creation, editing, deletion.
- `app/api/oauth/` — official provider authorization start/callback.
- `lib/oauth.ts`, `lib/publish.ts` — OAuth and provider publishing implementations.
- `app/api/jobs/retry` and `app/api/cron/publish` — queue retry and schedule execution.
- `db/schema.sql` — new database, RLS, storage, and AI chat tables.
- `db/migrations/002_ai_messages.sql` — add chat table to an existing earlier OmniPost database.
- `tests/assistant.test.cjs` — standalone contract test with mocked AI/database (run `npm test`).

## Verification status

The app's TypeScript source and CSS were parsed; AI API mock tests passed. This environment cannot fetch npm packages (`registry.npmjs.org` DNS unavailable), so a full Next.js build or real API publishing test **could not be completed here**. Run `npm run check` after installing dependencies. Do not mark channels as live/connected until OAuth and a test publish have been verified.

## Shared Supabase project configuration (2026-11-01)

This build uses the existing EstateFlow Supabase project, but **only** the `public.omnipost_*` tables and `omnipost-media` storage bucket. Source code and schema have been renamed to avoid cross-app collisions. Auth/users, quotas, and infrastructure are still shared.

Use `db/schema.sql` exactly once for this isolated install; do not run the old schema from OmniPost ZIP versions. This does not modify EstateFlow `public.workspaces` or PESOBASE tables. The AI sidebar now supports a user's own Gemini Free Tier API key, validated with Google and encrypted in the user-scoped `omnipost_user_ai_settings` table. This avoids the Vercel AI Gateway card requirement. A Supabase service-role key is **not** required for AI or private drafts. The service-role key, cron secret, encryption key, and platform OAuth credentials are still required for protected social publishing; store them only in Vercel, never in GitHub.
