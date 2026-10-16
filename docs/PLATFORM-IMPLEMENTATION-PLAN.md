# Mercatura: new-client launch and agency platform plan

India-first architecture, implementation, operating model and cost workbook. Prepared 16 October 2026. Vendor facts were checked against official documentation on this date. Prices are USD, exclude tax, and must be rechecked before purchase. Capacity numbers and engineering budgets below are explicit planning assumptions, not measured capacity or service guarantees.

## 1. Decision and programme objective

Use the clean local starter for tomorrow's single-operator onboarding. Build the hosted platform in stages around India-hosted Postgres, private object storage, verified identity and durable workers. Keep creative production useful with uploaded evidence even when an account connection is unavailable. Add performance data as a separate, traceable evidence layer.

The programme objective is to let an authorized agency team connect a brand, ingest its permitted business data, create varied and factually supported work, review it and export approved deliverables. The system must prevent access across clients, keep costs attributable and make data limitations visible. It should produce more useful accepted work per unit of time and cost, rather than maximize generated file count.

Recommended initial managed stack after the hosted migration: DigitalOcean App Platform in Bangalore for web and worker services, Supabase in Mumbai for Postgres and application identity, S3 Mumbai for private objects, and SQS/EventBridge plus Secrets Manager/KMS in Mumbai for durable work and credentials. This mixed-provider choice prioritizes a quick managed launch while keeping core data in India. It adds inter-provider networking and IAM complexity; validate it with a deployment spike before committing. Prefer an all-AWS Mumbai stack if a single cloud, private networking or customer procurement requirements outweigh that convenience.

Do not deploy the current local app as a shared multi-agency service. Its SQLite database, filesystem and brand cookie need the migration described below. The repository contains contracts and a schema sketch to guide that work; those files do not activate hosted authorization or connections.

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

## 4. India hosting and vendor comparison

An India database setting does not keep every processor in India. OAuth providers, Slack, AI APIs, support tools, telemetry and content-delivery caches need separate decisions. Use explicit regions for the database, objects, compute, queues, secrets, logs and backups, and verify them in infrastructure configuration and provider consoles.

| Option | Fit for this programme | Decision |
| --- | --- | --- |
| Supabase Mumbai | Managed Postgres and application identity; region ap-south-1 is listed | Initial database/auth candidate; enforce and test our own tenant policies |
| DigitalOcean App Platform BLR | India dynamic app hosting is listed; managed services and workers | Fast web/worker candidate after an India deployment spike |
| AWS Mumbai | ECS/Fargate is supported; S3, queues and managed security services compose into one cloud | Preferred consolidation path; more infrastructure ownership |
| Railway | Convenient developer workflow; listed Asia region is Singapore | Do not use for India-only web/worker processing under this requirement |
| Neon | Agent-friendly managed Postgres tooling; current listed regions omit India | Reconsider only if regional requirements change |
| Cloudflare R2 | Attractive storage economics, but an APAC location hint is not India residency | Do not use for an India-resident client media store |

