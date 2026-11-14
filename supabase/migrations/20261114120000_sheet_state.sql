-- Hashira Arc sheet: one row per checklist node the learner has touched.
--
-- The sheet itself lives in the repo (content/), so node IDs here are plain
-- text checked for shape rather than foreign keys. An ID is a dotted path such
-- as "networking.tcp.lifecycle.handshake.steps". A missing row means: not
-- ticked, not starred, no note.
--
-- Access model (unchanged): the app connects server-side as the table owner.
-- Row level security is enabled with no policies and privileges are revoked
-- from the public API roles, so the publishable key can read and write nothing.

create table public.sheet_state (
  node_id text primary key
    check (node_id ~ '^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$'
           and length(node_id) <= 128),
  done boolean not null default false,
  done_at timestamptz,
  starred boolean not null default false,
  note text check (note is null or length(note) between 1 and 2000),
  updated_at timestamptz not null default now(),
  constraint sheet_state_done_has_timestamp check (done = (done_at is not null))
);

alter table public.sheet_state enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.sheet_state from anon, authenticated;
  end if;
end $$;
