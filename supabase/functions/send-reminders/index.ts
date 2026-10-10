import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC')!, Deno.env.get('VAPID_PRIVATE')!);

const now = new Date();
const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
const daysAgo = (d: string) => Math.floor((todayUTC - new Date(d).getTime()) / 864e5);

Deno.serve(async () => {
  const { data: rows } = await sb.from('user_data').select('user_id,data');
  const { data: subs } = await sb.from('push_subscriptions').select('*');
  let sent = 0;
  for (const row of rows ?? []) {
    const d = row.data, logs = d.logs ?? [], gap = d.gap ?? 5;
    if (logs.some((l: any) => daysAgo(l.date) === 0)) continue; // already trained today
    let best: any = null;
    for (const m of Object.keys(d.ex ?? {})) {
      const ml = logs.filter((l: any) => l.muscle === m).sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
      if (!ml.length) continue;
      const days = daysAgo(ml[0].date);
      if (days >= gap && (!best || days > best.days)) best = { m, days, log: ml[0] };
    }
    if (!best) continue;
    const top = [...best.log.entries].sort((a: any, b: any) => b.w - a.w)[0];
    const payload = JSON.stringify({
      title: `${best.m} day is due 💪`,
      body: `${best.days} days since last time.` + (top ? ` Last: ${top.n} ${top.w} kg × ${top.r}` : ''),
    });
    for (const s of (subs ?? []).filter((s: any) => s.user_id === row.user_id)) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload); sent++; }
      catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) await sb.from('push_subscriptions').delete().eq('id', s.id); }
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});
