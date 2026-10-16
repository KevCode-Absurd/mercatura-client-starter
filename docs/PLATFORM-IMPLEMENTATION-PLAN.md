# Mercatura: US-market platform, costs and implementation plan

Revision 2. Researched 16 October 2026. US-market architecture with a separate India option; current vendor pricing, agent tooling, implementation and operating economics. USD before tax. Monthly billing is used unless explicitly labeled annual. Published facts, engineering recommendations and hypothetical workload estimates are identified separately. This supersedes the earlier India-first recommendation; it does not change any deployed infrastructure.

## 1. Decision, costs and programme objective

Build the customer-facing hosted service in US East if the primary customers will be US agencies. Your team can operate it from India. Use the clean local starter for the first controlled onboarding while hosted identity and tenancy are implemented. Keep an India deployment track for customers who contractually require it. The earlier India-region answer is retained as an available option, rather than being silently treated as a permanent constraint for all future customers.

Recommended US stack for the first hosted agency: Railway Pro for the Next.js web container and any custom workers; Neon Postgres in AWS US East; Clerk for user sign-in and organization membership; Trigger.dev for durable production jobs; Firecrawl for bounded public website intake; private S3 US East objects when explicit regional controls are needed. Railway Buckets are a simpler storage candidate when their selected location, protection features and contract meet the client's requirements. Use one workflow system and one identity system. Add Upstash Redis only after cache/rate-limit requirements justify it.

This is an engineering recommendation based on the current service capabilities, the existing container/media workload and the wish to work effectively with coding agents. It is not a claim that these vendors integrate automatically or that this is the cheapest stack under every workload. The consolidated alternative is Railway plus Supabase US East for database/auth/storage, with application-owned agency membership. Chapter 31 compares both routes, including Neon Managed Better Auth and WorkOS. Evaluate them with a small vertical slice before purchasing annual subscriptions.

For planning, a recommended US pilot has roughly $280/month of platform services, plus $56.48 of modeled AI consumption for one brand at the chapter 22 workload. That is about $336/month before people, taxes and payment charges. Adding modeled review and support gives about $488/month. A lower-cost consolidated pilot can be modeled around $110/month in platform services, but that is a deliberately lean allowance with different auth and operational choices. Neither figure is a vendor package or measured production bill. The component formulas and larger-scale scenarios are in chapters 32 and 33.

The programme objective is an authorized agency team connecting a brand, ingesting permitted data, creating varied evidence-backed work, reviewing it and exporting approved deliverables. Increase accepted useful output per hour and per dollar. Standalone evidence-based creation remains available when Meta, Google or Shopify access is missing. The US-market decision changes placement and procurement priorities; it does not remove tenant isolation, cost controls, migration or quality work.

The current repository is local, with SQLite, filesystem storage and a brand-selection cookie. It has not been converted into a hosted agency SaaS by writing this plan. Contracts and schema sketches are implementation guidance only. Do not expose it to unrelated clients until the hosted gates in chapter 27 pass.

## 2. What the new repository actually provides

The starter retains generic application code, prompts and methods for research, creative planning, image and script production, landing pages, SEO and review. It starts with no brands, no uploaded resources, no historical outputs, no client reference library and no learned client preferences. Generation defaults to mock mode and zero budgets. The seed command does not create a demonstration business.

The new onboarding screen supports the zero-brand state. Adding a client creates an empty brand workspace. The connections screen lists preparation steps and honestly reports that hosted adapters are not connected. Generic checks help prevent accidental commits of runtime data and secrets. A separate private fingerprint audit is performed before the initial repository is published. New Git history avoids carrying deleted material through old commits.

Still to build: hosted login and invitations; organization and brand permissions; Postgres repositories; object storage throughout the app; tenant-aware durable workers; OAuth installation and refresh; account discovery; marketing and commerce ingestion; Slack installation; hosted metering and billing; operational security and recovery. An environment variable named DATABASE_URL does not implement these features.

Treat the source-only starter as a controlled starting point, not a certification that arbitrary future uploads cannot leak. Client resources remain ignored by Git and should have separate access-controlled backups. Every future change to shared prompts or methods needs review for client-specific examples.

## 3. Tomorrow: one client, one operator

Allow roughly a morning for access and evidence intake, then a small reviewed creative pilot. Provider approvals and client account ownership can take longer; do not promise all live APIs will work on the first day.

1. Start a fresh clone, install pinned dependencies, copy the blank environment example, run migrations and open onboarding on a loopback address.
2. Create the client. Confirm market, language, timezone, currency, brand owner and deliverable approver. Upload only this client's resources with rights and effective dates.
3. Reconcile current product facts, prices, offer terms, claims, imagery and prohibited language. Keep unknowns visible and unresolved.
4. Run mock workflows to verify intake and output screens. Confirm no old source, examples or learned rules appear. Mock generation is not an output-quality test.
5. After provider and spend authorization, configure this installation's keys and small explicit limits. Produce a narrow live pilot and review the full output.
6. Collect API readiness details using chapter 10. If an API is blocked, continue standalone and accept a documented read-only export. Never invent missing metrics.
7. Record accepted pilot artifacts, defects, spend, decisions and the next action. Export the approved work; do not enable external publication automatically.

Tomorrow's team collaboration can use a controlled document and approved exports while hosted permissions are being built. Do not open a local unauthenticated server to the team as a shortcut. Make one operator responsible for keys, local backups and generation caps until hosted identity and cost controls pass their gates.

[manual-page-break]: #

## 4. Region choice and the platform decision matrix

Choose the region closest to the application's users and database, subject to each client's contract and the permitted processing destinations. An Indian operator does not require an India origin for a US product. Keeping the web app in one country and its transactional database in another adds repeated network trips. A CDN can accelerate public assets; it does not eliminate remote database latency on personalized reads.

| Layer | US launch recommendation | India-resident alternative |
| --- | --- | --- |
| Web and custom workers | Railway US East (Virginia), container deployment | DigitalOcean App Platform Bangalore or AWS Mumbai |
| Transactional database | Neon AWS US East; pool connections | Supabase Mumbai or AWS managed Postgres Mumbai |
| User identity | Clerk; application-owned brand grants | Supabase Auth in selected project or reviewed self-hosted auth |
| Durable production | Trigger.dev US worker region, validated in deployment | Region-controlled workers with SQS/EventBridge Mumbai |
| Private objects | S3 us-east-1; Railway Buckets subject to location/controls check | S3 ap-south-1 |
| Public web intake | Firecrawl with limits and approved public hosts | Local parsing or approved regional/self-hosted extraction |
| Secrets and logs | Separate production credentials, redacted telemetry | Explicit regional configuration and processor review |

Railway currently lists California, Virginia, Amsterdam and Singapore. Neon lists AWS regions including Virginia/Ohio and Singapore, with no India entry; its existing project region is fixed. Supabase lists both Mumbai and North Virginia. Clerk's current security guidance says regional selection is not offered and identifies US hosting. These facts are from [Railway regions](https://docs.railway.com/deployments/regions), [Neon regions](https://neon.com/docs/introduction/regions), [Supabase regions](https://supabase.com/docs/guides/platform/regions) and [Clerk security](https://clerk.com/security). They make Railway/Neon a reasonable US candidate and an unsuitable substitute for an India-only processing promise.

A region on a dashboard is not an end-to-end residency guarantee. Assess database, backups, object copies, workers, job payloads, identity, scraping, AI inference, telemetry, support access and recovery separately. Supabase explicitly describes out-of-region handling for limited account/support/usage categories in its [residency FAQ](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq). Require equivalent clarity from other vendors rather than assuming that their product region covers every processor.

Do not start with active-active global databases. Use one home region per agency, a public-asset delivery layer and a regional deployment registry. Chapter 29 defines migration and a later India cell. This minimizes early operational complexity and avoids paying for duplicated services before there is an agreed need.

## 5. Target architecture and service boundaries

The browser calls an authenticated web application. That application verifies organization and brand access before reading or changing anything. Interactive requests create durable jobs and return their IDs. Long-running work happens in workers, with results and progress stored centrally. A restart must not lose work or duplicate provider charges.

Use these service boundaries initially; most can be modules in a modular monolith rather than separate deployed microservices:

| Boundary | Responsibility | Durable state |
| --- | --- | --- |
| Identity and tenancy | Sessions, invitations, agency/brand access | Memberships, policies, audit events |
| Connections | OAuth, scopes, account bindings, token lifecycle | Encrypted token references and connection health |
| Ingestion | Scheduling, provider quotas, raw fetches, cursors | Job ledger, raw object manifests |
| Data and evidence | Normalization, reconciliation, approved facts | Postgres facts, versioned resources and claims |
| Production | Briefs, diversity plans, generation, renders | Artifact revisions, costs, quality holds |
| Collaboration | Review, Slack actions, notifications, exports | Review history, delivery outbox |
| Billing and operations | Reservations, usage, limits, recovery | Cost ledger, invoices, operational telemetry |

The pipeline is: authorized account -> raw records -> validated normalized facts -> defined metrics -> scoped evidence pack -> creative plan -> generation -> quality checks -> human review -> approved export. Each arrow is a versioned transformation. Store raw record references and evidence versions so an output can be explained later.

Separate read-only analysis from future publishing. A connection that can read an account does not authorize changing spend, uploading an ad or publishing a page. Future write actions require a named account, exact artifact revision, action, amount where relevant, approver and short-lived execution authorization.

## 6. Agency, brand and user model

An organization represents an agency or direct-client business. It owns brands, memberships, integrations, subscriptions and audit history. A user can belong to several organizations with different roles. A brand contains its products, resources, accounts, outputs and preferences. A provider connection can discover several accounts, but explicit account-to-brand bindings determine what can be ingested.

Keep these identifiers distinct: app user, organization, brand, provider installation, advertising account, analytics property, store and Slack workspace/channel. Do not infer one from a display name, email domain or Slack channel title. Renaming a brand must not move its storage or reassign account ownership.

| Role | Default capability | Exclusions |
| --- | --- | --- |
| Owner | Organization settings, members, billing and explicit brand access | No automatic access to another organization |
| Admin | Team administration and assigned brand workflow | Billing and account connection can remain separate |
| Integration admin | Connect/revoke approved accounts and inspect sync health | No automatic publication or billing access |
| Creator/strategist | Create and revise within assigned brands | Cannot approve own publication by default |
| Reviewer | Comment and approve an exact revision | Cannot silently change that revision |
| Analyst | Read authorized metrics and evidence | No generation spend or account writes |
| Client viewer | Read selected approved deliverables | No raw customer data or draft cross-client work |
| Billing | Read usage/invoices and manage commercial settings | No content or credentials by default |

Assign explicit brand grants even to senior roles where practical. Add enterprise SSO only when customer needs justify it. Vendor dashboard team plans and application user seats are different products; buying a vendor Team plan does not implement our permission model.

## 7. Enforcing isolation everywhere

