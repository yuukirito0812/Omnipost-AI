# OmniPost AI — Live deployment setup

## Current hosted project

- Website: https://omnipost-ai-theta.vercel.app
- GitHub: https://github.com/yuukirito0812/Omnipost-AI
- Vercel: https://vercel.com/cz-95a8/omnipost-ai
- Database: existing EstateFlow Supabase project, using isolated `public.omnipost_*` tables and the `omnipost-media` storage bucket.
- **Do not create a new Supabase project or rerun `db/schema.sql`.** The current database migrations have already been applied.

## Available now

- Email authentication using existing Supabase Auth (with the deployed app added to allowed redirect URLs by the account owner).
- Private per-user drafts, document/media uploads (50 MB limit), and content planning.
- AI Gateway integration for the Omni AI sidebar and AI Content Studio via Vercel OIDC and the configured free-priced `AI_GATEWAY_MODEL`. The assistant uses the signed-in user's Supabase row-level access to read context and save chat history, so a service-role key is **not** needed for AI.
- Vercel AI Gateway usage can still require team verification and free credit eligibility. If the assistant reports an access or credit error, check https://vercel.com/cz-95a8/~/ai-gateway . No paid subscription or balance top-up was enabled automatically.

## Social account connection and automatic publishing

The social publishing integration **is not yet live**. To enable it, the owner must:
1. Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel's encrypted/sensitive environment variables. Never place it in GitHub or send it in chat.
2. Register developer applications with Facebook/Instagram (Meta), YouTube (Google), TikTok, and X. Add each approved client ID and secret in Vercel and register callbacks from `APP_URL`. Exact scopes and API approval depend on each platform.
3. Authorize each social account through its own official sign-in screen in OmniPost; never enter social passwords in OmniPost.
4. Configure and test a reliable scheduler to invoke `/api/cron/publish` with the existing protected `CRON_SECRET`, plus retry/idempotency controls. A GitHub Actions schedule is included, but not verified live.
5. Run a small private test post for each eligible platform and verify status on the actual social network. No platform is currently marked connected.

## Important security notes

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe. Keep `SUPABASE_SERVICE_ROLE_KEY`, social provider secrets, OAuth access tokens, `CRON_SECRET`, and `CREDENTIAL_ENCRYPTION_KEY` strictly server-side. The Google/Gemini direct API integration is no longer required for Omni AI because the app now uses Vercel AI Gateway.

**The health endpoint at** `/api/health` **reports configuration readiness, not proof that a model response or social post completed.** Confirm functionality by signing in and testing a chat response.

## Local development

Node 22+ is recommended. Run `npm install`, create an uncommitted `.env.local` with the app's Supabase URL and publishable/anon key, and `npm run dev`. Local AI Gateway OIDC requires linking the project with Vercel CLI and pulling development env settings, or running `vercel dev`.
