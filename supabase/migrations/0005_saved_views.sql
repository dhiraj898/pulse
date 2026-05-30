-- User-defined saved views: named filters over tasks / emails / calendar.
create table if not exists saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  entity text not null check (entity in ('tasks','emails','calendar')),
  filters jsonb not null default '{}',
  created_at timestamptz default now()
);

alter table saved_views enable row level security;
create policy "own rows" on saved_views
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
