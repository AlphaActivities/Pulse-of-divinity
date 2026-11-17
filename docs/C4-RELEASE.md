# C4 implementation and controlled release

Specification: the complete nine-page “C4 Darcy Pulse of Divinity Codex Blueprint” supplied November 17, 2026. Missy commit `232babd` was read as a reference only; its repository, database, and deployments were not changed. The Codex cloud environment configuration was not updated.

## Verified identities and baseline

- Repository: `github.com/AlphaActivities/Pulse-of-divinity`; existing checkout, `main`, no worktree.
- Fetched remote main and baseline: `9ddf130f7fdc605975d2c1008e68fd2cac82c100`. No delta from the blueprint’s inspected version.
- User-confirmed Netlify site: `pulse-of-divinity`, site ID `fedb347d-1c63-46ac-84ce-a7ab19bc5117`; URL `https://pulseofdivinity.com`; published deploy recovery point `6ad7962d6cb1274d02ea622d`. Provider API/deploy-to-SHA association remains unverified.
- Source (remains live): `cozcsqrqoztzuimxnlfr`. Read-only availability request returned HTTP 200 and two records.
- User-confirmed destination: `fxxrkwitncaraotvkyte`, active, “(C4) Darcy Pulse of Divinity”, Business Marketing V2. No authenticated destination inventory or writes were performed.
- Roles approved by user: Darcy `client`, Heber `staff`, Josh `owner`. Read exact identities from approved account settings; never infer new Auth UUIDs from source.
- Baseline: Node 24.22.1, npm 11.9.0; clean tree. `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`, typecheck and Vite build passed. Lint exited 1 with two existing checkout errors: unused `ALLOWED_ORIGINS` and prefer-const `stripePaymentIntentId`. Checkout files remain unchanged.

## Candidate behavior

Public inquiries await an actual committed UUID. The form retains input on failure, uses one stable request key across retries, prevents simultaneous sends, and records conversions only after success. The commission button preselects the commission form. Intake is validated and transactionally deduplicated; database rate windows and email limits apply. Catalog identity and price snapshots come from inventory, not visitor-supplied values. Handoff intake and outbox creation commit together.

Commission brief, quote, approval, deposit record, delivery, and stage are independent from collector follow-up status. PostgreSQL enforces approved-quote requirements, valid staff assignment, project roles, optimistic inventory writes, and audit history. Accepted commissions and completed artwork sales have unique business metrics. These are recorded outcomes, not payment automation. Closed/archived leads are excluded from active attention and follow-up reminders.

Darcy and Josh can edit artwork availability; Heber can view it and work leads, notes, handoffs, and follow-ups. Only Josh sees the Admin business route. Every authorized staff member has My Settings. APIs and database functions enforce active profiles, role, and project scope; no role is inferred from a display name or email in frontend code. No profile is created automatically for an authenticated stranger.

Static approved catalog descriptions stay in code. Only whitelisted public inventory fields leave the availability API. Failed/missing reads are explicitly unverified. Returning focus reloads current availability. Existing gallery/archive/contact routes remain intact. Netlify’s build now uses `npm run build`; the existing source `.env.production` remains the fallback until an explicitly gated hosting-variable cutover. Removing inline build overrides allows approved hosting variables to work and does not switch the target.

The app includes plum/gold icons (regular/maskable/Apple), portrait startup images, `/admin` manifest start/scope, and a dashboard-only service worker that recognizes `/admin` and `/admin/`. It does not cache CRM/API responses or credentials. Session verification/refresh and safe return paths protect deep links. The signature entrance holds four seconds, measures the visible brand destination, types the date, respects Reduce Motion, and avoids a full replay during ordinary navigation. Existing dashboard card and drawer animations remain. Supported vibration is optional; physical iOS haptics are unverified.

Per-device settings support permission enrollment, preferences, refresh/removal, test dispatch and explicit receipt confirmation. Push signing keys remain managed on the server. Durable handoffs can be claimed, completed with an outcome, or returned to the concierge. One pending count drives bell, launch and badges; resolved handoffs do not double-count as new inquiries. Push payloads omit collector details. The delivery queue claims work atomically, retries failed/stalled jobs with bounded attempts, removes invalid endpoints, respects preferences, and distinguishes provider acceptance from receipt. Automatic dispatch requires the separately configured destination schedule described below; it has not been enabled.

