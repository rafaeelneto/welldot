create table if not exists app_events (
  id bigint generated always as identity primary key,
  name text not null,
  params jsonb not null default '{}'::jsonb,
  country text,
  host text,
  created_at timestamptz not null default now()
);

create index if not exists app_events_name_created_at_idx
  on app_events (name, created_at);
alter table app_events enable row level security;