Every tenant-owned row carries organization_id and, where applicable, brand_id. Composite foreign keys prevent a source from one brand being attached to an artifact in another. Apply server-side authorization and database RLS as complementary controls. Test the actual credentials used by the web server and worker; an administrative or service role may bypass RLS. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) describes the underlying policy model.

Use tenant-qualified keys for object storage, cache entries, vector retrieval, job deduplication, exports and generated previews. A shared content hash is not sufficient as a cache key when the content is private. Include organization, brand, source permissions, resource version and relevant model/prompt version. A retrieval result must be scoped again before it enters a prompt.

Private storage objects use short-lived signed URLs issued only after authorization. Do not put client assets under a globally readable public folder. Backups and support access have the same tenant constraints as the live system. Debug logs should record IDs and redacted errors, not prompt bodies, tokens, uploaded files or customer records.

Mandatory negative tests: alter an organization ID, brand ID, artifact ID, object key, export job ID and Slack button payload while logged in as a different tenant. Test direct route access, server actions, streaming responses, background jobs and old signed URLs after revocation. Test vector and cache contamination, not just database queries. An isolated helper passing unit tests is insufficient if legacy routes bypass it.

The contracts in platform/contracts.ts show deny-by-default scope checks and scoped job keys. They are not yet wired to local routes. Hosted launch is blocked until route-level tests demonstrate the same boundary end to end.

[manual-page-break]: #

## 8. Migrating the local runtime

Inventory all SQLite-specific schema definitions, SQL expressions, JSON operations, synchronous all/get/run calls, filesystem paths and in-process worker state. Introduce repository interfaces around brands, resources, jobs, outputs, reviews and usage. Implement Postgres versions, then move a vertical workflow end to end before switching the entire app. Do not attempt a database URL-only migration.

Replace local files with an object-store abstraction that supports private writes, metadata, checksums, content type, authorized reads and deletion. Keep small metadata and transaction state in Postgres. Keep source files, image/video assets and immutable raw API responses in object storage. Use a local adapter for development so tests remain fast.

Move long work out of web requests into durable queues. Replace process-global activity, locks, caps and token selection with tenant-aware state. Credentials must be resolved from the job's verified connection, never from a global active-brand variable. If the existing media rendering engine requires a local temporary file, use an isolated work directory, upload results and clean up with a bounded retention policy.

Migration sequence: define schemas and authorization; implement one resource-upload and read path; migrate one creative output path; implement durable progress and cost accounting; migrate landing/SEO and exports; migrate all remaining reads/writes; run the negative authorization suite; run backup/restore and a limited client pilot. Existing installations should export only selected client data through a validated import format. The new starter itself does not import any old client data.

Acceptance requires count/checksum reconciliation, working rollback, no client data in application images, and no routes still reading a shared filesystem or unscoped SQLite database. Keep the production cutover reversible until the first representative workload has passed.

## 9. Durable job, quota and spend model

Use separate queues for ingestion, text generation, image generation, media rendering and exports. Each job stores organization/brand, actor, connection/account, operation, time range, schema version, input revision, idempotency key, attempt, lease, checkpoint and next eligible time. Store secret references, never plaintext tokens, in the message.

Jobs move through queued, running, report-pending, retry-wait, needs-reauth, succeeded, failed or cancelled. Remote asynchronous reports need polling checkpoints. Generation that succeeds but fails review remains an existing artifact on quality hold; it is not a failed fetch to blindly retry. A queue message acknowledges after the durable state transition and result persistence, with replay-safe completion logic.

Apply concurrency limits per provider, organization, account and operation, plus a global safety ceiling. Use fair scheduling so a large backfill cannot starve interactive work. Respect Retry-After and provider usage signals, use exponential backoff with jitter, and move persistent failures to a dead-letter queue with an operator runbook. Token errors need refresh or reauthorization; permission errors need client action, not endless retries.

Before a paid call, atomically reserve its estimated maximum cost against organization and job budgets. Settle to actual usage after completion, including unsuccessful attempts. A crash after a provider call can create an unknown-cost state; reconcile provider records before replay where possible. Do not release an uncertain reservation simply because the worker timed out. Local starter caps do not currently provide this transactional guarantee.

For generation APIs without idempotent create semantics, an app idempotency key alone cannot guarantee exactly-once charging. Record the external request ID, separate submit from poll and explicitly bound uncertain retries. Expose reserved, settled and pending cost to operators. Cancellation stops unsent work but cannot undo a request already billed externally.

## 10. Client access intake and connector readiness

Collect an access inventory before credentials. Record the legal/account owner, approving user, organization and brand, provider account IDs, required data, required history, timezone, currency, scope, retention, refresh target and allowed destinations. Store the client's authorization and any app-review dependencies. A valid token is only one part of readiness.

| Connector | Client supplies or approves | Engineering prerequisite |
| --- | --- | --- |
| Meta | Business/ad account identifiers and authorized access | App configuration, approved permissions, account discovery and quota-aware worker |
| Google Ads | Customer IDs and relevant manager relationship | Cloud OAuth configuration, developer token and correct access level |
| GA4 | Property IDs and authorized property access | Separate analytics scope, property quotas and compatible report schema |
| Search Console | Verified property selection and access | Separate webmasters scope, search report definitions |
| Shopify | Store owner installation and permitted data | Correct app distribution/authentication, GraphQL adapter and signed webhooks |
| Slack | Workspace installation, allowed channels and users | OAuth, request verification, membership mapping and async event queue |
| Database/export | Read-only schema or owned export | Narrow tables/views, row filters, secure network path and import contract |

Readiness states should be not-configured, waiting-client, waiting-provider-approval, connected-unverified, verified-read-only, syncing, stale, needs-reauth or revoked. Keep permission health separate from freshness. A green token check is not proof that the required account, historical range or fields are available.

Each adapter gets a capability manifest: supported streams, API version, required scopes, allowed report grains, backfill limits, quota key and destructive actions. Capability checks drive the UI. If only a product catalogue is connected, do not show revenue analysis as available.

## 11. Shared OAuth and token lifecycle

Create the connection inside an authenticated organization/brand context. Verify the actor's integration permission. Generate a cryptographically random, expiring, one-use state bound to that membership and intended provider. Use PKCE where supported and appropriate. Callback URLs must match registered values, and state must be checked before token exchange.

After exchange, discover the accounts the token can actually access. Ask the authorized user to bind an explicit subset to brands; do not ingest every discovered account automatically. Validate account identity, currency and timezone. Store granted scopes, expiry, provider subject and an encrypted token reference. Keep a versioned record of connection consent and account bindings.

Use envelope encryption with KMS and a narrowly scoped credential service. Rotate application secrets, refresh tokens according to provider rules, serialize refresh for a connection and invalidate old versions safely. Never return tokens to the browser, write them to logs or send them to a language model. Development, staging and production use different apps, secrets and redirect URLs.

On revocation or team removal, stop queued work, revoke where supported, remove active token access and show the last successful sync. Preserve only records justified by the retention policy; deletion of imported data is a separate workflow. Periodically recheck scopes and account access because a refreshable token may outlive permissions.

