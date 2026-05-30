-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";
create extension if not exists "vector";

-- Enums
create type task_source as enum ('calendar','fireflies','manual','email','recurring');
create type task_status as enum ('proposed','accepted','in_progress','done','rejected','snoozed');
create type effort_size as enum ('S','M','L');
create type email_priority as enum ('urgent','important','fyi','noise');
create type nudge_channel as enum ('push','email');

-- Users
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  timezone text not null default 'Asia/Kolkata',
  work_hours_start time not null default '09:00',
  work_hours_end time not null default '19:00',
  google_refresh_token_encrypted text,
  fireflies_refresh_token_encrypted text,
  fireflies_access_token_encrypted text,
  fireflies_access_token_expires_at timestamptz,
  recurring_spawn_days int not null default 7,
  ai_budget_inr_used_this_month numeric(10,4) default 0,
  ai_budget_reset_at timestamptz default date_trunc('month', now()),
  created_at timestamptz default now()
);

alter table users enable row level security;
create policy "own rows" on users
  for all using (id = auth.uid()) with check (id = auth.uid());

-- User settings (shortcuts, theme, onboarding)
create table user_settings (
  user_id uuid primary key references users(id) on delete cascade,
  shortcuts jsonb not null default '{
    "today": "g t",
    "tasks": "g k",
    "inbox": "g i",
    "timesheet": "g s",
    "reports": "g r",
    "chat": "g c",
    "quick_add": "n",
    "search": "/"
  }',
  theme text not null default 'dark',
  onboarding_completed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;
create policy "own rows" on user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- VIPs
create table vips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('email','domain','keyword')),
  value text not null,
  weight int not null default 1,
  label text,
  created_at timestamptz default now(),
  unique (user_id, kind, value)
);

alter table vips enable row level security;
create policy "own rows" on vips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Clients / Projects
create table clients_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  color text default '#888',
  email_domains text[] default '{}',
  active boolean default true,
  created_at timestamptz default now()
);

alter table clients_projects enable row level security;
create policy "own rows" on clients_projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Calendar events
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  gcal_event_id text not null,
  gcal_recurring_event_id text,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  attendees jsonb default '[]',
  organizer_email text,
  response_status text,
  client_id uuid references clients_projects(id) on delete set null,
  attended boolean,
  actual_minutes int,
  raw jsonb,
  synced_at timestamptz default now(),
  unique (user_id, gcal_event_id)
);

create index on calendar_events (user_id, starts_at);
create index on calendar_events (user_id, gcal_recurring_event_id) where gcal_recurring_event_id is not null;

alter table calendar_events enable row level security;
create policy "own rows" on calendar_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Transcripts
create table transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  fireflies_id text not null,
  calendar_event_id uuid references calendar_events(id) on delete set null,
  title text,
  started_at timestamptz,
  duration_min int,
  attendees jsonb default '[]',
  triaged_at timestamptz,
  raw jsonb,
  raw_purge_at timestamptz,
  search_tsv tsvector,
  unique (user_id, fireflies_id)
);

create index on transcripts using gin (search_tsv);

alter table transcripts enable row level security;
create policy "own rows" on transcripts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-populate search_tsv from raw sentences
create or replace function transcripts_search_tsv_update() returns trigger language plpgsql as $$
declare
  transcript_text text;
  attendee_names text;
begin
  -- Concatenate all sentence texts from raw.sentences array
  select string_agg(s->>'text', ' ')
  into transcript_text
  from jsonb_array_elements(coalesce(NEW.raw->'sentences', '[]'::jsonb)) s;

  -- Concatenate attendee emails/names
  select string_agg(coalesce(a->>'name', a->>'email', ''), ' ')
  into attendee_names
  from jsonb_array_elements(coalesce(NEW.attendees, '[]'::jsonb)) a;

  NEW.search_tsv := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(attendee_names, '') || ' ' ||
    coalesce(transcript_text, '')
  );
  return NEW;
end;
$$;

create trigger transcripts_search_tsv_trigger
  before insert or update on transcripts
  for each row execute function transcripts_search_tsv_update();

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  source task_source not null,
  source_ref_id text,
  status task_status not null default 'proposed',
  effort effort_size,
  due_at timestamptz,
  evidence_quote text,
  confidence numeric(3,2),
  client_id uuid references clients_projects(id) on delete set null,
  parent_recurring_id uuid references tasks(id) on delete set null,
  recurrence_rule text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on tasks (user_id, status, due_at);