## Local validation commands

```bash
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Final validation: 23 unit/database/worker tests passed, 3 direct HTTP-handler integration tests passed, and 24 production-preview browser checks passed. Type checking and production build exited 0. Lint exited 1 only for the two unchanged baseline checkout errors.

`npm test` uses embedded PostgreSQL (PGlite) to replay **all migrations on two fresh databases**, plus direct role, mutation, idempotency, reconciliation and worker tests. Auth/role fixtures are synthetic local identities, not live sign-ins. Browser suites use the production preview with mocked backend responses on desktop Chromium, Pixel layout emulation and iPhone layout emulation in Chromium. Emulation is not Safari, physical installation, OS notification receipt, or proof of a deployed integration.

Supabase CLI 2.58.5 was downloaded from official GitHub release assets and verified against the release SHA-256 manifest. `supabase --version`, `supabase start --help`, and disposable `supabase init` ran. `supabase start` failed against public.ecr.aws (403); the supported Docker Hub registry override downloaded verified layers but hit Docker daemon “no space left on device” during extraction. The retry was stopped. Docker-backed `db reset --local`/Auth/REST/Edge verification therefore remains blocked. No live reset was attempted.

The direct handler checks replace only Auth/PostgREST transport with deterministic responses; they execute the actual Edge handlers without network access. Run them with:

```bash
DENO_DIR=/tmp/c4-deno-cache deno test --no-config --no-lock --node-modules-dir=none --allow-env --allow-read tests/edge.integration.ts
```

Deno check runs with a temporary cache, no lockfile changes, and npm imports outside repository node_modules:

```bash
DENO_DIR=/tmp/c4-deno-cache deno check --no-config --no-lock --node-modules-dir=none \
  supabase/functions/{create-lead,push-delivery,update-lead,get-me,get-lead,get-commerce-availability,add-note,list-leads,list-notes,list-admins,dashboard-summary}/index.ts
