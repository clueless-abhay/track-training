-- Run AFTER the edge function is deployed and pg_cron + pg_net are enabled (Database > Extensions).
-- Replace the two YOUR_ values. 30 12 * * * = 12:30 UTC = 6:00 PM India time, every day.
select cron.schedule('gym-reminders', '30 12 * * *', $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer YOUR_SUPABASE_ANON_KEY"}'::jsonb
  );
$$);