These region facts come from [Supabase regions](https://supabase.com/docs/guides/platform/regions), [DigitalOcean availability](https://docs.digitalocean.com/products/app-platform/details/availability/), [AWS Fargate regions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate-Regions.html), [Railway regions](https://docs.railway.com/deployments/regions), [Neon regions](https://neon.com/docs/introduction/regions) and [R2 data location](https://developers.cloudflare.com/r2/reference/data-location/).

For the mixed-provider pilot, use TLS, a pooled Postgres connection, narrowly scoped S3/queue access and explicit outbound network policy. Budget egress and cross-cloud latency. A static egress address may be needed for allowlists and adds cost. If private cross-cloud connectivity becomes a burden, move compute into AWS Mumbai before adding more agencies.

Choose providers for reliable APIs, IaC, logs, exportability and bounded agent credentials. “Agent first” should mean an operator can reproducibly inspect and deploy a reviewed plan. It must not mean an autonomous agent gets every tenant's production secrets or permission to incur unrestricted spend.

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

Keep recent normalized operational facts and aggregates in Postgres. Archive raw and older detailed facts as partitioned compressed objects; introduce an India warehouse/query layer when measured volume requires it. Partition by date and tenant-aware access pattern, not one table per agency by default. Avoid making a warehouse query part of an interactive generation request; publish validated aggregates/evidence back to operational views.

Separate interactive queues from backfills. At growth, allocate worker pools by task type and enforce tenant fairness. At large scale, shard hot tenants or dedicated accounts only after profiling demonstrates the need. Large regulated clients may require dedicated projects or deployments, priced separately. A shared Supabase project is a cost-efficient starting design, not a promise that one small database can host thousands of agencies unchanged.

## 21. Vendor pricing facts and infrastructure allowances

Current reference facts: Supabase Pro starts at $25/month with compute credits and included quotas; larger compute and excess usage add cost. Railway Pro has a $20 monthly minimum usage commitment including $20 usage, rather than $20 plus the same included usage again. Neon Launch lists $0.106/CU-hour and $0.35/GB-month storage, but currently has no listed India region. These facts do not make either Railway or Neon an India-region substitute. Sources: [Supabase pricing](https://supabase.com/pricing), [Railway pricing](https://railway.com/pricing), [Neon pricing](https://neon.com/pricing).

DigitalOcean lists a shared 1-vCPU/2-GiB App Platform container at $25/month and a dedicated 1-vCPU/2-GiB container at $39/month. Component count multiplies cost; workers are separate components. The smallest plan is not a sizing recommendation for Next.js plus rendering. [DigitalOcean pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/) is the source.

| Monthly infrastructure bucket | Hosted pilot allowance | Ten-agency allowance |
| --- | --- | --- |
| Web and worker compute | $75-200 | $200-700 |
| Database/auth and backups | $25-100 | $100-350 |
| Objects, transfer and requests | $10-50 | $40-180 |
| Queue, secrets, logs and monitoring | $15-60 | $40-170 |
| Planning total, excluding AI and people | $125-410 | $380-1,400 |

These are engineering budget ranges, not provider quotes or measured usage. At 100 agencies, reserve roughly $2,000-8,000/month infrastructure pending load tests; at 1,000 agencies, $12,000-50,000+ is a scenario envelope rather than a ceiling. Warehouse scans, retention, media egress, HA, logs and dedicated tenants can dominate. Reprice from actual rows, bytes, CPU time and concurrency using vendor calculators before contracting.

Use S3 Mumbai pricing for the final storage estimate; do not apply US regional rates casually. Include network paths, backups, NAT/static IP, database compute, observability, staging and restore environments. Keep tax, FX, payment processing, support and engineering outside a deceptively small cloud subtotal.

## 22. Generation economics and the editable model

Use a spreadsheet or the included calculator to model units explicitly. The following unit costs are hypothetical planning inputs, not current API prices. They must be replaced with the chosen model's current prices, resolutions, token usage and observed failure rates. Video rendering is excluded until separately estimated.

Example per brand per month: 200 initial images at $0.12 each, 40 scripts at $0.05, four landing drafts at $0.30 and eight full articles at $0.40. Initial generation is $30.40. With 20% additional attempts across these work units, modeled cost is $36.48. This excludes extraction, critiques, reference analysis, image editing, orchestration overhead and all people costs; add them as separate inputs instead of pretending the subtotal is fully loaded.

If image acceptance is 70%, 200 first attempts plus 40 repair attempts yield 168 accepted images only under the simplifying assumption that all attempts share that acceptance rate. Image generation then costs $28.80 / 168 = about $0.171 per accepted image. In practice, measure the actual accepted count and all attempts; repair attempts often have a different success probability.

| Scenario | Brands | Modeled generation subtotal |
| --- | --- | --- |
| One direct brand | 1 | $36.48/month |
| One agency | 3 | $109.44/month |
| Ten agencies | 30 | $1,094.40/month |
| 100 agencies | 300 | $10,944/month |
| 1,000 agencies | 3,000 | $109,440/month |

These subtotals are arithmetic examples, not recommended allowances or actual bills. Add critique/extraction tokens, optional video, storage, failed submissions, human review and support. Human review at even a few minutes per accepted piece can cost more than the API call; model it explicitly. Track agency contribution margin using fully loaded costs and a contingency for unknown charges.

The calculator lets you change agencies, brands, output volumes, unit costs, repair multiplier, acceptance rate, review minutes/rate, infrastructure allowance and target gross margin. It shows revenue required for that target. It does not fetch prices, FX or account metrics and can run entirely offline.

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

India hosting is a customer requirement, not a claim that all Indian privacy law mandates full localization. The final Digital Personal Data Protection Rules 2025 have phased commencement; as of this plan date, do not assume every rule is already effective. Review applicability, processor agreements, notices, rights handling, breach response and cross-border processing with qualified counsel. Sources: [MeitY rules and implementation materials](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa) and the [official notification](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).

Set pilot recovery objectives explicitly: for example, a proposed RPO of 24 hours and RTO of one business day while manually operated; strengthen them before contractual scale. Test a full restore into an isolated India environment and verify resources, tenant permissions, secrets references and job reconciliation. Backups that have never been restored are not sufficient evidence of recoverability.

## 25. Operations and reliability

Instrument request latency, job wait/run time, provider error class, quota utilization, data freshness, row counts, reconciliation gaps, cost reservation age, acceptance rate and repair rate. Break metrics down by task/provider without putting private content into labels. Tenant-specific dashboards require authorization just like client outputs.

Initial hosted objectives are targets to validate: ordinary reads p95 under one second at the tested load; accepted-job acknowledgement under two seconds; eligible incremental reporting usually within an hour after provider availability; no silent lost jobs; no approved material factual defects. Generation latency is provider/format dependent and should be shown as a measured range. Do not promise these before instrumentation and load tests.

Runbooks must cover expired tokens, permission removal, provider outage, rate-limit storm, missing report, duplicate webhook, worker crash after paid submission, delayed cost settlement, wrong client mapping, evidence contamination and emergency access revocation. Define who is paged, who informs the client and who can authorize a rollback.

Use separate health indicators: app available, queue draining, connection authorized, data current, evidence sufficient and output quality. A green home page does not mean a brand's reports are current. Display the last successful sync and what the latest failed sync affected.

At ten agencies, designate an operational owner and backup. At 100, establish real on-call coverage and customer support escalation. At 1,000, fund reliability, security and data operations as ongoing functions. Staffing needs depend on automation and service promises; do not infer a fixed headcount from this illustrative agency model.

## 26. Implementation backlog and ownership

Treat this as staged engineering work with external approval dependencies. The following sequence can structure 30/60/90-day planning, but dates require a codebase migration spike and actual team capacity. API review timelines are outside the team's control.

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

Suggested first 30-day focus: the local pilot, migration inventory, India deployment spike, identity, scoped repository/storage vertical slice and one durable production path. Days 31-60: one read-only connector, reconciliation, remaining production migration, review roles and a small hosted agency pilot. Days 61-90: additional connectors, Slack, billing, observability and measured ten-agency readiness. Adjust rather than compressing security/data gates to meet a calendar.

## 27. Release gates from one brand to scale

One-brand local gate: only current client resources, correct product/offer, no inherited examples, explicit spend authorization, useful accepted pilot, backup and export verified.

One-agency hosted gate: all routes authenticated; brand grants enforced; signed private asset access; tenant-aware workers, credentials and retrieval; durable progress and cost ledger; one connector reconciled; roles/reviews tested with separate user accounts; restore demonstrated. Do not invite external users until these pass.

Ten-agency gate: no cross-tenant access in adversarial tests; fair queue scheduling under backfill load; quota-aware connector operation; automated stale-data signals; provider invoice reconciliation; known incident response; migration rollback tested; support owner and client onboarding checklist in use.

100-agency gate: representative load test including generation bursts, large imports and exports; measured database/queue bottlenecks; partition/archive plan operating; p95 targets met at declared concurrency; monitoring alert drill; recovery objectives demonstrated; permission review and security review completed.

1,000-agency gate: validated peak workload and failure headroom; warehouse/detail retention design in operation; dedicated-tenant option where required; tested regional recovery decision; operational staffing and contractual service levels; predictable accepted-unit economics. Repeat load tests after meaningful workload/model/provider changes.

Each gate produces a report with test inputs, environment, results, limits and open defects. Passing an earlier gate does not imply later capacity. If quality, access, reconciliation or cost cannot be demonstrated, hold the relevant capability while other standalone workflows remain available.

## 28. Practical next actions and definition of success

The operator's next action is to create the new client in the clean installation and build a verified evidence pack. The engineering team's next action is an India deployment and migration spike, followed by identity plus one complete authorized resource-to-artifact workflow. The integration team's next action is to collect account ownership and provider approval prerequisites before writing every connector simultaneously.

Success for the first client is a small approved body of work that accurately represents the product, demonstrates useful creative range and has a measured cost and review time. Success for the first agency adds safe team access and trustworthy read-only data. Success at scale adds fair throughput, recovery, support and predictable economics without weakening those boundaries.

Keep a programme register with objective, decision owner, current stage, client count, tested load, data region, provider approvals, open risks, accepted-output metrics, spend and the next gate. Review it weekly with evidence. The plan is meant to make implementation decisions inspectable and correctable, including when a pilot exposes a failed assumption.

No live accounts, cloud resources, subscriptions, Slack messages or paid generation are created by this document. Those actions happen during explicit onboarding and deployment once their concrete configuration and destination are known.
