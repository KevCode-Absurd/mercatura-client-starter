# Hosted platform blueprint

This folder contains typed adapter and tenant contracts plus an illustrative Postgres schema. It does not activate OAuth, authentication, RLS, Slack, billing or workers in the local app. Existing routes still use SQLite, local files and a brand selection cookie. Do not expose this app as a shared SaaS service before the hosted release gates in docs/PLATFORM-IMPLEMENTATION-PLAN.md pass.

US-market target: co-located US East application, database and workers. India-specific clients may use a separate Mumbai/Bangalore deployment. See the implementation plan for region and processor decisions. Slack, OAuth providers and AI services are separate processors and require their own data handling decision. APP_REGION is a deployment intention, not a location enforcement control.

Every adapter must receive a verified server-created TenantScope. Never accept organizationId from a browser or Slack payload without authorization. Never include plaintext credentials in jobs. Adapter results are raw data references; normalization and evidence verification happen in separate jobs. Postgres migrations must replace SQLite-specific queries throughout the app before DATABASE_URL is meaningful.
