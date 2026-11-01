# OmniPost AI — Live deployment setup

## Email login rate limits

OmniPost uses Supabase Auth from the **existing EstateFlow project**. The built-in SMTP provider is rate-limited across the entire project, not per website. If the login form reports `AuthApiError: email rate limit exceeded`, additional magic-link requests cannot be delivered until the quota resets.

- Use a link already delivered, if still valid.
- If your account already has a password, switch to **Password** sign-in; it does not send an email.
- Once signed in via an email link, open **Settings > Set or change your account password** to avoid relying on repeated email links.
- For production sign-in emails, configure a legitimate custom SMTP provider in [Supabase > Authentication > SMTP Settings](https://supabase.com/dashboard/project/fcwrcxywakrwkixvewoq/auth/smtp). Verify the sender and adjust the project-wide sending rate in [Authentication > Rate Limits](https://supabase.com/dashboard/project/fcwrcxywakrwkixvewoq/auth/rate-limits).
- **Keep Confirm email on.** Disabling verification would compromise account ownership for both OmniPost and EstateFlow.

Do not paste SMTP credentials or passwords into GitHub, ChatGPT messages, or frontend environment variables. Custom SMTP requires a verified email sender and credentials from the provider. Because Supabase Auth is shared, any SMTP change also applies to EstateFlow.

## Current hosted project

- Website: https://omnipost-ai-theta.vercel.app
- GitHub: https://github.com/yuukirito0812/Omnipost-AI
- Vercel: https://vercel.com/cz-95a8/omnipost-ai
- Database: existing EstateFlow Supabase project, using isolated `public.omnipost_*` tables and the `omnipost-media` storage bucket.
- **Do not create a new Supabase project or rerun `db/schema.sql`.** The current database migrations have already been applied.

## Available now

- Email authentication using existing Supabase Auth (with the deployed app added to allowed redirect URLs by the account owner).
- Private per-user drafts, document/media uploads (50 MB limit), and content planning.
- Free Gemini API connection inside **Settings → AI connection**. The key is validated with Google and encrypted on the server before being saved to a per-user Supabase row; no Vercel billing card is required for eligible free-tier model use. You can test a live response via **Test AI now**.
- Interactive account and workspace menus, date-to-draft calendar shortcuts, and media deletion with confirmation.
- Automated source and mocked-AI tests are included in the Vercel production build. Real signed-in browser flows and platform publishing must still be tested with authorized accounts.

## Connect AI without Vercel billing

1. Create a key for a Free Tier project at https://aistudio.google.com/api-keys. No paid tier is required for models that offer Free Tier availability.
2. In OmniPost **Settings**, paste the key into **AI connection** and press **Connect Gemini**.
3. OmniPost validates it and encrypts the key under the project's already configured `CREDENTIAL_ENCRYPTION_KEY`. Your plaintext key is not stored in the browser, committed to GitHub, or returned by the settings endpoint.
4. Press **Test AI now** to verify actual generation or ask the sidebar to draft a post.
5. Gemini free tier is rate-limited, and free-tier data may be used to improve Google products. Do not include confidential client information without consent.

Vercel AI Gateway remains opt-in for teams with eligible billing; it is disabled by default so its credit-card error no longer blocks OmniPost's Gemini route.


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