```

## Live rebuild prerequisites and reconciliation

GitHub API requests for repository permissions/protection/deployments were denied. HTTPS Git read works; that does not establish push or provider API permission. Requests to destination and public site were blocked by the current network policy. No environment network changes were made. Source and destination management access, destination public configuration, hosting access, authorized test accounts and physical devices remain prerequisites.

1. Obtain scoped managed access through approved account settings. Inventory **both** projects before applying anything. Use `scripts/inventory-database.sql` read-only; store full outputs privately outside this repository. Inspect the original seven tables (`admins`, `leads`, `lead_notes`, `artwork_inventory`, `orders`, `stripe_webhook_events`, `commerce_settings`), migration history, grants, RLS, triggers, functions, dependency order, Auth settings and managed secret **names**. Check destination extras before assuming a fresh database. Compare deployed function sources to these 14 original function folders. The Bolt ZIP was not supplied; ZIP reconciliation remains pending.
2. Identify the exact two source test lead IDs; do not guess by name/date or delete source rows. Confirm all other leads and each real note. Any note on a test lead is excluded. Unknown authors or parent mappings block transfer. Do not assume all seven reported notes are test or real.
3. Use `scripts/reconcile-records.mjs` with a private JSON export and approval manifest. Manifest fields: `testLeadIds` (exactly two), `realLeadIds`, `realNoteIds`, `adminMappings` (old admin ID to verified new admin ID), and `artworkIds`. It fails closed on unclassified records, missing/duplicate mappings, unknown parents/authors, and active checkout reservations. It writes a new mode-0600 file outside the checkout and reports counts only. It does **not** connect to or write a database. Existing orders/settings/webhook history need a separate explicit review; do not silently drop real commerce records or enable checkout.
4. Through destination’s approved administrative path, preapprove the three exact emails in `admins` (Auth UUID initially null), create/invite individual Auth accounts, and bind each new user UUID to its active `pulse-of-divinity` profile and approved role. Source UUIDs are not reused. Verify public signup is disabled in managed Auth settings; database whitelist blocking is defense in depth and does not replace that toggle. Test every account, wrong role/project, revoked profile, and unapproved signup.
5. Compare destination migration history and dry run before applying compatible changes. Original nine migrations plus three additive C4 migrations are candidates, **not** proof of compatibility with an uninspected destination. Review existing objects and records first. Apply only to the destination after compatibility review. Never use `db reset` against either live project.

```bash
TARGET_REF=fxxrkwitncaraotvkyte
supabase link --project-ref "$TARGET_REF"
supabase migration list --linked
supabase db push --linked --dry-run
# Review exact plan and destination identity before the following:
supabase db push --linked
supabase functions deploy "$FUNCTION_NAME" --project-ref "$TARGET_REF"
```

Deploy reviewed non-checkout functions individually: create-lead, get-me, list-admins, list-leads, get-lead, update-lead, list-notes, add-note, dashboard-summary, get-commerce-availability, push-delivery. Leave Stripe onboarding, checkout and webhook deployments outside this release.

Existing backend requirements include managed `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; `RESEND_API_KEY` remains a managed requirement for existing note email behavior. Push adds `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `PUSH_DISPATCH_KEY` (at least 32 characters, supplied securely). Only the public VAPID key is compiled as `VITE_VAPID_PUBLIC_KEY`. Do not put private signing keys, credentials, exports, or staff passwords in Git.

After destination function tests, configure a one-minute managed schedule using `scripts/configure-push-schedule.sql` with the verified project session guard and Vault bindings. Its dispatch secret must match the function’s managed secret. The example depends on approved pg_cron/pg_net/Vault availability; do not run it until those are verified. Test scheduling and retries as a live integration step. Manual owner dispatch is available for controlled verification.

## Cutover and main release gates

Keep source live until all destination staff sign-ins, approved catalog rows, all three artwork states, an existing artwork inquiry, a commission inquiry, list/detail/notes, record relationships and cross-account denials pass. Reconcile writes since the source snapshot immediately before switching. Verify the current live deploy SHA and protection rules with hosting/GitHub access.

Only after those gates, set the **targeted Netlify site’s** public Vite URL/key to destination and rebuild. Do not alter Missy or an unrelated site. Verify all destination function configuration first. Then use ordinary fast-forward main release commands, preserving protections:

```bash
git status --short --branch
git fetch origin main
git diff --check origin/main...HEAD
git merge-base --is-ancestor origin/main HEAD
git log --oneline origin/main..HEAD
git push origin HEAD:main
```

If main advanced, integrate by repository practice and rerun affected checks before pushing. A push is a release and must not be used to discover whether an unvalidated production database works. No release SHA or new deploy ID exists until push/deploy confirmation. Current local commit IDs are candidate commits only.

## Required physical and live acceptance

- iPhone: record model/iOS; install via Safari HTTPS, startup-to-logo match, zero/pending attention, Reduce Motion, supported haptics, session reopen, denial/removal, closed-app lead/handoff push, tap destinations, foreground reconciliation, badge zero, light/dark rendering.
- Android: record device/OS/Chrome; actual install (not shortcut), launcher icon, standalone/expired session, separate enrollment, visible closed-app lead/handoff push, tap destinations, supported launcher badge.
- Desktop: record OS/Chrome; install/window/shortcut, layouts/roles, separate enrollment and closed-window notifications/taps. Numeric badge support varies.
- Authenticated destination and released-site integration checks are pending. Device alert receipt must be confirmed by a human, not inferred from a 2xx push provider response.

## Rollback

Recovery identities: source `cozcsqrqoztzuimxnlfr`, existing Netlify deploy `6ad7962d6cb1274d02ea622d`, baseline main `9ddf130f7fdc605975d2c1008e68fd2cac82c100` (deploy association still needs provider verification).

If destination inquiry writes, sign-ins, or availability fail after cutover: restore the previous **site-specific** backend settings and restore the verified previous deploy or rebuild the prior commit. Stop destination notification dispatch with `SELECT cron.unschedule('pod-push-delivery');` if needed. Record destination writes made during the cutover window and reconcile before retrying. Preserve both databases; do not drop new tables or reset either project as a rollback.

For a code rollback, inspect the actual released range and revert the release commits newest first with `git revert`, rebuild and test, then use the same fast-forward main release process. Do not reset or force-push main. No rollback execution was necessary because this candidate has not been released.
