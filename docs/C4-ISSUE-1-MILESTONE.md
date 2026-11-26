# C4 issue #1 — inventory and inquiry milestone

> Historical release record. The authoritative backend is `fxxrkwitncaraotvkyte`. The Bolt reference below documents the old setup and must not be used for a new build or rollback.

Scope: `codex/c4-inventory-commissions` only. No main merge/push, production schema migration, customer-record transfer, secret update, Netlify deployment, backend switch, Bolt claim or checkout activation is authorized by this milestone. The earlier production-release runbook is historical preparation, not an instruction to execute during this task.

## Preservation and source reconciliation (November 19, 2026)

- Started with clean local main at `1ee704d2ab65a35abaed7909cecc97fe870efc78`, five local commits ahead of baseline `9ddf130f7fdc605975d2c1008e68fd2cac82c100`.
- Verified `c4-release-handoff-1ee704d.tar.gz`: SHA256 `61ce55a8547d2c6f22e9fa980d18350a2081fe9a611b17b398ef414e171db437`; every internal checksum passed and the manifest identified the expected candidate. This is the **Codex candidate handoff**, not a verified Bolt database backup.
- Preserved the candidate as `refs/codex-preserved/c4-1ee704d-20261119` and retained private local configuration copies outside the checkout. No values are included in this report.
- Both remote main and the remote dedicated branch initially pointed to `9ddf130`. No other remote branch or pull-request head provided newer preview source. GitHub API requests were denied, but the issue body was recovered from its authenticated web response.
- The first tracked branch-switch attempt failed because the remote's fetch mapping did not cover this branch. Its resulting index was verified as exactly the known baseline tree, its delta was preserved outside the checkout, and the unchanged candidate was restored before a successful no-track development-branch switch. Local main never moved.
- The dedicated branch preserves all five candidate commits. All nine historical SQL migrations are byte-identical between the baseline and candidate. The candidate has three additional migrations; **none of the SQL migration files were changed by this milestone**. The original Bolt ZIP and a verified private source-data export were not present, so full ZIP/data reconciliation remains blocked.
- Issue #1 identifies the live backend as `cozcsqrqoztzuimxnlfr` and reports that destination `fxxrkwitncaraotvkyte` had no public tables when inspected. That destination finding was not reverified here, and no writes or schema operations were run against either project.
- The existing source public availability response reported the two approved artwork IDs/prices matching code (Cosmic Energy 320000 cents; Bloom Through the Breaking 260000 cents). This does not inventory private Auth, notes, settings or real records. The historical source function includes reservation cleanup on GET; a public catalog response is therefore not proof of a zero-write backend snapshot. All write verification in this milestone uses disposable fixtures.

## Reconcile the private preview

Issue #1 links `https://pulse-of-divinity-admin-review.alphaactivities.chatgpt.site/admin/`; requests from this environment returned proxy 403. The coordinator identified preview-only local commit `624d4ac`, which is not available on this origin, and supplied its behavior:

- Maintain `summaryRevision` in `AdminApp`.
- Increment after drawer save, archive and restore; archive also closes the drawer.
- Pass the revision to `DashboardHome` and include it in the dashboard loading effect dependencies.

That behavior has been reconciled explicitly on the preserved candidate. Dashboard requests also ignore an older response after a newer load starts. The earlier global event refresh was removed from this dashboard effect to prevent duplicate refreshes. The attention/badge event flow remains separate. This is behavioral reconciliation from the coordinator's description, not a claim to have compared or cherry-picked inaccessible commit `624d4ac`. Its preview-host-specific `/admin/leads` behavior is not assumed to establish production routing.

## Inventory and inquiry behavior

Gallery and concierge now share one current availability snapshot. A confirmed state must belong to an approved artwork and have a valid available/reserved/sold payload. Missing/legacy/malformed states are unverified, conflicting duplicate rows fail closed, and previous reads are invalidated while refreshing. Reads bypass caches. A newer read wins over older responses.

Admin availability saves verify the returned artwork ID, requested state and concurrency timestamp, then re-read inventory before confirming success. Empty or mismatched HTTP-200 bodies cannot confirm a save. A confirmed or ambiguous write invalidates other open tabs so they re-read the server; it never writes optimistic inventory state into browser storage. The public API's response is marked `Cache-Control: no-store`. Staff edit denial remains enforced by the existing SQL role boundary, not by UI hiding alone.

Artwork/commission inquiry success still requires a committed UUID. The contact form disables its fields while a request is pending to preserve the submitted payload during double taps. New browser tests exercise a failure before commit, a committed row whose response is lost, and a duplicate retry: one stored lead, one related commission when appropriate, one conversion only after confirmation, and the same request key throughout. No customer details are persisted by the availability invalidation mechanism.

