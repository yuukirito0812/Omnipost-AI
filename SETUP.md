# OmniPost AI — Make it live

## 1. Install and run

1. Install **Node.js 20 or later**, and VS Code if you want an editor.
2. Extract the ZIP. Open the inner `omnipost-ai` folder (the one with `package.json`).
3. In a terminal, run `npm install` then `npm run dev`.
4. Visit http://localhost:3000. The first screen reports missing backend setup rather than inventing a connection.

**If `npm` is not recognized**, install Node.js and restart the terminal. If you see `EAI_AGAIN`, check internet/DNS or firewall; that's a connection to npm registry issue, not proof that the source code is broken. If you see a framework compile error, keep the full terminal output for diagnosis.

## 2. Supabase database and authentication

1. Use the existing **EstateFlow** Supabase project with isolated `omnipost_` tables and `omnipost-media` storage. Do not run any generic/legacy OmniPost schema.
2. In the SQL editor, run all of `db/schema.sql` (fresh project). This shared-project version creates all required tables in one script. Do not run the legacy migration.
3. Find the Supabase Project URL, publishable/anon key, and service-role/secret key in Supabase's project settings. Never put the service-role key into browser code.
4. In Auth > URL Configuration, set the local or deployed site URL and permitted redirect URLs. Enable email sign-in.
5. Create `.env.local` from `.env.example` (do not commit `.env.local`), and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
6. Generate `CREDENTIAL_ENCRYPTION_KEY` with `openssl rand -hex 32` or another cryptographically secure 32-byte random key as **64 hexadecimal characters**. Also set a separate, strong `CRON_SECRET`.
7. Restart `npm run dev`; sign in using your email.

## 3. Enable the real AI sidebar

1. Create an API key in Google AI Studio and use a Gemini model that your account can access.
2. Set `GEMINI_API_KEY` on your server (and `GEMINI_MODEL` if desired).
3. Restart. Open the right sidebar and ask: "What posts are currently scheduled?" or "Draft one post for TikTok, Instagram, Facebook, YouTube, and X."
4. Use **Apply to composer** to review a generated post; **Save all as drafts** stores AI plans in the real database; **Confirm reschedule** applies a proposed change to an existing eligible post.

Gemini may have a free quota depending on available account tier; after that API calls may cost money. Don't enter the key inside the chat window. Microphone dictation uses supported browser speech recognition and browser microphone permission.

## 4. Connect social accounts

Each platform needs a developer application and appropriate permissions. Set its client ID and secret in `.env.local`, register **exact** callback URL, then in OmniPost open **Social accounts > Connect**. You sign in yourself on the platform's own screen. The app encrypts the returned tokens. Repeat for every platform.

| Platform | Required approach |
|---|---|
| Facebook | Meta developer app; `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`; connect a Page. |
| Instagram | Instagram Login for Professional Business/Creator accounts; `instagram_business_basic`, `instagram_business_content_publish`. |
| TikTok | Login Kit + Content Posting API, approved `video.publish`, URL-domain verification and Direct Post audit for public posts. |
| YouTube | Google OAuth app + YouTube Data API, upload scope, required consent/verification; video content only. |
| X | X developer app, OAuth2 write permission and paid API usage; text only in this version. |

You may be able to test some providers before public app review, but don't assume public posting works. API approval depends on each provider and account.

## 5. Deploy and schedule

1. Push this project to your **new** GitHub repository (do not include `.env.local`).
2. Import the repo into a **new** Vercel project; set the same environment variables in project settings for the relevant environments. Set `APP_URL=https://YOUR-OMNIPOST-DOMAIN`.
3. Reconfigure each OAuth app's callback URLs for the new HTTPS origin.
4. Set GitHub repo secrets `OMNIPOST_URL=https://YOUR-OMNIPOST-DOMAIN` and `OMNIPOST_CRON_SECRET` to the same value as `CRON_SECRET`. Enable scheduled workflows in GitHub Actions.
5. Test on your own eligible accounts with a non-sensitive post before adding clients or scheduling high-volume content.

The included GitHub Action triggers approximately every 5 minutes but GitHub can delay or drop a run. For time-critical or high-volume usage use a dedicated durable scheduler.

## 6. Safety and production checks

- Test each provider separately; remove unused OAuth permissions.
- Make terms/privacy policy and account deletion accessible before inviting external clients.
- Review AI facts, especially real-estate claims, marketing disclosures, and synthetic media labels.
- Store OAuth secrets only in environment secret managers; rotate if exposed.
- `npm run check` runs TypeScript checks and AI API contract tests.
- Check provider status records; `submitted` is not necessarily `published`.
