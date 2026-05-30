-- handle_new_user runs as supabase_auth_admin, whose search_path is `auth`,
-- so unqualified table names resolved to auth.* (e.g. auth.users) and the
-- profile inserts failed -> "Database error saving new user" on signup.
-- Pin search_path and fully-qualify every table with the public schema.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  insert into public.nudge_settings (user_id) values (new.id) on conflict do nothing;

  return new;
end;
$$;