## Source-of-truth boundaries

| Area | Available evidence | Required before live use |
| --- | --- | --- |
| Catalog descriptions and stable IDs | Approved static `src/data/artworks.ts`; public ID/price comparison | Approved content changes remain separate from availability editing |
| Availability | Current server response; baseline inventory schema; candidate audited RPC | Inspect actual source/destination inventory, deployed function behavior and active reservations |
| Auth/roles | Baseline schema and candidate active-project role guards; synthetic role fixtures | Approved staff identities, actual managed Auth settings, destination sign-ins and role/project denials |
| Notes and real records | FK definitions and disposable note-parent/author tests | Verified export, exact test-lead IDs, explicit real-note classification and author/assignee mapping |
| Settings | Historical `commerce_settings` migration; no values inspected or copied | Preserve verified actual settings; do not enable payments |
| Commission inquiries | Existing `leads.inquiry_type`; candidate `commissions` relationship | Inspect real inquiries and reconcile before any approved schema/data migration |

The new dashboard depends on the existing three candidate migrations and correctly mapped `owner`/`staff`/`client` profiles. A frontend-only deployment against the unchanged historical backend does not establish that these dependencies exist. The proposed destination remains a separate unverified target until actual inventory and acceptance checks pass.

## Fixture tests and commands

`tests/fixtures/collectorDatabase.ts` creates a fresh embedded PostgreSQL database, replays tracked migrations, and seeds synthetic local staff. `collectorApi.ts` intercepts browser API traffic, runs intake/availability/lead-update SQL against that database, and blocks other non-local traffic. This validates browser behavior through committed PostgreSQL rows and role checks while leaving production out of the tests. It does not emulate Supabase Auth signing, its HTTP gateway or deployment configuration; those remain live acceptance items.

Commands (run independently so baseline lint failure does not skip checks):

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run lint
DENO_DIR=/tmp/c4-deno-cache deno check --no-config --no-lock --node-modules-dir=none \
  supabase/functions/{create-lead,push-delivery,update-lead,get-me,get-lead,get-commerce-availability,add-note,list-leads,list-notes,list-admins,dashboard-summary}/index.ts
DENO_DIR=/tmp/c4-deno-cache deno test --no-config --no-lock --node-modules-dir=none \
  --allow-env --allow-read tests/edge.integration.ts
git diff --check
```

Baseline before edits: build/typecheck passed, 23 unit/database/worker checks passed. Lint exited 1 with the two existing checkout errors: unused `ALLOWED_ORIGINS` in create-commerce-checkout and prefer-const `stripePaymentIntentId` in stripe-webhook. Those files remain untouched. New lint failures must not be classified as baseline.

## Verified milestone outcomes

- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; Vite produced public and admin HTML plus application assets.
- `npm test`: exit 0; 30 checks passed (23 preserved checks plus seven availability-contract checks).
- `npm run test:e2e`: exit 0; 45 checks passed across desktop Chromium, Android layout emulation and iPhone layout emulation in Chromium. This includes 21 SQL-backed browser checks (seven scenarios on three viewport profiles), plus the 24 preserved browser checks.
- Deno check of all 11 non-checkout functions: exit 0.
- Deno HTTP-handler integration: exit 0; three checks passed. The catalog check also requires `Cache-Control: no-store`.
- `npm run lint`: exit 1; exactly the two unchanged baseline checkout errors, no new errors or warnings.
- `git diff --check`: passed.

The browser fixture scenarios verify all availability states across tabs and reload, gallery/concierge agreement, fail-closed ambiguous write responses, artwork and commission saves after both a pre-commit failure and a lost committed response, once-only conversion, dashboard counts/recent refresh on save/archive/restore, and note persistence with valid relationships.

## Remaining acceptance and recovery

Pending: exact Bolt ZIP/source export reconciliation, private-preview source/binary comparison beyond the described behavior, actual source Auth/notes/settings inventory, current destination inventory, real staff sign-ins, deployed role/project boundaries, live gallery/inquiry parity, exact production-host deep-link/redirect behavior, and physical iPhone/Android/desktop installation and notification receipt. Do not infer these from mocked/embedded tests. No rollout or data classification was performed.

Development rollback: revert only the new milestone commit(s) on `codex/c4-inventory-commissions` to return to preserved candidate `1ee704d`; keep the existing five candidate commits. If a branch push is allowed by the coordinator, use only an ordinary fast-forward push to that exact development branch after tests; do not push main or invoke Netlify. No production rollback is needed because this milestone performs no deployment or production mutation command.
