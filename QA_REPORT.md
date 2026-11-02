# OmniPost AI — functionality audit

Date: 2026-11-01
Environment: GitHub `yuukirito0812/Omnipost-AI`, Vercel `cz-95a8/omnipost-ai`, existing shared EstateFlow Supabase project.

## Fixed defects

- Workspace tile (“My Brand”) was a non-interactive DIV. Replaced with an accessible button and a functional menu for customization, account management, and calendar.
- Account avatar (“CA”) was a non-interactive DIV. Replaced with a button opening account actions and sign-out.
- AI Gateway model calls failed due to Vercel team credit-card verification. Added direct Google Gemini Free Tier (per-user API key) and disabled Gateway fallback unless explicitly enabled in environment settings.
- Per-user Gemini keys are validated using Google's model API, AES-256-GCM encrypted by the server, and stored in `omnipost_user_ai_settings` under authenticated-user RLS. The key is neither persisted in the browser nor sent back by the settings endpoint.
- Added Gemini settings, a live AI test, an editable result, and a functional “connect AI” action in the sidebar.
- Added permanent media deletion with confirmation and current-user path validation.
- Added click-to-draft calendar dates, preserving the proposed time in a real post draft.
- Menus now close on outside click and Escape. Improved mobile menu sizing and button feedback.
- Fixed outdated AI contract mocks after moving off an admin-only database connection.

## Automated checks

The production build runs `npm test && next build`. Tests include:
- Authenticated assistant request, workspace-context retrieval, draft and plan normalization, malicious/unknown post-ID protection, saved chat history, clearing chat, and unauthenticated request rejection (mocked DB and AI).
- 13 static UI/feature contracts.
- Audit of 72 source button elements, each requiring an explicit click handler or form submit.
- Next.js production compilation and TypeScript type checking.
- Production health endpoint response and Supabase RLS policy inspection.

## Follow-up upgrade — November 1, 2026

- **Gemini connection:** Found zero persisted personal AI key records in the shared Supabase table. Replaced the older model-only/key-list validation with a small *real generation* request. Auto-selects an available text model beginning with `gemini-3.5-flash-lite`; reports explicit formatting, model availability, authentication, rate-limit, or database storage errors next to the key field. A connected account must still supply its Google AI Studio key; no secret was accessed from the user's personal account.
- **Branding:** Added a real SVG favicon / infinity-style OmniPost logo, branded site metadata, sidebar identity, login logo, and “by Carl Vincent Zabala” creator credit in the interface.
- **Platform previews:** Built responsive, content-driven Instagram feed, Facebook feed, TikTok vertical, YouTube video, and X post layouts. They use the draft caption, relevant override, media, account name/avatar when connected, and format notices. **These are high-fidelity approximations, not the platform's live rendering API.** Counts/engagement and actual publishing are not simulated.
- **OAuth onboarding:** Confirmed none of the five platform client IDs/secrets are configured on Vercel; the protected Supabase service key is also absent. The UI now provides provider-specific developer portals, required scopes, exact callback URLs, missing-variable instructions, copy-to-clipboard, and setup rechecks. These are prerequisites; actual social authorization still requires app registrations and permissions.
- **Automated regression:** Vercel's last build passed 23 static feature contracts and 77 button action/submit checks, along with mocked assistant logic and Next.js production compilation.

The status `Developer credentials not configured` cannot legitimately disappear until the account owner creates provider-specific developer applications and configures approved IDs/secrets securely in the deployment. A Gemini API key does not substitute for Meta, Google/YouTube, TikTok, or X OAuth credentials.

## Social login experience — November 2, 2026

- Replaced the previous multi-step managed-social setup and duplicate walkthrough with a premium, responsive, network-by-network login dashboard.
- Each platform's **Connect** button calls `POST /api/managed-social/connect` with the signed-in user's Supabase session, verifies the saved Upload-Post API credential and the selected `username` belongs to that account, and requests an official OAuth URL from Upload-Post's `/api/uploadposts/oauth/{platform}/start`. It redirects only to an HTTPS URL at a vetted network-owned domain.
- On providers or plans that do not allow direct OAuth from the app, it requests a scoped 48-hour hosted authorization link; if that is also unavailable, it opens the official Upload-Post account dashboard without requesting Meta, Google, TikTok or X developer IDs from the user.
- The social login screen can refresh account status after OAuth return, distinguish previously authorized/re-authentication-needed profiles, show the Facebook Page requirement only in the context of **publishing**, and offer provider unlinking only under advanced settings.
- The existing uploaded creator logo and Carl Vincent Zabala credit remain incorporated. The login view adds gradient brand artwork, responsive platform cards, polished connected states, hover/keyboard accessibility and reduced-motion support.
- Added `tests/social-connect.test.cjs` to run automatically in the Vercel build; tests cover direct official login, legitimate provider fallback, account ownership checks and malicious redirects.