Google's [web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server) and Slack's [installation flow](https://docs.slack.dev/authentication/installing-with-oauth/) provide provider-specific details. Implement each provider's current flow rather than forcing a single generic callback implementation onto every API.

[manual-page-break]: #

## 12. Meta Marketing API implementation

Start with read-only account and reporting access. The intended minimum is ads_read for advertising reports; additional business discovery permissions depend on the actual account flow. Confirm exact current scopes, access level, app review, business verification requirements and API version in the Meta app dashboard before promising client availability. Meta's documentation returned rate-limiting errors during this research, so this plan deliberately does not claim a verified fixed quota or a complete current approval checklist.

Implement account discovery, explicit brand binding, campaign/ad-set/ad metadata, creative references and daily insights as separate streams. Store native IDs as strings. Fetch a small known day first and compare totals and filters with an authorized account export. Record date boundaries, account timezone, currency, attribution settings, report level and action breakdown. Do not collapse all action types into a single conversion column.

For larger ranges, use provider asynchronous reporting where supported and persist remote report identifiers. Split work by account, date range and report grain. Follow pagination until exhausted; keep a checkpoint after each durable page. Store raw report responses and a schema version before normalization. Use provider response/usage signals for adaptive throttling rather than a hardcoded requests-per-minute assumption.

Use a recent incremental window plus a rolling overlap to capture late attribution changes. Make the overlap configurable by account/report settings. Reconcile selected completed days and periodically refetch older samples. Keep provisional and restated results visible. A missing row should be distinguished from a genuine zero and from a failed or filtered report.

Acceptance: the selected account is correct; a known report reconciles within an explained tolerance; repeated fetches do not duplicate rows; revoked access pauses safely; rate-limit responses delay rather than storm; account timezone and attribution metadata survive into the UI. Do not add ad writes to this first connector.

Official references to recheck during implementation: [Insights API](https://developers.facebook.com/docs/marketing-api/insights/) and [Marketing API rate limiting](https://developers.facebook.com/docs/marketing-api/overview/rate-limiting/). Treat app approval as an external dependency, not an engineering task guaranteed to finish in a sprint.

## 13. Google Ads, GA4 and Search Console

Google Ads needs OAuth authorization and a developer token; manager account context may also be required. Use the relevant customer ID and login-customer-id correctly, and validate access to the actual client account. This is separate from GA4 and Search Console authorization. [Google Ads OAuth](https://developers.google.com/google-ads/api/docs/oauth/overview) and [REST authentication](https://developers.google.com/google-ads/api/rest/auth?hl=en) describe these requirements.

Build bounded GAQL queries for account, campaign, ad-group, ad, asset and daily performance streams. Pin the API version and keep report definitions in code. Ingest account currency/timezone and preserve segmentation dimensions in the primary key. Do not request every possible segment in one query; high-cardinality combinations can explode data and create misleading joins.

Current Google Ads documentation distinguishes Explorer, Basic and Standard access, with different operation limits; developer-token approval and other service limits still apply. Use the actual project's access tier and observed quota responses to configure scheduling. A Standard daily allowance does not remove all rate and request constraints. [Google Ads quotas](https://developers.google.com/google-ads/api/docs/best-practices/quotas) is the implementation reference.

For GA4, request only needed metrics/dimensions at the property grain, inspect compatibility and return quota information where available. Token usage and concurrency are property-sensitive, so coordinate workers across clients sharing a property. Preserve report metadata and distinguish delayed, thresholded or otherwise limited responses from complete facts. [GA4 quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas) provides the limits.

For Search Console, build separate property-level query/page/date streams with their own authorization and quotas. Record search type, aggregation and filters; don't represent the returned rows as a complete census of every query. Use the data to ground content priorities, not invent ranking guarantees. See [Search Console limits](https://developers.google.com/webmaster-tools/limits).

Acceptance includes a known-day comparison for each service, correct account/property binding, no duplicate segmented facts and visible differences between ad attribution, analytics sessions/conversions and search reporting. Connecting Google Ads must not silently mark GA4 or Search Console connected.

## 14. Shopify and other client databases

Use Shopify's GraphQL Admin API for catalogue and permitted commerce data. Choose the correct app distribution and authorization flow for independent client merchants. Shopify's client-credentials grant is for stores in the developer's own organization; it is not a shortcut for arbitrary agency clients. See the [client-credentials guidance](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant?lang=node).

Request read-only scopes that match the agreed use. Product, inventory and order access are separate capabilities. Historical order access beyond the default window can require read_all_orders approval in addition to order scopes. Sensitive customer data needs its own handling and applicable approval. Prefer no customer identity collection for this product. See [Shopify access scopes](https://shopify.dev/docs/api/usage/access-scopes).

Initial ingestion: shop settings, products/variants, approved media references, inventory where needed and order/refund aggregates for the permitted history. Use cursor pagination or supported bulk operations for large datasets. The API uses cost-based limits, so use cost feedback and per-store scheduling. [Shopify API limits](https://shopify.dev/docs/api/usage/limits) is the implementation reference.

Verify webhook signatures against the raw body, acknowledge promptly, enqueue, deduplicate event IDs and process updates idempotently. Webhooks can duplicate and arrive out of order; use resource timestamps and a scheduled reconciliation, not blind last-arrival-wins updates. Implement applicable privacy/uninstall handling. [Webhook subscriptions](https://shopify.dev/docs/apps/build/webhooks/subscribe) and [best practices](https://shopify.dev/docs/apps/build/webhooks/best-practices) describe the delivery model.

For an external database, start with an approved export or read-only view, not production administrator credentials. Define allowed columns, tenant filters, incremental watermark, delete semantics, expected volume and reconciliation totals. Avoid arbitrary SQL entered by agents. Use a replica or narrow service account, encrypted connection, network allowlist and a bounded query timeout. Normalize through the same raw-to-fact pipeline as APIs.

Acceptance: catalogue identity matches the store; money/refund definitions reconcile; duplicate webhooks do not duplicate orders; old updates cannot overwrite newer resources; uninstall stops access; no customer identifiers reach generation prompts. Pin a stable API version and test upgrades before scheduled deprecation.

## 15. Slack and team collaboration

Install a workspace app through OAuth and bind it to an authorized organization. A Slack workspace can contain several clients; bind selected channels to specific brands. Store enterprise/team/channel identifiers, installation token reference, allowed event types and installer. Do not infer permission from channel membership alone. Link Slack user IDs to verified app memberships before allowing approvals.

Begin with outbound job-complete notices, quality-hold notices and review links. Use a delivery outbox with deduplication and per-channel pacing. Do not read all workspace history. If contextual reading is later needed, request limited scopes and explicit channel consent; current Slack limits differ by method and app distribution. [Slack rate limits](https://docs.slack.dev/apis/web-api/rate-limits/) is the operational reference.

Verify request signatures using the raw body, signing secret and timestamp replay protection. Acknowledge events within Slack's three-second window, then enqueue durable work. Handle duplicate deliveries and retries. [Events API](https://docs.slack.dev/apis/events-api/) and [request verification](https://docs.slack.dev/authentication/verifying-requests-from-slack/) describe these requirements.

Example notification: “Brand A: 12 concepts ready. Eight pass automated checks; four need review. Estimated batch spend $X, settled spend $Y. Review revision 3.” Buttons should open an authenticated review or carry a signed, expiring, single-use action bound to user, organization, brand, artifact and revision. Changing the artifact invalidates the approval. A client message saying “looks good” must not automatically authorize ad publication or spend.

Keep sensitive research, customer rows and tokens out of Slack. Post a preview only when the selected channel is approved for that content. Revoking installation or brand-channel mapping stops future notifications. Slack is a collaboration surface; the app remains the source of truth for access, revisions and approval history.

[manual-page-break]: #

## 16. Data model, metric semantics and truth

Use three layers: immutable raw records, normalized operational facts and named metric views. Raw manifests contain provider/account, request definition, fetch time, source version, checksum and object key. Normalized rows keep native identifiers, source currency/timezone, event/report date, attribution settings and ingestion run. Metric definitions specify numerator, denominator, filters, date basis and version.

| Data group | Representative grain/key | Important rule |
| --- | --- | --- |
| Advertising daily | Tenant, account, entity, date, report definition and segment set | Different breakdowns are not additive copies |
| Commerce ledger | Tenant, store, order/refund/adjustment ID | Define cancellation, refunds, discounts, tax and shipping explicitly |
| Analytics | Tenant, property, date and dimension set | Preserve reporting limitations and consent effects |
| Search | Tenant, property, date, query/page and search filters | Returned query rows may not equal total property activity |
| Evidence | Tenant, brand, source ID, version and claim ID | Every factual output statement needs a compatible source |
| Artifacts/reviews | Tenant, brand, artifact ID and immutable revision | Approval applies to that revision only |
| Usage | Tenant, job, request ID, reservation and settlement | Include retries, failures and unknown-cost requests |

Do not sum Meta and Google attributed conversions to claim unique purchases. They can credit the same transaction under different windows. Keep platform-attributed metrics separate from Shopify commerce totals and from GA4 measurements. A blended spend-to-commerce ratio is a defined management metric, not proof of channel incrementality.

Store money in decimal-safe units with currency; maintain original currency and an explicitly dated FX conversion if needed. Store timestamps in UTC while preserving source timezone and reporting date. Avoid joining a store-local day to an ad-account-local day without explaining the mismatch.

Track data confidence as dimensions rather than one opaque score: freshness, completeness, reconciliation, source authority and applicable limitations. Mark early data provisional. A model-generated explanation must quote the actual metric definition and time range it used. If inputs conflict, show the discrepancy and source, rather than asking a model to pick a convenient number.

## 17. Evidence-led production and output quality

Build a client-scoped evidence pack before each job. Include approved product facts, offer terms, relevant research excerpts, visual references, forbidden claims, voice preferences and source versions. Performance data may prioritize an angle after it becomes available; it does not validate a product claim. Keep research observations, client assertions and substantiated facts distinguishable.

Use a staged workflow: brief validation -> evidence sufficiency -> diversity plan -> low-cost concept review -> selected rendering -> automated checks -> human review. A missing source should block the affected claim or turn it into an explicit question. Do not render hundreds of outputs before discovering the offer or product image is wrong.

Quality gates are specific to the artifact. Images need product fidelity, readable copy, accurate packaging and mobile legibility. Scripts need a natural spoken argument, realistic timing, coherent shots and supported claims. Landing pages need message match, accurate offer/terms, mobile usability and an honest purchase path. Articles need useful depth, complete answers, source coverage, factual checks and clear separation of inference from evidence.

Use automated critics as triage, not proof. Deterministic rules catch broken links, missing fields, invalid dimensions and forbidden terms. Source checks compare claims with evidence. A reviewer judges usefulness and taste. Keep failures visible and cap repair loops. Evaluate repair quality against the original problem; a higher self-score alone is not a successful correction.

Establish a client-owned evaluation set after onboarding: 10 representative briefs, 20 factual questions, product-fidelity references and difficult edge cases. Hold a small portion out from prompt tuning. Blindly compare candidate model/workflow changes using the same inputs, including all attempts and costs. This new starter ships no previous client's benchmark results.

## 18. Volume, variety and veracity scorecard

Volume means accepted usable outputs within a budget and deadline. Variety means distinct arguments and production treatments relevant to the brief. Veracity means facts are supported, current and correctly qualified. Increasing file count while collapsing these measures is not a product improvement.

| Measure | Definition | Initial management target |
| --- | --- | --- |
| Accepted throughput | Approved usable pieces per operator hour | Establish baseline on the first client, then improve |
| First-pass acceptance | Accepted without substantive repair / reviewed | Set a client-specific target after the pilot |
| Concept diversity | Distinct approved argument/scene/layout clusters | Review against the approved batch matrix |
| Factual defect rate | Material unsupported or incorrect claims / reviewed pieces | Zero tolerated in approved deliverables |
| Evidence coverage | Factual claims linked to current compatible sources | All material product/offer claims |
| Accepted-unit cost | All generation, repair and rendering cost / accepted pieces | Track by format and client |
| Approval latency | Time from valid brief to approved revision | Track median and p95, including waiting states |

For a 40-image batch, plan the combinations first. For example, five buyer situations by four arguments by two treatments gives 40 slots, but reject combinations that lack evidence. Reserve a portion for exploration. Use duplicate detection on copy and visual similarity, then have a reviewer confirm that semantic differences are real. Changing a background colour is not necessarily a distinct concept.

For articles, depth should follow search intent and source availability. A word target can detect an obviously thin result, but padding, repetition and fabricated expertise fail the gate. Require concrete explanations, practical steps, relevant limitations and source-backed examples. Keep a held state when the evidence cannot support a full article; do not manufacture confidence to satisfy length.

## 19. Maximizing speed without losing quality

Measure the critical path before optimizing: upload/preparation time, evidence retrieval, model queue, generation, validation, rendering and human wait. Record p50/p95 and provider latency separately. A fast UI that submits work is different from a fast accepted-output workflow.

Highest-value changes: precompute versioned product/evidence packs; avoid repeatedly summarizing the entire brand archive; cache safe derivations within the tenant boundary; validate briefs before paid work; parallelize independent concepts with per-provider limits; stream progress; produce low-resolution concept previews where appropriate; render only approved candidates; repair the failing component rather than regenerate everything.

Route easy extraction and formatting to a cheaper/faster qualified model and reserve stronger models for difficult reasoning or review. Benchmark routes on accepted output quality. Keep model/provider fallback explicit because it changes destinations, style, latency and cost. Never silently fail over confidential content to an unapproved provider.

Use asynchronous image/video work with durable status, thumbnails and lazy loading. Paginate libraries and queries; index by tenant/brand/date/status; prevent N+1 source reads. Precompute dashboard aggregates and read recent operational data from Postgres instead of rescanning raw object files. Use an outbox and event-driven updates to reduce polling. Poll only visible screens and back off when idle.

Build before/after experiments on representative briefs. A useful success criterion is a lower time and cost per accepted deliverable with no increase in material factual defects or drop in diversity. Do not optimize by skipping product-fidelity checks, broadening tenant caches or concealing failed attempts.

[manual-page-break]: #

## 20. Capacity model: one to a thousand agencies

Scale using measured workload, not agency count alone. This scenario assumes three brands and five named users per agency. A direct brand with one operator is a separate starting case. Ten percent simultaneous active use is a planning assumption, not a concurrency prediction. Importing years of data and rendering video can dominate a small agency count.

| Stage | Scenario size | Engineering gate |
| --- | --- | --- |
| Local pilot | One brand, one operator | Evidence and workflow validated; no shared hosting |
| Hosted pilot | One agency, three brands, five users | Auth, permissions, durable jobs and cost reconciliation pass |
| Early service | Ten agencies, 30 brands, 50 users | Restore rehearsal, quota scheduling, fairness and support runbooks |
| Growth | 100 agencies, 300 brands, 500 users | Representative load test, partition/archive strategy and on-call coverage |
| Large service | 1,000 agencies, 3,000 brands, 5,000 users | Tested capacity at peaks, warehouse path, contractual SLOs and operational team |

Example ingestion envelope: 200 active ads x 30 days x two providers x five report grains is 60,000 rows per brand per month. At 3,000 brands that is 180 million monthly rows before retention, indexes or other streams. This is an intentionally simplified sizing example; report grains overlap and real cardinality varies. Do not put unlimited detail history in one hot operational database.

Keep recent normalized operational facts and aggregates in Postgres. Archive raw and older detailed facts as partitioned compressed objects; introduce a warehouse/query layer in the tenant home region when measured volume requires it. Partition by date and tenant-aware access pattern, not one table per agency by default. Avoid making a warehouse query part of an interactive generation request; publish validated aggregates/evidence back to operational views.

Separate interactive queues from backfills. At growth, allocate worker pools by task type and enforce tenant fairness. At large scale, shard hot tenants or dedicated accounts only after profiling demonstrates the need. Large regulated clients may require dedicated projects or deployments, priced separately. A shared Supabase project is a cost-efficient starting design, not a promise that one small database can host thousands of agencies unchanged.

## 21. Published vendor prices: the procurement baseline

The prices below were checked on official pages on 16 October 2026. They are price references, not a bill for this application. Free-tier thresholds, usage, credits, paid features and geography are different billing dimensions. Prices exclude tax. Annual figures are monthly equivalents with an annual commitment, not month-to-month prices. Do not buy every product in this table; several are alternatives.

| Service | Current price reference | What increases the bill |
| --- | --- | --- |
| Railway Pro | $20/month minimum including $20 usage | Resource use beyond included credit; service network transfer; optional products |
| Neon Launch | $0.106/CU-hour; $0.35/GB-month database storage | Active compute, retained change history, branches, snapshots, transfer and backend products |
| Clerk Pro | $25 monthly; $20/month annual equivalent | B2B add-on, retained orgs/users, SSO, machine usage, dashboard features |
| Clerk enhanced B2B | $100 monthly; $85/month annual equivalent | Retained organizations beyond allowance and separately metered features |
| Firecrawl Hobby | $19 monthly; $16/month annual equivalent; 5,000 credits | Endpoint credits, extraction options and top-ups |
| Firecrawl Standard | $83/month annual equivalent; 100,000 credits | Confirm month-to-month checkout price; top-ups and high-cost operations |
| Trigger.dev | Hobby $10 or Pro $50/month, with matching usage credits | Execution compute, run invocations and feature/concurrency add-ons |
| Supabase Pro | From $25/month; $10 compute credit | Additional projects/compute, usage, PITR, drains and other add-ons |
| Inngest Pro | From $99/month | Executions, concurrency, events, worker and observability add-ons |
| Upstash Redis PAYG | $0.20/100,000 commands | Storage/transfer beyond allowances and optional plans |
| Upstash QStash PAYG | $1/100,000 delivery attempts | Retries, transfer, schedules and features |
| Cloudflare R2 Standard | $0.015/GB-month, before free allowance | Request operations, optional products and storage class |
| WorkOS AuthKit | First 1 million monthly active users free | Enterprise SSO, directory connections, domains and other products |
| Vercel Pro | $20/month developer seat; usage credit applies | Extra developer seats and resource/add-on consumption |

Primary sources: [Railway](https://railway.com/pricing), [Neon](https://neon.com/pricing), [Clerk](https://clerk.com/pricing), [Firecrawl](https://www.firecrawl.dev/pricing), [Trigger.dev](https://trigger.dev/pricing), [Supabase](https://supabase.com/pricing), [Inngest](https://www.inngest.com/pricing), [Redis](https://upstash.com/pricing/redis), [QStash](https://upstash.com/pricing/qstash), [R2](https://developers.cloudflare.com/r2/pricing/), [WorkOS](https://workos.com/pricing) and [Vercel](https://vercel.com/pricing). For Firecrawl Standard and larger plans the fetched default presentation was annual. This workbook deliberately does not invent an exact monthly checkout number from a rounded annual discount.

Railway invoices must not be modeled as $20 plus the same first $20 of resource usage. Supabase's compute credit similarly offsets compute; it is not a second free production project. Trigger.dev's paid credits offset its usage, while LLM provider calls remain separately billed. Service availability targets are not a substitute for a contractual SLA and compensation terms.

Before purchase, record plan/cadence, region, quantity, quoted total, included allowance, overage behavior, hard-stop behavior, renewal and export procedure. The machine-readable pricing snapshot accompanies the document, with source links and explicit units. It is a dated reference, not a live price feed. The original platform budgets have been replaced by the more detailed model in chapters 32 and 33.

## 22. AI cost per output and accepted-unit economics

Separate vendor rates from the application's workload. A text price per million tokens does not reveal the price of an article: evidence preparation, outline, drafting, critique, repair and verification can each make a call. Image costs depend on model, dimensions, quality, reference inputs and edits. A script is text; a finished generated video has a separate, usually much larger, media budget.

Verified rate anchors: GPT-6.1 Sol Standard short-context lists $2 input and $10 output per million tokens; Claude Sonnet 5.5 lists the same base input/output rates. Their caching, batch, long-context and geography rules differ. These are comparison anchors, not a claim that both produce equivalent quality or that every installed account has access. Sources: [OpenAI model rates](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing). Official OpenAI documentation also distinguishes image inputs, outputs and tool charges: [API pricing](https://developers.openai.com/api/docs/pricing).

At that illustrative $2/$10 rate, 20,000 uncached input tokens plus 6,000 output tokens costs $0.10 for one call. A draft plus a second identical-cost pass costs $0.20. Actual output tokens, reasoning, cache writes/reads, reference processing and paid tools must be measured. Reusing a compact approved evidence pack is usually more controllable than repeatedly sending a whole resource library.

Google currently lists Gemini 3.1 Flash Image output equivalents of about $0.067 at 1K and $0.101 at 2K; its Lite Image lists $0.0336 at 1K, before additional inputs and text/thinking. The older Gemini 2.5 Flash Image pricing still appears on the page with a shutdown notice dated 2 October 2026. It is not a valid cheap launch recommendation. Source: [Gemini pricing and lifecycle notice](https://ai.google.dev/gemini-api/docs/pricing). Benchmark current available models instead of automatically choosing the newest or cheapest one.

The editable scenario uses deliberately rounded workload costs, not those rates as per-deliverable promises: 200 initial images at $0.12, 40 scripts at $0.05, four landing drafts at $0.30 and eight full articles at $0.40 per brand per month. Initial modeled generation is $30.40. A 20% additional-attempt allowance gives $36.48. Add a separate $20/brand allowance for source analysis, critiques and other AI calls: total $56.48/brand/month. This scenario produces 252 initial items, rather than guaranteeing 252 accepted deliverables. It includes no finished generated videos.

| Per-brand API scenario | Calculation | Monthly USD |
| --- | --- | --- |
| Image attempts | 200 x $0.12 x 1.20 | $28.80 |
| Script attempts | 40 x $0.05 x 1.20 | $2.40 |
| Landing draft attempts | 4 x $0.30 x 1.20 | $1.44 |
| Article attempts | 8 x $0.40 x 1.20 | $3.84 |
| Other AI allowance | Explicit additional monthly allocation | $20.00 |
| Total | Generation and other AI | $56.48 |

The calculator treats the other-AI allowance as an independent monthly input; it does not multiply it by the repair fraction again. Each modality has its own human-review time. Sample assumptions are 0.5 minute per image attempt, two per script, ten per landing draft and fifteen per article. Applied to this workload and 20% additional attempts, that is 6.8 hours/brand/month, or $102 at an assumed $15/hour. That rate is a cost assumption, not a US editor wage estimate. US specialist review or regulated claims can cost substantially more.

The simplified image estimate is 200 x 1.20 x 70% = 168 accepted images, capped at the initial target. API image cost is then $28.80/168, about $0.171 per accepted image. This is an expectation under an equal-quality assumption, not a guarantee or a forecast of independent repair outcomes. Enter actual accepted counts after a pilot. Do not let generating more copies inflate the acceptance score. To promise 200 accepted pieces at a stable 70% yield requires about 286 total attempts before rounding/variance, so a fixed 240-attempt allowance may be insufficient.

Measure all paid attempts, accepted revisions, review minutes and delivery time. Keep factual/claim defects, visual identity errors and duplicate concepts separate. Invoice reconciliation, approved evidence and human sign-off establish reliability; an LLM's self-reported quality score does not establish truth.

## 23. Commercial structure and cost controls

Charge for the workflow and service level, with metered consumption that reflects variable generation cost. A practical structure is a platform base per agency, included active brands and named seats, a clear allowance of generation credits, and separately priced overage, video or dedicated infrastructure. Keep onboarding/implementation and managed creative review as explicit services where provided.

Do not sell unrestricted image/video volume against an unbounded provider bill. Define a credit unit using your actual weighted cost ledger; disclose which operations consume it, including whether repairs are included. Offer a hard stop, approval-to-overrun or prepaid top-up. Limit concurrent jobs and maximum single-job estimates independently of monthly credits.

BYOK can remove a portion of provider pass-through billing, but it does not remove infrastructure, orchestration, quality, support or review cost. Bind each client's key to its own connection and approved destinations. Never silently fall back to the platform key when a client's balance or quota is exhausted.

A price floor can be calculated as: required revenue = fully loaded variable and allocated service cost / (1 - target gross margin). This is a planning formula, not a market price recommendation. Validate willingness to pay and service outcomes with pilots. Keep engineering investment, sales and corporate overhead visible when calculating operating profit rather than calling contribution margin profit.

Provide agencies a usage page by brand, user, job, format and provider: reserved cost, settled cost, pending reconciliation, accepted outputs and remaining allowance. Reconcile external invoices monthly and investigate material differences. A billing dispute must be traceable to immutable request IDs without exposing another tenant's data.

[manual-page-break]: #

## 24. Security, privacy, retention and recovery

Threat model cross-tenant reads, leaked tokens, prompt injection from uploads, untrusted URLs, poisoned evidence, excessive generation spend, webhook replay and support access. Treat all uploaded text and fetched websites as data, never system instructions. Restrict fetching to intended public hosts and block internal network access; scan and constrain file types/sizes before parsing.

Use secrets management and encryption in transit and at rest. Separate development/staging/production; use synthetic fixtures in tests. Require MFA for privileged operators, scoped deployment credentials, dependency scanning and reviewed production changes. Log security-relevant actions with actor, tenant, object, timestamp, action and outcome. Keep token values and raw sensitive payloads out of logs.

Define retention by purpose and contract. An initial policy proposal is short-lived raw debugging data, bounded detailed marketing history, versioned approved evidence and deliverables for the agreed service period, and a separate audit retention period. These durations require client/legal approval; do not choose indefinite retention by default. Implement source deletion, derived evidence invalidation, vector/cache removal, exports and backup-expiry behavior as one documented workflow.

India-only hosting is a separate customer option; it is not the default for the US product and not a claim that all Indian privacy law mandates full localization. The final Digital Personal Data Protection Rules 2025 have phased commencement; as of this plan date, do not assume every rule is already effective. Review applicability, processor agreements, notices, rights handling, breach response and cross-border processing with qualified counsel. Sources: [MeitY rules and implementation materials](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa) and the [official notification](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).

Set pilot recovery objectives explicitly: for example, a proposed RPO of 24 hours and RTO of one business day while manually operated; strengthen them before contractual scale. Test a full restore into an isolated environment in the approved recovery region and verify resources, tenant permissions, secrets references and job reconciliation. Backups that have never been restored are not sufficient evidence of recoverability.

## 25. Operations and reliability

Instrument request latency, job wait/run time, provider error class, quota utilization, data freshness, row counts, reconciliation gaps, cost reservation age, acceptance rate and repair rate. Break metrics down by task/provider without putting private content into labels. Tenant-specific dashboards require authorization just like client outputs.

Initial hosted objectives are targets to validate: ordinary reads p95 under one second at the tested load; accepted-job acknowledgement under two seconds; eligible incremental reporting usually within an hour after provider availability; no silent lost jobs; no approved material factual defects. Generation latency is provider/format dependent and should be shown as a measured range. Do not promise these before instrumentation and load tests.

Runbooks must cover expired tokens, permission removal, provider outage, rate-limit storm, missing report, duplicate webhook, worker crash after paid submission, delayed cost settlement, wrong client mapping, evidence contamination and emergency access revocation. Define who is paged, who informs the client and who can authorize a rollback.

Use separate health indicators: app available, queue draining, connection authorized, data current, evidence sufficient and output quality. A green home page does not mean a brand's reports are current. Display the last successful sync and what the latest failed sync affected.

At ten agencies, designate an operational owner and backup. At 100, establish real on-call coverage and customer support escalation. At 1,000, fund reliability, security and data operations as ongoing functions. Staffing needs depend on automation and service promises; do not infer a fixed headcount from this illustrative agency model.

## 26. Implementation backlog and ownership

Treat this as staged engineering work with external approval dependencies. Chapter 35 adds person-week and investment scenarios; these are planning estimates rather than fixed-price commitments. The following sequence can structure 30/60/90-day planning, but dates require a codebase migration spike and actual team capacity. API review timelines are outside the team's control.

| Work package | Owner and dependencies | Acceptance evidence |
| --- | --- | --- |
| A. Blank client pilot | Product/operator; approved resources | Empty start, accurate facts, small reviewed batch, measured defects/cost |
| B. Identity and tenancy | Backend/security; hosting decision | Invitations, membership, brand grants, negative route/action tests |
| C. Storage and repositories | Backend/data; B schema | Postgres paths, private objects, migration/rollback reconciliation |
| D. Durable production | Backend/platform; B/C | Resume after crash, scoped workers, reservations, unknown-cost handling |
| E. First read-only connector | Data/integrations; OAuth apps and C/D | Known-day reconciliation, backfill/checkpoints, revocation and quota tests |
| F. Other connectors | Integrations; E framework | Independent scopes, account bindings, data-quality and version tests |
| G. Collaboration | Full-stack; B/D | Revision approvals, Slack identity mapping and signed replay-safe actions |
| H. Quality and evaluation | Creative/product; client evidence | Blind eval set, diversity, source coverage and bounded repairs |
| I. Billing and operations | Platform/finance; D | Usage/invoice reconciliation, hard stops, restore and incident rehearsal |
| J. Growth readiness | Engineering lead; representative traffic | Load/capacity report, retention/archive plan, support/on-call readiness |

Suggested first 30-day focus: the local pilot, migration inventory, chosen-region deployment spike, identity, scoped repository/storage vertical slice and one durable production path. Days 31-60: one read-only connector, reconciliation, remaining production migration, review roles and a small hosted agency pilot. Days 61-90: additional connectors, Slack, billing, observability and measured ten-agency readiness. Adjust rather than compressing security/data gates to meet a calendar.

## 27. Release gates from one brand to scale

One-brand local gate: only current client resources, correct product/offer, no inherited examples, explicit spend authorization, useful accepted pilot, backup and export verified.

One-agency hosted gate: all routes authenticated; brand grants enforced; signed private asset access; tenant-aware workers, credentials and retrieval; durable progress and cost ledger; one connector reconciled; roles/reviews tested with separate user accounts; restore demonstrated. Do not invite external users until these pass.

Ten-agency gate: no cross-tenant access in adversarial tests; fair queue scheduling under backfill load; quota-aware connector operation; automated stale-data signals; provider invoice reconciliation; known incident response; migration rollback tested; support owner and client onboarding checklist in use.

100-agency gate: representative load test including generation bursts, large imports and exports; measured database/queue bottlenecks; partition/archive plan operating; p95 targets met at declared concurrency; monitoring alert drill; recovery objectives demonstrated; permission review and security review completed.

1,000-agency gate: validated peak workload and failure headroom; warehouse/detail retention design in operation; dedicated-tenant option where required; tested regional recovery decision; operational staffing and contractual service levels; predictable accepted-unit economics. Repeat load tests after meaningful workload/model/provider changes.

Each gate produces a report with test inputs, environment, results, limits and open defects. Passing an earlier gate does not imply later capacity. If quality, access, reconciliation or cost cannot be demonstrated, hold the relevant capability while other standalone workflows remain available.

## 28. Practical next actions and definition of success

The operator's next action is to create the new client in the clean installation and build a verified evidence pack. The engineering team's next action is a US-region deployment and migration spike, retaining an India path, followed by identity plus one complete authorized resource-to-artifact workflow. The integration team's next action is to collect account ownership and provider approval prerequisites before writing every connector simultaneously.

Success for the first client is a small approved body of work that accurately represents the product, demonstrates useful creative range and has a measured cost and review time. Success for the first agency adds safe team access and trustworthy read-only data. Success at scale adds fair throughput, recovery, support and predictable economics without weakening those boundaries.

Keep a programme register with objective, decision owner, current stage, client count, tested load, data region, provider approvals, open risks, accepted-output metrics, spend and the next gate. Review it weekly with evidence. The plan is meant to make implementation decisions inspectable and correctable, including when a pilot exposes a failed assumption.

No live accounts, cloud resources, subscriptions, Slack messages or paid generation are created by this document. Those actions happen during explicit onboarding and deployment once their concrete configuration and destination are known.

## 29. US market, India operations and regional migration

Serving US clients from an India-based company or team is technically feasible. The infrastructure location, the legal seller, the support team and the buyer's location are separate choices. Select US East for US users' interactive work unless a customer requires another geography. Store country/currency/timezone per brand and preserve provider account settings; US customers need US English, relevant commercial terms, date conventions and claim review, independently of where engineers work.

### What would become an issue

The avoidable technical problem is a chatty cross-ocean request path: US browser -> US application -> India database for several serial queries. Each round trip adds delay. Putting only a frontend CDN in the US does not move those database queries. Co-locate database, web origin and workers in the same metro where practical, then measure cross-provider RTT. Railway Virginia and Neon AWS Virginia are geographically close, but not a guaranteed private same-cloud network. Use TLS and a connection pool; budget public-network transfer. Do not assume that matching a region label removes networking charges or automatically grants private connectivity.

The procurement problem is promising US-only processing when an AI vendor, scrape service, workflow payload store, support log or backup can process elsewhere. A US database alone does not solve this. List each subprocessor and what it receives. Restrict Firecrawl to approved public pages; do not put private client documents or access tokens into crawl requests. Send AI providers only the authorized evidence needed for the job. Review available regional inference endpoints, data retention terms and any price premiums before making a locality promise.

The service problem is an India-only support schedule sold to US agencies as immediate business-hours support. Publish response windows in the customer's timezone, route incidents to an owner and provide asynchronous job status. Price live coverage separately. The commercial problem is treating payment processing, FX, taxes, refunds and sales costs as zero. Those are not included in the cloud prices and depend on the billing entity, payment method and customer jurisdictions.

The legal/privacy assessment depends on data collected, customer contracts and applicable thresholds. US hosting does not itself establish compliance. Minimize data to product, creative and aggregate marketing facts; avoid customer-level order identities unless necessary and authorized. Define processor contracts, deletion/return, access controls, incident response and remote support access. The [California Attorney General's CCPA guidance](https://oag.ca.gov/privacy/ccpa) explains the rights and business framework; use a qualified adviser to determine applicability rather than assuming every agency has identical obligations. The [official Indian DPDP rules notification](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf) has phased commencement. Do not turn a preference for India into an unsupported blanket localization claim.

### Start US now, or move later

If the first client does not require India-only data, deploy the hosted pilot in US East from the start. This avoids paying for an unnecessary regional migration. The current blank local repository has no hosted client database to relocate. Region selection can therefore be made before importing any production client data.

If the first client requires India, keep that client in an India deployment and onboard later US clients into a separate US deployment. Add agency.home_region, deployment_id, residency_policy and approved_processor_policy to the control-plane design. Route agency traffic to its home deployment. Keep data stores, queues, credentials and backups region-scoped. A global account directory should contain minimal routing metadata and must itself be assessed; it must not become a second copy of every brand's content.

Moving an existing agency is a migration project. Inventory rows, objects, active jobs, webhooks, secrets and grants; obtain the appropriate client authorization; provision a new target; rehearse export/import and checksums; pause writes and drain work; move data with a final delta strategy; update routing and webhook handling; verify counts, samples and permissions; resume limited traffic; retain a bounded rollback copy; delete the old live data under the agreed retention policy. Prefer a scheduled pilot cutover before building complex cross-region dual writes. Neon's [region guidance](https://neon.com/docs/introduction/regions) states that moving an existing database requires a new project and migration. A same-project database branch is not a second-country deployment.

For two regional cells, budget duplicated base services, staging/recovery work and support. They do not necessarily cost exactly twice as much because workloads differ, but neither is the second region free. Begin with region-aware identifiers and a storage adapter; implement full regional routing when a real second-region customer justifies the operational work.

## 30. Agent tooling: what the four named platforms actually add

Use agent-friendly infrastructure to make reviewed changes faster, reproducible and observable. Score the tooling separately from application quality and tenancy. An MCP connection is a way for a coding agent to operate a service; it is not evidence that the service automatically understands agency permissions, reconciles marketing data or produces accurate advertising.

### Railway: container delivery and operations

Railway fits the existing Next.js container, media dependencies and custom workers. Its CLI/MCP can inspect and manage deployments. Current documentation describes a hosted MCP endpoint and a CLI bridge; the default hosted path requires CLI 5.44.0 or later. See [Railway MCP](https://docs.railway.com/cli/mcp). This can shorten deployment/debug cycles when used with reviewed configuration, health checks and rollbacks. It does not replace our job ledger, application authorization or a production database migration.

Deploy the web app as a stateless service. Store all persistent artifacts in Postgres/private objects. Use separate temporary work directories for renders. A horizontal replica must not depend on a local brand folder or one machine's SQLite file. Keep custom rendering workers separate from user-facing web memory. If Trigger.dev executes a task, do not also count an always-on Railway worker for that same execution unless it actually exists.

Railway's current [price page](https://railway.com/pricing) lists memory $0.00000386/GB-second, CPU $0.00000772/vCPU-second, service egress $0.05/GB and object storage $0.015/GB-month. Its [bucket billing documentation](https://docs.railway.com/storage-buckets/billing) says API operations and bucket egress are free, while a Railway service uploading to a bucket still incurs public-network service egress. Route user downloads directly through authorized signed URLs where the selected storage supports that flow. Check feature and location needs before choosing it over S3.

Use narrowly scoped deployment credentials for staging first. Do not grant the product's runtime agent the infrastructure owner's token. Production changes should have an inspectable diff, targeted environment, cost estimate and rollback. Multi-region web replicas do not make a single-region database resilient to a regional outage: [Railway failover guide](https://docs.railway.com/guides/multi-region-api-failover).

### Neon: Postgres branching and agent development

Neon's strongest fit here is managed Postgres with quick isolated development branches, pooled access and programmable project operations. Its MCP can manage projects, query and change schema, with a warning about broad management access. Source: [Neon MCP overview](https://neon.com/docs/ai/neon-mcp-server). Use synthetic or appropriately sanitized branch data for agent development. A branch of live client data remains client data; copying it into development is not anonymization.

Do not use one branch per brand as an automatic tenant-security model. Use organization/brand keys and enforced policies in a shared database for ordinary clients, with dedicated projects for justified isolation needs. Use migration branches for preview/review, give them expiry and watch retained history. [Branching documentation](https://neon.com/docs/introduction/branching) explains the platform primitive; application tenancy is still ours to implement.

Neon is no longer accurately described as database-only: current documentation includes Managed Better Auth, objects, functions, gateway and realtime, with product availability varying by region. Postgres and managed auth are listed across its AWS regions; other backend features are not available everywhere. See [Neon regional product availability](https://neon.com/docs/introduction/regions). These are credible consolidation candidates, not an excuse to assume feature parity or production suitability without a pilot. Compare their real permission, backup and runtime behavior before adding a second auth/storage system.

For frequent imports or status polling, the database may remain awake. Model active CU-hours rather than multiplying every calendar month by a tiny assumed activity fraction. Long-running queries and retained branches can remove the saving you expected from scale-to-zero. Keep a tested restore/export path and a migration contract independent of the provider console.

### Clerk: identity, agency membership and app permissions

Clerk can speed sign-in, invitations and organization switching. Its current free allowance is 50,000 monthly retained users and 100 retained organizations; basic organizations have a 20-member limit. The enhanced B2B add-on supplies features such as custom roles and unlimited members. Source: [Clerk pricing](https://clerk.com/pricing). The product should map one agency to one organization and retain brands beneath it. Creating an auth organization per brand can change both the access model and the bill.

Keep app-owned brand grants, integration permissions, revision approvals and budget authority in Postgres. Clerk authenticates the actor and can supply organization context; our server still validates that the requested brand belongs to the organization and that the membership is current. A signed organization ID is not permission for every action. Removing membership must revoke future job submission and signed-object access; do not wait for a stale browser state to update.

At 1,000 qualifying organizations and 5,000 retained users, model monthly Pro $25 + enhanced B2B $100 + 900 x $1 organization overage = $1,025 before other features. This is derived arithmetic using published thresholds, with one active qualifying org per agency. At 100 such agencies, user/org volume remains within the free allowances, but selected paid features still cost money. [Clerk's current pricing explanation](https://clerk.com/articles/clerk-pricing-explained) distinguishes retained users from conventional active-user counts. Enterprise SSO is a separate connection model and must be quoted for the client's needs.

Clerk's AI guidance documents agent-assisted development, MCP-related resources and machine-to-machine auth. See [Using Clerk with AI](https://clerk.com/docs/guides/ai/overview). Distinguish a development assistant configuring identity from a customer-facing agent acting under delegated permissions. Neither should use an agency owner's session as a shared service credential.

### Firecrawl: public research and ingestion

Use Firecrawl to turn an approved website into structured source material and to refresh selected pages. It can reduce custom scraping work and offers [MCP tooling](https://docs.firecrawl.dev/mcp-server). It does not replace authenticated Meta, Google or Shopify account connectors. It also does not establish that scraped claims are true, current or licensed for reuse.

A basic page scrape uses one credit; search, extraction and browser work meter differently. JSON output on scrape/crawl adds credits. The autonomous Agent endpoint is dynamically priced. Its free allowance changed to recurring credits in current docs; old comparisons quoting only a one-time 500-credit grant are stale. See [Firecrawl pricing](https://www.firecrawl.dev/pricing) and [billing rules](https://docs.firecrawl.dev/billing). Keep deterministic crawl + bounded parse as the default onboarding flow and make open-ended research a separately capped operation.

Our implementation should discover a limited sitemap/URL list, allowlist the host, bound pages/depth/bytes, cache by canonical URL and content hash, prefer fresh product/offer pages, store timestamp/source rights and show contradictions for review. Prevent server-side request forgery and treat fetched instructions as untrusted text. A returned 403/404 document is not a valid product fact even if the scrape is billable.

For example, 300 brands x 100 basic page refreshes/month is 30,000 credits, before search, JSON or new-site intake. Repeating 500 pages daily would be 15,000 pages/brand/month and change the economics dramatically. Do not crawl everything every time someone writes a headline. Enterprise zero retention, dedicated terms and region commitments require separate confirmation: [Firecrawl enterprise](https://www.firecrawl.dev/enterprise).

## 31. Alternatives, overlap and a sensible buying sequence

The fastest initial implementation usually comes from a few coherent components. Avoid paying for overlapping auth, database APIs, queues, workflows and vector stores simply because each has a convenient MCP server. The following recommendations are engineering judgments for this codebase, with published pricing anchors in chapter 21.

| Stack option | What to use | Tradeoff and decision |
| --- | --- | --- |
| A. Preferred US modular stack | Railway + Neon + Clerk + Trigger.dev + private objects; Firecrawl for web intake | Strong developer/agent workflow and B2B UX; more vendors and explicit integration work |
| B. Consolidated managed backend | Railway + Supabase US East Auth/Postgres/Storage + one workflow system | Fewer integrations and low pilot base; build agency/brand membership carefully |
| C. Neon backend consolidation | Railway + Neon Postgres/Managed Better Auth plus selected regional backend products | Potentially fewer bills; prove maturity, limits and access model in a spike |
| D. Enterprise identity variant | A or B with WorkOS instead of Clerk | Consider when enterprise SSO/IT onboarding drives sales; connection costs differ |
| E. India deployment | DO Bangalore/AWS Mumbai + Supabase Mumbai + S3/SQS Mumbai | Meets selected core-data placement; review all external processors independently |
| F. Single-cloud control | AWS regional containers, managed Postgres, S3, SQS, secrets/logs | Stronger network/IAM consolidation; larger operations and infrastructure workload |

Supabase Pro includes managed database, auth and storage allowances, but compute upgrades, extra projects, logs and recovery options cost more. Its current PITR add-on starts at $100/month; do not silently include it in a $25 pilot estimate. Its MCP is useful for development and should use project-scoped permissions: [Supabase pricing](https://supabase.com/pricing), [MCP docs](https://supabase.com/docs/guides/ai-tools/mcp). If using Supabase Auth, Clerk is optional rather than a mandatory second authentication invoice.

WorkOS AuthKit's free user allowance is generous, while SSO and directory connections are separate products; the first published SSO band is $125/connection/month. Its custom domain and support terms also affect the bill. Source: [WorkOS pricing](https://workos.com/pricing). Better Auth is a framework-level alternative with more ownership and deployment responsibility: [Better Auth introduction](https://better-auth.com/docs/introduction). A free auth library does not mean zero engineering, email, security or operational cost. Do not mix an own-hosted library's economics with Neon's managed auth as though they are identical services.

Trigger.dev is the preferred initial workflow candidate because this app has long-running TypeScript production tasks and media jobs. Use waits/checkpoints and concurrency controls, with the app's own durable job/cost IDs. Its managed workers and invocation/compute charges belong in the cost ledger. An Inngest design is also viable, particularly if event-driven steps are the stronger fit, but its current Pro base is $99 and executions count function runs plus steps. These systems are alternatives for a given workflow, not two reliability layers to buy by default: [Trigger pricing](https://trigger.dev/pricing), [Inngest pricing](https://www.inngest.com/pricing).

Upstash Redis is a candidate for distributed rate limiting or cache state. QStash is a simpler durable HTTP delivery/scheduling option, with each delivery retry billable; the endpoint still needs actual compute and idempotent processing. It is not a substitute for transactionally reconciling a paid generation call. Prefer one queue/workflow approach until measured needs justify another. Sources: [Redis pricing](https://upstash.com/pricing/redis), [QStash pricing](https://upstash.com/pricing/qstash).

Cloudflare R2 has low object-storage/egress pricing, but location hints are not a country-specific residency promise. Its documented jurisdictions do not justify equating the default North America location hint with a blanket US-only processing agreement. Use S3 in an explicit region for clients with that requirement, subject to the full processor review. Sources: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [R2 location controls](https://developers.cloudflare.com/r2/reference/data-location/), [S3 pricing components](https://aws.amazon.com/s3/pricing/).

Vercel is a strong alternative for the Next.js web delivery layer, particularly if previews and the integrated frontend workflow are the deciding advantage. Current offerings include workflows and other execution products; the old blanket claim that it can never run background/agent workloads is out of date. For this existing container/media code, Railway is the initial fit judgment, while a Vercel design still needs workload-specific limits and prices. Sources: [Vercel pricing](https://vercel.com/pricing). Render also offers CLI/MCP, web services and workers, so agent support is not unique to Railway. Its fetched pricing page did not expose usable current numeric rates; obtain a current quote before making a cost claim: [Render pricing](https://render.com/pricing).

DigitalOcean is not excluded for lacking agent tooling: current docs link a CLI and MCP reference. App Platform lists $25/month shared 1-vCPU/2-GiB and $39 dedicated 1-vCPU/2-GiB containers, each per component. It remains a regional India option and a US alternative: [current pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/), [availability](https://docs.digitalocean.com/products/app-platform/details/availability/). AWS is also programmable; agent-native branding is a weaker selection criterion than tested access controls, operations and total delivery time.

Buy in order: one production web environment and database; one identity approach; one durable production path; private object storage; a small bounded web-intake allowance; essential monitoring and backups. Add cache, enterprise identity, additional regions, warehouses and sandboxes only when an acceptance gate or actual customer requirement calls for them.

## 32. Bottom-up monthly platform cost: one brand

This is a transparent example of the recommended US modular stack. It assumes modest usage, no high availability promise, limited retention and no generated video. Numbers marked allowance are engineering budgets, not quoted vendor line items. Use actual account usage after the pilot. The source price snapshot and offline calculator are included with this workbook.

| Component | Monthly scenario | Basis |
| --- | --- | --- |
| Railway web/custom compute and service egress | $40.00 | Allowance above the $20 minimum; workload dependent |
| Neon database and history | $40.91 | 0.5 CU x 720 active hours x $0.106 + 5 GB x $0.35 + 5 GB-month history x $0.20 |
| Clerk Pro | $25.00 | Monthly production plan; no enhanced B2B assumption |
| Trigger.dev Hobby | $10.00 | Usage within included credits; not $10 plus those same credits |
| Firecrawl Hobby | $19.00 | Monthly plan; basic intake within allowance |
| Private objects, requests and delivery | $5.00 | Allowance; quote selected region/network paths |
| Monitoring, secrets, email and restore work | $25.00 | Allowance; mix of consumption and small service plans |
| Staging and deployment overhead | $25.00 | Allowance; no copy of private production data |
| Platform total | $279.91 | Rounded to $280 in scaling examples |

The Neon arithmetic uses Launch's published compute/storage/history units. A permanently active one-CU database costs $76.32 in compute alone for a 720-hour month; the price page's typical $15 example is not a price ceiling. At 0.5 CU for 240 hours the compute term would instead be $12.72. Use the actual compute floor, active hours, chosen plan and measured imports. Paid history and staging can change both cases. [Neon pricing](https://neon.com/pricing).

A Railway usage illustration, independent of the $40 allowance: 2 average GB of memory plus 0.30 average vCPU continuously over a 30-day month uses 2,592,000 seconds. At current published rates that is $20.01 memory + $6.00 CPU, plus $1 for 20 GB service egress, or about $27.01. The Pro bill is max($20, eligible resource usage) before other products/charges, not $47.01. This is a sizing input, not measured CPU demand or a claim that two GB is sufficient for every render. [Railway resource pricing](https://railway.com/pricing).

Trigger.dev Small 1x has a published $0.0000338/second compute rate and $0.000025 per invocation. 10,000 runs of ten executing seconds use $3.38 + $0.25 = $3.63 before any other usage; that fits a hypothetical $10 included-credit allowance. If a worker spends 120 executing seconds on each of 100,000 runs, compute alone becomes $405.60. Checkpointed waits and ordinary waiting inside executing code have different implications; measure the actual billable runtime. [Trigger pricing](https://trigger.dev/pricing).

The lean consolidated alternative is an illustrative $20 Railway + $25 Supabase + $10 workflow + $19 Firecrawl + $20 operations + $15 staging = $109/month. It assumes low consumption, uses Supabase Auth/Storage and has no separate Clerk or Neon invoice. It does not include PITR, strong SLA, enterprise SSO, expensive rendering or high-volume delivery. This is a valid cost-sensitive option to test, not the cost of the preferred modular stack.

Annual payment changes cash flow. Clerk's annual equivalent would be $240/year for Pro, rather than $25 paid each month. Firecrawl displays annual equivalents for several tiers; verify the full checkout amount and renewal. Do not turn a fractional monthly comparison into a cash budget without recording the annual charge. Keep a reserve for tax, FX and unused commitments. Prefer monthly procurement during the validation stage.

## 33. From one brand to 1,000 agencies: cost and staffing scenarios

Assumptions are three brands and five retained users per agency; 200 initial images, 40 scripts, four landing drafts and eight articles per brand/month; 20% additional attempts; $20 other AI/brand; the review times in chapter 22 at $15/hour. These are invented planning inputs for sensitivity analysis, not actual customers, measured acceptance or a capacity guarantee. The one-direct-brand row has one brand rather than three.

| Scale | Brands / users | Monthly platform allowance |
| --- | --- | --- |
| Direct brand | 1 / 1 | $280 |
| One agency | 3 / 5 | $320 |
| Ten agencies | 30 / 50 | $1,050 |
| 100 agencies | 300 / 500 | $6,500 |
| 1,000 agencies | 3,000 / 5,000 | $40,000 |

The platform allowance includes shared compute, database, identity, workflows, scraping, objects, logs, staging and an operational infrastructure reserve. It excludes AI generation, people, sales, corporate overhead, tax and finished video. It is deliberately not derived by multiplying one small paid plan by the number of tenants. At 100 and 1,000 agencies, actual load tests, support contracts and warehouse/retention decisions are required. Large-scale allowances are planning envelopes and may be exceeded.

| Scale | Platform + AI/month | Review + support/month |
| --- | --- | --- |
| Direct brand | $336.48 | $152.00 |
| One agency | $489.44 | $406.00 |
| Ten agencies | $2,744.40 | $4,060.00 |
| 100 agencies | $23,444.00 | $40,600.00 |
| 1,000 agencies | $209,440.00 | $406,000.00 |

Support assumptions are $50 for one direct brand or $100/agency/month. This is an allocated service-cost input, not a vendor subscription or staffing quotation. Review is $102/brand/month from 6.8 hours. Total modeled direct service cost therefore becomes $488.48, $895.44, $6,804.40, $64,044 and $615,440/month respectively. Keep a 20% cash contingency on platform plus AI during pilots: that reserve is additional to these figures and is not a booked expense until used.

For self-serve SaaS, clients do their own editorial review; do not put the same review labor in our COGS and charge it again as a managed service. Still include our actual support and quality operations. For managed service, include the review time, rework, account management and coverage actually promised. At 3,000 brands, 6.8 hours/brand is 20,400 review hours/month, equivalent to 127.5 full-time schedules at an assumed 160 available hours before leave, utilization and management. This explains why managed creative operations cannot be priced like unlimited software usage.

The platform allowance can be examined by layer:

| Layer | Ten agencies/month | 100 agencies/month |
| --- | --- | --- |
| Web/custom compute | $200 | $1,200 |
| Database/history | $200 | $1,000 |
| Identity | $125 | $125 |
| Workflow compute | $100 | $700 |
| Scraping allowance | $25 | $125 |
| Objects/network | $100 | $700 |
| Monitoring/secrets | $100 | $650 |
| Staging/recovery/infrastructure reserve | $200 | $2,000 |
| Total | $1,050 | $6,500 |

These layer numbers are budgets, not current invoices. At 1,000 agencies the $40,000 allowance decomposes into $7,000 web/custom compute, $8,000 database/warehouse, $1,025 identity, $4,000 workflow, $1,000 scraping, $6,000 objects/network, $3,000 observability/secrets and $9,975 staging/recovery/infrastructure reserve. Enterprise procurement can change identity and other numbers; obtain quotes before signing an SLA.

Use provider quotas and burst models to size capacity. In the chapter 20 ingestion example, 3,000 brands can create 180 million raw report rows/month; at an assumed one KB each this is 180 GB uncompressed before indexes, logs and retention. This is not a measured schema size. Keep detailed history out of the hottest transactional tables and cost archive scans explicitly. A few thousand users is not evidence that a tiny operational database can sustain the ingestion workload.

At the example content volume, 3,000 brands request 600,000 initial image attempts/month; a 20% attempt allowance is 720,000. At an illustrative 30 seconds of provider processing per attempt, average concurrency across a 30-day month is about 8.33; a tenfold burst would need about 83.3 in-flight slots before other work. This is a simplified throughput model, not a current provider latency or approved quota. Quotas, budget limits, review capacity and client delivery windows all constrain real volume.

## 34. Sensitivity analysis: what can make the bill large

The expensive errors are unrestricted repeats, low acceptance, long-running media, excessive source context, high-frequency recrawls, unbounded retention, duplicate data imports and human work disguised as free software. Instrument them before negotiating fixed output commitments.

For images, moving from a $0.12 to $0.30 average attempt changes 240 monthly attempts from $28.80 to $72 per brand. The difference across 3,000 brands is $129,600/month. These are hypothetical blended attempt prices. Do not choose a cheaper model that increases factual/identity failures and review time enough to erase the saving. Evaluate accepted outputs per dollar and per reviewer hour.

For text, doubling article length does not necessarily double total cost because source intake and planning may be fixed. It can increase output tokens and review time. Prefer intent-complete articles with concrete examples and evidence over a word-count target alone. Reserve a distinct quality budget for long SEO pieces, source checking and expert review. Ensure the configured output limit can contain a full article plus structured metadata without truncation.

Finished video is excluded from all base scenarios. As a sensitivity example only, 20 videos/brand x 30 seconds x an assumed $0.20/generated second x two charged takes costs $240/brand/month in generation. Add voice, music licensing, editing, rendering, storage and review. Across 3,000 brands that hypothetical media subtotal is $720,000/month. This is not a current model quote. Quote a selected model, resolution, audio option and retry policy before selling video credits.

For crawling, distinguish first onboarding from ongoing change refresh. Retain a content hash, snapshot version and approved fact changes. A client with 10,000 products is not a typical 100-page brochure site. Cap new-site intake and make large catalogues an explicit backfill project. Avoid paid autonomous research when a bounded sitemap fetch or an authorized product export is enough.

For storage, object retention grows cumulatively. An illustrative 200 images x 5 MB x 1.20 is 1.2 GB/brand/month before previews, variants and source media. At 3,000 brands, that is 3.6 TB of new image bytes/month; twelve retained months would be 43.2 TB before deletions or other media. At R2's published standard storage rate, storage alone would be about $648/month before allowances/requests, but this does not establish a US-only location or cover application egress and other vendors. [R2 pricing](https://developers.cloudflare.com/r2/pricing/). Video and downloads can dominate the storage term.

Control cost in this order: avoid duplicate work through content hashes/idempotency; reuse approved facts; batch independent low-urgency tasks; route simple classification to a tested smaller model; generate low-cost contact sheets before selected final renders; repair only failed sections/elements; limit retries; use signed direct asset delivery; expire previews/branches; archive detail; reconcile provider invoices. Keep a daily operational cost report and weekly accepted-unit review.

The calculator now separates per-format review time, other AI, support, infrastructure, payment percentage, contingency and target margin. It also provides Railway, Neon, Clerk and Trigger unit calculators. No network calls are made. A scenario does not authorize spend and does not change any account limit.

## 35. One-time build cost, rollout effort and commercial pricing

Cloud subscriptions are only a fraction of the cost to make the local starter a reliable multi-agency platform. The code already provides useful creative workflows, but hosted authorization, storage replacement, connectors, reconciliation and billing remain substantial implementation. Do not describe a few platform subscriptions as the all-in cost of finishing the product.

| Work package | Estimated person-weeks | Exit evidence |
| --- | --- | --- |
| Region/vendor spike and migration inventory | 1-2 | One scoped upload-to-artifact path, measured latency/cost |
| Identity, organization and brand permissions | 2-4 | Negative access tests, invitations/revocation, audit |
| Postgres/object migration and durable production | 3-6 | Restart safety, complete storage inventory, restore |
| First read-only connector and normalization | 2-4 | Account binding, known-day reconciliation, backfill |
| Additional connectors | 3-6 | Separate scopes, versions, quotas, revoke behavior |
| Slack, review roles and usage/billing ledger | 2-4 | Signed revision approval, metering and invoice checks |
| Quality evaluation and hosted pilot hardening | 2-4 | Blind eval, load/restore/security and rollback report |
| Total planning range | 15-30 | Before new requirements or provider approval delays |

These are my engineering estimates for experienced contributors, not vendor delivery promises. Person-weeks are not calendar weeks; some work overlaps and some depends on prior migration. With 40 hours/person-week, the range is 600-1,200 hours. At an assumed blended $50/hour, labor is $30,000-60,000; at $100/hour it is $60,000-120,000, before contingency, legal work, external audits or acquisition. Existing in-house labor still has an opportunity cost even if it does not generate a contractor invoice.

Coding agents can accelerate scaffolding, migrations, tests, connector boilerplate and documentation. They do not remove product decisions, account ownership, API app reviews, credential approvals, factual review or real deployment testing. Use feature acceptance to measure speed. A claim that parallel agents guarantee a production-ready SaaS in a day is not supported by this plan.

An appropriate first commercial offer can combine agency platform access, active brand limits, named seats and a bounded generation allowance. Sell onboarding/data backfill as a separate service when significant. Charge managed editorial/creative review separately from self-serve software. Price enterprise SSO, dedicated infrastructure, special residency, custom connectors and finished video from their actual incremental costs and support obligations.

Cost-based price floor: if C is recurring direct cost, m is desired contribution margin and f is an assumed payment fee fraction of revenue, price must be at least C/(1-m-f), provided m+f < 1. This is not a willingness-to-pay estimate, tax-inclusive price or operating-profit guarantee. For example, C=$895.44 for the modeled managed agency, m=70% and f=3% gives $3,316.44/month before tax. Self-serve at $489.44 technical cost + $100 support gives C=$589.44 and an illustrative floor of $2,183.11 under the same assumptions. These reflect the chosen workload and margin, not a recommended launch list price.

If the market will not support that price, reduce included consumption or service labor, charge usage separately, improve acceptance and review efficiency, or change the margin assumption. Do not bury costs with unlimited volume. Keep implementation investment, sales, general payroll and profit separate from direct contribution margin. Convert USD to INR using an explicit editable FX assumption rather than an undated exchange-rate claim; actual card settlement and GST treatment depend on the entity and supplier.

## 36. Implementation sequence and the purchase decision

First complete a two-path architecture spike: the preferred modular US stack and the consolidated Supabase variant. Use synthetic data and one authorized resource -> job -> artifact -> review flow. Measure setup effort, session behavior, tenant enforcement, database/runtime latency, retry recovery, export/restore and cost attribution. Do not subscribe to every product merely to compare dashboards.

For the chosen stack, migrate one complete vertical workflow before porting all screens. Add verified identity and server-created tenant scope. Replace local reads/writes with repositories and private objects. Add durable jobs with immutable input revisions, reservations and provider request IDs. Implement one connector end to end and reconcile source data. Then migrate the other production features, Slack and billing. Chapters 5-20 and 26-27 retain the detailed implementation and release gates.

The next 30-day engineering focus is one-brand evidence quality, a region decision, identity/storage migration and durable production. The following phase adds a read-only connector and a small hosted agency pilot. Expand to ten agencies only after fair scheduling, quota handling, restore, invoice reconciliation and support ownership are demonstrated. Provider approval delays are schedule dependencies, not bugs that can be bypassed by a hosting choice.

US launch checklist: signed processor/region inventory; US home deployment selected; restore tested; agency and brand grants tested with separate users; actual provider scopes approved; standalone mode still useful; prices in USD with clear allowances; response windows in US timezones; deletion/export path; representative quality samples; latency/cost measurements; billing reconciliation; named incident owner. This is a release readiness checklist, not a claim those features are implemented today.

At one agency, minimize integration surface. At ten, add repeatable onboarding and usage dashboards. At 100, partition/archive and operational ownership should be established from measured traffic. At 1,000, re-evaluate provider enterprise terms, dedicated tenants, regional cells, data warehousing, capacity and support. There is no need to pre-purchase the largest architecture, but the schema and account model should avoid irreversible shortcuts.

The planning decision is therefore: keep tomorrow's local onboarding simple; target US East for the primary hosted product; shortlist Railway/Neon/Clerk/Trigger/Firecrawl with S3 or validated Railway Buckets; prove a cheaper consolidated alternative; use India-specific infrastructure where a client requires it. Procurement and deployment happen after the vertical slice and the relevant account approvals. This revision itself creates no paid service, connection or deployment.

## 37. Research register, uncertainty and keeping prices fresh

All links below are primary vendor or official government sources opened or checked during this revision on 16 October 2026. The register records the specific question answered rather than treating a vendor homepage as proof of everything. Availability in public documentation is not proof of account entitlement, procurement terms, region capacity or an approved model quota.

| Source | What it supports | Remaining check |
| --- | --- | --- |
| [Railway pricing](https://railway.com/pricing) | Minimum/credits, resource units, bucket storage | Actual app usage and enterprise terms |
| [Railway regions](https://docs.railway.com/deployments/regions) | Four listed deploy regions | Selected service and bucket location |
| [Railway MCP](https://docs.railway.com/cli/mcp) | Hosted/CLI agent tooling | Installed CLI, scoped auth and tool permissions |
| [Bucket billing](https://docs.railway.com/storage-buckets/billing) | Objects and service-upload egress distinction | Retention, replication and client requirements |
| [Neon pricing](https://neon.com/pricing) | CU, storage, history and branch costs | Selected plan, activity and backend usage |
| [Neon regions](https://neon.com/docs/introduction/regions) | Region immutability and product matrix | Chosen product availability in account |
| [Neon MCP](https://neon.com/docs/ai/neon-mcp-server) | Programmable agent management | Avoid production-wide development credentials |
| [Neon branching](https://neon.com/docs/introduction/branching) | Development branch primitive | Masking, expiry and restore tests |
| [Clerk pricing](https://clerk.com/pricing) | MRU/MRO units, add-ons and SSO | Selected feature set and dashboard seats |
| [Clerk pricing explanation](https://clerk.com/articles/clerk-pricing-explained) | Monthly billing and changed free allowance | Checkout agreement controls |
| [Clerk security](https://clerk.com/security) | Region-selection statement | Contract, subprocessors and customer approval |
| [Clerk AI guidance](https://clerk.com/docs/guides/ai/overview) | AI development and agent auth resources | App-owned delegation and tenant tests |
| [Firecrawl pricing](https://www.firecrawl.dev/pricing) | Current credits, annual presentation and endpoint units | Exact monthly checkout for larger tiers |
| [Firecrawl billing](https://docs.firecrawl.dev/billing) | PAYG and credit behavior | Explicit caps, agent and extraction costs |
| [Firecrawl MCP](https://docs.firecrawl.dev/mcp-server) | Agent-access tooling | Narrow host/payload policies |
| [Firecrawl enterprise](https://www.firecrawl.dev/enterprise) | Custom terms and retention offers | Region and contract commitments |
| [Trigger pricing](https://trigger.dev/pricing) | Plans/credits, compute and invocation units | Runtime profile and extra features |
| [Trigger regional workers](https://trigger.dev/changelog/multi-region-workers) | Region selection including US East | Current account region; payload/control-plane location |
| [Inngest pricing](https://www.inngest.com/pricing) | Current paid base and execution units | Required steps, runtime host and region |
| [Supabase pricing](https://supabase.com/pricing) | Bundled quotas, compute and recovery add-ons | Compute sizing and retention |
| [Supabase regions](https://supabase.com/docs/guides/platform/regions) | Mumbai and US deployment options | Actual selected project region |
| [Supabase residency FAQ](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq) | Limits to blanket regional guarantees | Contract and support/log processing |
| [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp) | Project development tooling | Scoped non-production credentials |
| [WorkOS pricing](https://workos.com/pricing) | AuthKit and enterprise connection economics | Enterprise identity, domain/support quote |
| [Better Auth](https://better-auth.com/docs/introduction) | Framework auth alternative | Hosting, email and security ownership |
| [Upstash Redis](https://upstash.com/pricing/redis) | Commands, storage and transfer pricing | Regional placement and real command count |
| [QStash pricing](https://upstash.com/pricing/qstash) | Delivery attempts and retry billing | Endpoint compute and concurrency |
| [R2 pricing](https://developers.cloudflare.com/r2/pricing/) | Storage, operations and egress | Request volume and location requirements |
| [R2 locations](https://developers.cloudflare.com/r2/reference/data-location/) | Hints versus jurisdictions | Country-specific contract suitability |
| [S3 pricing](https://aws.amazon.com/s3/pricing/) | Multiple storage/request/network cost components | Selected-region calculator quote |
| [Fargate pricing](https://aws.amazon.com/fargate/pricing/) | Usage-based container alternative | Architecture, region, network and support costs |
| [Vercel pricing](https://vercel.com/pricing) | Current seats, workflows and usage products | Workload limits and complete bill |
| [Render pricing](https://render.com/pricing) | Product/CLI/MCP alternatives | Numeric prices not exposed by fetched page |
| [DigitalOcean prices](https://docs.digitalocean.com/products/app-platform/details/pricing/) | Per-component current container prices | Component sizing and team transfer |
| [DigitalOcean availability](https://docs.digitalocean.com/products/app-platform/details/availability/) | India and US location candidates | Actual deployment and product coverage |
| [OpenAI model](https://developers.openai.com/api/docs/models/gpt-6.1-sol) | Standard text rates and modifiers | Account/model entitlement and measured tokens |
| [OpenAI pricing](https://developers.openai.com/api/docs/pricing) | Tool/image and processing-tier distinctions | Chosen image settings and actual invoice |
| [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) | Current image rates and old-model shutdown notice | Model availability, resolution and inputs |
| [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) | Current base rates/cache/geography rules | Selected model and actual usage |
| [Google Ads quotas](https://developers.google.com/google-ads/api/docs/best-practices/quotas) | Access-level operations and other limits | Actual project approval/tier |
| [Shopify client credentials](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant?lang=node) | Own-organization scope of that auth flow | Correct external-client installation |
| [Slack rate limits](https://docs.slack.dev/apis/web-api/rate-limits/) | Method/distribution-specific quotas | Client installation and actual method use |
| [California CCPA](https://oag.ca.gov/privacy/ccpa) | Official rights/business guidance | Client/entity applicability and contracts |
| [Indian rules notification](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf) | Phased rules commencement | Applicable duties at actual launch |

Meta's public documentation could not be retrieved reliably during this revision. No fixed Meta quota, current review completion or universal permission entitlement is asserted. Verify through the developer app/account and current official docs during implementation. The source register is a researched plan, not a security certification or a claim of all vendor account-level tests.

Pricing refresh procedure: re-open official plan, usage, region and lifecycle pages before a purchase; record the date and exact billing cadence; run model/unit arithmetic tests; compare the estimate to a representative actual invoice after launch. Review monthly and after provider notices. Pin API versions, record model lifecycle warnings and rerun a small quality/cost benchmark before switching production models. A stale estimate should be labeled stale rather than silently used as a spending promise.

The revised PDF, offline HTML, pricing snapshot and cost calculator carry the same research date. They use no client account data, make no generation calls and incur no provider consumption. Their scenario calculations are unit-tested; the app's original baseline tests are separate from this document's economic and architecture assumptions.
