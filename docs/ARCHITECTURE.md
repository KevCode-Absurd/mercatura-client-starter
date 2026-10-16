# Local runtime and planned hosted architecture

The local app uses Next.js server routes and server actions, Drizzle with better-sqlite3, local resource files and in-process work orchestration. It retains existing creative, landing and SEO features. Blank startup is supported. It is not a tenant-isolated hosted service.

The hosted design moves to verified identity, agency and brand authorization, Postgres repositories, private India object storage, durable queues and isolated workers. Marketing APIs feed immutable raw records and normalized facts before facts are allowed into creative evidence packs. The design contracts in platform/ are intentionally separate from the local runtime.

Read docs/PLATFORM-IMPLEMENTATION-PLAN.md before choosing hosting or starting that migration. A Postgres URL alone cannot convert SQLite-specific queries or filesystem state. Multi-user launch requires the explicit migration, integration and negative authorization tests listed in that plan.
