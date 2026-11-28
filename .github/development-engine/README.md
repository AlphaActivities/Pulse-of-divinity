# Darcy development engine operations

## Onboarding
Use only the QA branch and the approved Alpha Dev Supabase project. Provision a distinct synthetic identity and schema per client with row-level security. Store credentials in GitHub Actions secrets, never in source or artifacts. Verify the project and identity allowlist before any write. Do not use production credentials, customer records, notification delivery, or deployment commands.

## Acceptance
Check build, type checks, unit tests and browser evidence. Verify authenticated create, edit, reload, status, archive and restore against isolated storage. Verify cross-client reads return no records and writes are rejected. Browser mocks and direct API tests are separate evidence; do not certify integrated browser persistence until tested together. Audit dependency candidates and test compatibility before adoption.

## Monitoring
Review the latest QA run, job conclusions and sanitized artifacts after each QA branch change. Record run ID, commit, audit severity and unresolved failures. A green workflow does not establish a clean dependency audit. Escalate failures privately and stop on any unexpected endpoint or external delivery attempt. Continuous scheduled monitoring remains unverified. Do not merge main, deploy production, delete databases or incur additional costs.
