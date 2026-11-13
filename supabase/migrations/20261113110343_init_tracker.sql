-- Hashira Arc tracker: single-user learning progress.
--
-- The curriculum itself lives in the repo (content/), so item, phase and card IDs
-- here are plain text checked for shape rather than foreign keys.
--
-- Access model: the app connects server-side as the table owner. Row level
-- security is enabled with no policies and privileges are revoked from the
-- public API roles, so the publishable key can read and write nothing.

create table public.app_settings (
  id boolean primary key default true check (id),
  start_date date,
  weekly_target_minutes integer not null default 1500
    check (weekly_target_minutes between 30 and 6000),
  time_zone text not null default 'UTC' check (length(time_zone) between 1 and 64),
  new_cards_per_day integer not null default 10 check (new_cards_per_day between 0 and 100),
  updated_at timestamptz not null default now()
);
insert into public.app_settings default values;

create table public.item_progress (
  item_id text primary key
    check (item_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(item_id) <= 80),
  status text not null check (status in ('todo', 'doing', 'done', 'skipped')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint item_progress_done_has_timestamp
    check ((status = 'done') = (completed_at is not null))
);

create table public.lab_evidence (
  id bigint generated always as identity primary key,
  item_id text not null
    check (item_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(item_id) <= 80),
  checklist_id text
    check (checklist_id is null or
           (checklist_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(checklist_id) <= 80)),
  kind text not null check (kind in ('note', 'output', 'link')),
  body text,
  url text,
  created_at timestamptz not null default now(),
  constraint lab_evidence_shape check (
    (kind = 'link' and url is not null and length(url) <= 2048
       and url ~ '^https?://[^[:space:]]+$'
       and (body is null or length(body) <= 2000))
    or
    (kind in ('note', 'output') and url is null
       and body is not null and length(body) between 1 and 200000)
  )
);
create index lab_evidence_item_idx on public.lab_evidence (item_id, created_at desc);

create table public.time_log (
  id bigint generated always as identity primary key,
  logged_on date not null,
  minutes integer not null check (minutes between 1 and 1440),
  phase_id text not null
    check (phase_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(phase_id) <= 80),
  item_id text
    check (item_id is null or
           (item_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(item_id) <= 80)),
  note text check (note is null or length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index time_log_logged_on_idx on public.time_log (logged_on desc);
create index time_log_item_idx on public.time_log (item_id) where item_id is not null;

create table public.card_state (
  card_id text primary key
    check (card_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(card_id) <= 80),
  due_on date not null,
  interval_days integer not null default 0 check (interval_days between 0 and 3650),
  ease double precision not null default 2.5 check (ease >= 1.3),
  reps integer not null default 0 check (reps >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  introduced_on date not null,
  last_reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index card_state_due_on_idx on public.card_state (due_on);

create table public.review_log (
  id bigint generated always as identity primary key,
  card_id text not null
    check (card_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(card_id) <= 80),
  reviewed_at timestamptz not null default now(),
  reviewed_on date not null,
  grade smallint not null check (grade between 1 and 4), -- 1 again, 2 hard, 3 good, 4 easy
  was_new boolean not null default false,
  interval_before integer not null check (interval_before >= 0),
  interval_after integer not null check (interval_after >= 0),
  ease_before double precision not null,
  ease_after double precision not null
);
create index review_log_reviewed_on_idx on public.review_log (reviewed_on);
create index review_log_card_idx on public.review_log (card_id, reviewed_at desc);

alter table public.app_settings  enable row level security;
alter table public.item_progress enable row level security;
alter table public.lab_evidence  enable row level security;
alter table public.time_log      enable row level security;
alter table public.card_state    enable row level security;
alter table public.review_log    enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.app_settings, public.item_progress, public.lab_evidence,
      public.time_log, public.card_state, public.review_log from anon, authenticated;
  end if;
end $$;
