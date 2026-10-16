-- ILLUSTRATIVE ONLY. Not a runnable production migration and not applied by setup.
-- Finish auth binding, composite foreign keys, RLS and integration tests before use.
create table organizations (id uuid primary key, name text not null, region text not null default 'ap-south-1');
create table memberships (organization_id uuid references organizations(id), user_id uuid, role text not null,
  primary key(organization_id,user_id));
create table brands (organization_id uuid references organizations(id), id uuid not null, name text not null,
  primary key(organization_id,id));
create table brand_memberships (organization_id uuid, brand_id uuid, user_id uuid,
  primary key(organization_id,brand_id,user_id),
  foreign key(organization_id,brand_id) references brands(organization_id,id),
  foreign key(organization_id,user_id) references memberships(organization_id,user_id));
create table connections (organization_id uuid, brand_id uuid, id uuid not null, provider text not null,
  secret_reference text not null, status text not null, granted_scopes jsonb not null,
  primary key(organization_id,brand_id,id),
  foreign key(organization_id,brand_id) references brands(organization_id,id));
create table source_objects (organization_id uuid, brand_id uuid, id uuid not null,
  connection_id uuid not null, object_key text not null, checksum text not null, observed_at timestamptz not null,
  primary key(organization_id,brand_id,id),
  foreign key(organization_id,brand_id,connection_id) references connections(organization_id,brand_id,id));
create index source_objects_recent on source_objects(organization_id,brand_id,observed_at desc);
-- Additional hosted tables: account_bindings, oauth_states, encrypted_tokens, ingest_cursors,
-- report_jobs, fact_ad_daily, fact_orders, fact_search_daily, metric_definitions,
-- resource_versions, evidence_claims, artifacts, artifact_revisions, reviews,
-- cost_reservations, usage_ledger, slack_installations, audit_events, deletion_requests.
-- All child foreign keys include organization_id AND brand_id; all RLS policies check
-- authenticated user membership and brand access. Worker roles require explicit scoping too.
