# Mercatura - clean client starter

A fresh, local installation of the creative, landing page and SEO workspace. This repository contains application source and generic methods. It contains no registered brands, customer research, uploaded files, generated outputs, reference library, prior client learning, provider secrets or previous repository history.

## Start tomorrow

1. Install Node.js 22+ and pnpm 11.25. Run pnpm install --frozen-lockfile.
2. Copy .env.example to .env. Keep mock mode and zero budgets while checking onboarding. Never copy another installation's environment or data folders.
3. Run pnpm setup, then pnpm dev. Open http://127.0.0.1:3000/onboarding.
4. Create the client, add only their approved brand resources and accurate product/offer facts. Follow docs/guide/01-start-here.md.
5. Configure your own provider credentials locally, confirm the selected models are available to your account, approve the destination and choose explicit small caps before live generation. Text uses LLM_BUDGET_USD within ABSOLUTE_BUDGET_USD; image count and video USD have separate limits. These are local controls, not a hosted multi-user billing ledger.
6. Produce and approve a small pilot before a large batch. Mock output verifies workflow, not real copy or image quality.

## What is ready

Brand intake, resource preparation, creative planning, image and script workflows, landing page and SEO workflows, output review and generic method retrieval remain in the app. A zero-brand start redirects to onboarding. No sample client is installed by db:seed. Connections shows preparation checklists with honest unconnected status.

## What still needs implementation

This is a single-operator local app using SQLite and filesystem storage. It has no hosted team authentication, enforced agency authorization, marketing-data ingestion workers, production OAuth installation flows, Slack installation, hosted cost reservations or live subscription billing. The platform folder is a design scaffold, not an activated service. DATABASE_URL and future OAuth fields are placeholders until adapters and the migration are implemented.

Do not deploy the local app publicly for multiple clients. The complete India-first implementation plan explains the staged replacement of these boundaries and the tests required before team access.

## Documentation

- docs/PLATFORM-IMPLEMENTATION-PLAN.md - architecture, connections, scaling, cost and commercial plan.
- docs/guide/01-start-here.md - practical first-client workflow and quality brief examples.
- docs/SECURITY-AND-DATA.md - data boundaries and release gates.
- platform/ - typed adapter contracts and illustrative Postgres schema.

## Verification

Run pnpm check:leakage, pnpm test, pnpm typecheck and pnpm build. Integrity checks protect tracked files; they are not a guarantee that arbitrary future uploads are anonymous. Keep data/, brands/*, .env and all outputs ignored. Back up new client runtime data separately with client-specific access and encryption.