**External truth:** The social network must still ask the user to sign in/consent via its own OAuth screen. Accounts are not connected merely because the page loads. Facebook personal profiles may be authenticated, but Facebook Page publishing requires Page ownership; TikTok publishing is unavailable on the Upload-Post free plan. White-label branded provider pages may require a paid plan. This audit does not claim a live OAuth redirect was completed in the user’s browser.

## Studio 2.1 — interface, performance and controls (November 2, 2026)

### Design
- **Daylight by default:** replaces the dark-heavy workspace with off-white surfaces, lavender/peach hero, crisp typography, clearer borders, and higher-contrast content controls. A Dusk switch in the top bar is persisted per browser.
- **Purposeful motion:** orbit and floating elements in the hero; subtle hover/focus transitions on statistics, cards and actions; no animation on a reduced-motion setting.
- **Faster everyday actions:** Ctrl/Cmd+K command menu with keyboard navigation, editable content starters for tips, spotlights, announcements and behind-the-scenes posts, and working CSV export from Content Library.
- **Copy cleanup:** shorter headings, direct button descriptions and more concise social account onboarding.

### Fixes and performance
- Overview and Analytics stats now navigate to real filtered content, social connections or scheduled posts.
- CSV export includes the user's actual visible/filtered posts, uses quoted UTF-8 values and defends against spreadsheet formula injection.
- Removed loading obsolete demo posts/assets from localStorage while checking a real session.
- Supabase auth listeners unsubscribe on unmount; the health request aborts on navigation/unmount.
- Live reads are bounded (250 posts, 100 jobs, 30 native social connections). More records require pagination if the workspace grows beyond that.
- Platform preview imports and the AI/sidebar/social connection views are split into lazy-loaded client chunks. Media previews are memoized; images decode lazily, and videos preload metadata only.
- The persistent publishing warning only appears when the managed social connection has not been configured, avoiding an incorrect claim that all five developer apps are mandatory.
- User-provided Gemini key and official network OAuth/publishing rules are unchanged; this release does not bypass provider approval or free-tier limits.

### Verification
- Vercel `npm run build` executes mocked assistant, Gemini key, social publishing, and OAuth connection contract tests, followed by a static feature/button action scan and Next.js TypeScript production compilation.
- Static handlers are **not the same as browser end-to-end success**. Real live publishing and social-login consent require authenticated user action, so do not claim those third-party flows were fully tested by this audit.

## Known external dependencies — not fake functionality

1. Google Gemini requires a personal key created in Google AI Studio (free tier subject to model availability, quota, and Google's data-use terms). The application cannot obtain another person's API key by itself. End-to-end AI output remains unverified until a signed-in user connects a key and uses Test AI now.
2. Supabase's built-in SMTP email rate limit is shared with EstateFlow. Existing-account password login works without sending new email; reliable magic-link and recovery email delivery requires a custom verified SMTP provider.
3. Facebook, Instagram, TikTok, YouTube and X require their developer apps, provider OAuth approval and appropriate permissions. The account connection UI must not assert these APIs are operational before authorization and a live publish test.
4. Scheduled publishing still needs approved account tokens and a configured worker/cron execution strategy. Provider publishing idempotency and retry behavior must be tested before production client use.
5. Platform engagement/reach analytics is intentionally unavailable without authorized insights APIs; shown local content statistics are real local workspace counts, not invented audience metrics.

## Operational security

- Server-side secret `CREDENTIAL_ENCRYPTION_KEY` is required for personal Gemini key encryption and is already set on Vercel.
- `omnipost_user_ai_settings` has four authenticated-user-only RLS policies for SELECT/INSERT/UPDATE/DELETE.
- `omnipost_social_tokens` and `omnipost_oauth_states` have no browser access policies by design (backend only).
- Do not disable Supabase email confirmation to bypass SMTP limits.
- Never commit social secrets or API credentials to GitHub.

This is a source-code and backend-contract audit. It is not a claim of cross-browser E2E testing or successful posting to external social networks.
