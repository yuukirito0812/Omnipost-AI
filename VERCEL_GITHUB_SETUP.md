# OmniPost AI — GitHub / Vercel / Supabase deployment handoff

## Existing Vercel project
- Project name: `omnipost-ai`
- Team: `CZ` (`cz-95a8`)
- Project ID: `prj_QIkI9e49Pz08cXYfOFbDkGMhTvwb`
- Framework: Next.js
- Node.js: 22.x
- Status: Created; no deployment attached yet.

## GitHub
1. Create a new **empty** private repo called `omnipost-ai` at https://github.com/new.
2. Upload the files from the **inner** `omnipost-ai` source folder into the repository **root** (where `package.json` is). Do not upload the enclosing ZIP as a lone file.
3. Never commit `.env`, `.env.local`, `.env.production`, tokens, or service-role credentials.

## Supabase
The connected account already contains active projects `EstateFlow` and `PESOBASE Plus`. On Supabase Free there are only two active free projects in total. Select **one** path before setting up the database:
- Upgrade/allow a new dedicated OmniPost project (cost confirmation may apply).
- With explicit approval, adapt OmniPost SQL tables to safely share an existing project's database using `omnipost_` prefixes and ownership-based security; do not run the unmodified `db/schema.sql` blindly against an existing app.

## Vercel
1. Connect the new GitHub repo to the existing Vercel `omnipost-ai` project.
2. Add the environment variables shown in `.env.example` from Vercel project settings (never in GitHub). Supabase keys and Gemini keys must be stored only as environment secrets where appropriate.
3. Set `APP_URL` to the final deployment's HTTPS origin.
4. Deploy, inspect build logs, and configure Supabase Auth site URLs + each provider's exact OAuth callback URL.
5. Add GitHub repository secrets `OMNIPOST_URL` and `OMNIPOST_CRON_SECRET`, matching the deployment URL and the Vercel `CRON_SECRET` respectively, before scheduled publishing can work.
6. Validate account login, assistant, media storage, and publishing with an owned test account on every network. External API review and permissions remain necessary.

## Verification notes
- `node tests/assistant.test.cjs` passed in the preparation environment.
- The Next.js build could not be verified locally: npm registry access returned `EAI_AGAIN`.
- No social login or live posting has been verified.