create index on tasks (user_id, source);

-- IMMUTABLE function for date cast (for functional indexes)
create or replace function tasks_due_date(ts timestamptz)
returns date language sql immutable strict as $$
  select (ts AT TIME ZONE 'UTC')::date
$$;

create unique index on tasks (parent_recurring_id, tasks_due_date(due_at)) where parent_recurring_id is not null;

alter table tasks enable row level security;
create policy "own rows" on tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Time entries
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  calendar_event_id uuid references calendar_events(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  minutes int generated always as (extract(epoch from (ends_at - starts_at))::int / 60) stored,
  note text,
  source task_source not null,
  client_id uuid references clients_projects(id) on delete set null,
  created_at timestamptz default now()
);

create index on time_entries (user_id, starts_at);

alter table time_entries enable row level security;
create policy "own rows" on time_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Emails
create table emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text not null,
  from_email text not null,
  from_name text,
  subject text,
  snippet text,
  received_at timestamptz not null,
  priority email_priority,
  priority_reason text,
  awaiting_reply boolean default false,
  commitment_due_at timestamptz,
  replied_at timestamptz,
  classified_at timestamptz,
  unique (user_id, gmail_message_id)
);

create index on emails (user_id, received_at desc);
create index on emails (user_id, priority, replied_at);

alter table emails enable row level security;
create policy "own rows" on emails
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notes
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  task_id uuid references tasks(id) on delete set null,
  transcript_id uuid references transcripts(id) on delete set null,
  search_tsv tsvector,
  created_at timestamptz default now()
);

create index on notes using gin (search_tsv);

create or replace function notes_search_tsv_update() returns trigger language plpgsql as $$
begin
  NEW.search_tsv := to_tsvector('english', coalesce(NEW.body, ''));
  return NEW;
end;
$$;

create trigger notes_search_tsv_trigger
  before insert or update on notes
  for each row execute function notes_search_tsv_update();

alter table notes enable row level security;
create policy "own rows" on notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reminders
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  email_id uuid references emails(id) on delete cascade,
  fire_at timestamptz not null,
  channels nudge_channel[] not null default '{push,email}',
  sent_at timestamptz,
  dismissed_at timestamptz,
  payload jsonb,
  created_at timestamptz default now()
);

create index on reminders (fire_at) where sent_at is null;

alter table reminders enable row level security;
create policy "own rows" on reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Nudge settings
create table nudge_settings (
  user_id uuid primary key references users(id) on delete cascade,
  morning_brief_enabled boolean default true,
  morning_brief_time time default '09:00',
  email_check_enabled boolean default true,
  email_check_times time[] default '{12:00,16:00}',
  overwork_threshold_hours numeric(4,1) default 9.5,
  underlog_threshold_hours numeric(4,1) default 4.0,
  eod_prompt_enabled boolean default true,
  eod_prompt_time time default '18:30',
  channels nudge_channel[] default '{push,email}'
);

alter table nudge_settings enable row level security;
create policy "own rows" on nudge_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Push subscriptions
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;
create policy "own rows" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Share links (token is the secret — no user auth check on reads)
create table share_links (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  report_type text not null,
  range_start timestamptz not null,
  range_end timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table share_links enable row level security;
create policy "own writes" on share_links
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "public token read" on share_links
  for select using (true);

-- AI calls
create table ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  purpose text not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  inr_cost numeric(10,6),
  created_at timestamptz default now()
);

create index on ai_calls (user_id, created_at desc);

alter table ai_calls enable row level security;
create policy "own rows" on ai_calls
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Chat messages (with vector embedding for RAG)
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content jsonb not null,
  embedding vector(768),
  created_at timestamptz default now()
);

create index on chat_messages (user_id, created_at);
create index on chat_messages using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table chat_messages enable row level security;
create policy "own rows" on chat_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Helper function: increment AI budget
create or replace function increment_ai_budget(user_id_param uuid, amount numeric)
returns void language plpgsql security definer as $$
begin
  update users
  set ai_budget_inr_used_this_month = coalesce(ai_budget_inr_used_this_month, 0) + amount
  where id = user_id_param;
end;
$$;

-- Helper function: auto-create user profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;

  insert into user_settings (user_id) values (new.id) on conflict do nothing;
  insert into nudge_settings (user_id) values (new.id) on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
