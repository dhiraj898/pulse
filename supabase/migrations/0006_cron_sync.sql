-- Automated hourly sync via pg_cron + pg_net.
--
-- REQUIRES: the app deployed at a PUBLIC URL (pg_cron on Supabase cannot reach
-- localhost). Before running, replace the two placeholders below:
--   <APP_URL>      e.g. https://pulse.yourdomain.com   (no trailing slash)
--   <CRON_SECRET>  the same value set as CRON_SECRET in the app environment
--
-- pg_cron is already enabled in 0001_init.sql; pg_net provides HTTP from SQL.
create extension if not exists pg_net;

-- Remove a previous schedule with the same name if re-running.
select cron.unschedule('pulse-sync-hourly')
where exists (select 1 from cron.job where jobname = 'pulse-sync-hourly');

select cron.schedule(
  'pulse-sync-hourly',
  '0 * * * *',
  $$
    select net.http_post(
      url := '<APP_URL>/api/cron/sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <CRON_SECRET>',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
