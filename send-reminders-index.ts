import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC')!, Deno.env.get('VAPID_PRIVATE')!);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };

async function push(subs: any[], payload: object) {
  let sent = 0;
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload)); sent++; }
    catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) await sb.from('push_subscriptions').delete().eq('id', s.id); }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let body: any = {};
  try { body = await req.json(); } catch { /* cron call has no body */ }

  // Test button in the app: sends one notification to the signed-in user after 10 seconds
  if (body.test) {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return new Response(JSON.stringify({ error: 'not signed in' }), { status: 401, headers: CORS });
    const { data: subs } = await sb.from('push_subscriptions').select('*').eq('user_id', u.user.id);
    await new Promise((r) => setTimeout(r, 10000));
    const sent = await push(subs ?? [], { kind: 'test', title: 'Test notification 🔔', body: 'Reminders work on this phone.' });
    return new Response(JSON.stringify({ sent }), { headers: CORS });
  }

  // Cron call (every 5 minutes): send to users whose chosen workout time is in the last 5 minutes
  const now = new Date();
  const { data: rows } = await sb.from('user_data').select('user_id,data');
  const { data: subs } = await sb.from('push_subscriptions').select('*');
  let sent = 0;
  for (const row of rows ?? []) {
    const d = row.data, rem = d.rem, logs = d.logs ?? [], gap = d.gap ?? 5;
    if (!rem || !rem.on || !rem.time) continue;
    const tz = rem.tz || 'Asia/Kolkata';
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
    const hh = +parts.find((p) => p.type === 'hour')!.value % 24, mm = +parts.find((p) => p.type === 'minute')!.value;
    const [th, tmn] = rem.time.split(':').map(Number);
    if (((hh * 60 + mm) - (th * 60 + tmn) + 1440) % 1440 >= 5) continue;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
    const daysAgo = (x: string) => Math.round((Date.parse(today) - Date.parse(x)) / 864e5);
    if (logs.some((l: any) => daysAgo(l.date) === 0)) continue;
    let best: any = null;
    for (const m of Object.keys(d.ex ?? {})) {
      const ml = logs.filter((l: any) => l.muscle === m).sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
      if (!ml.length) continue;
      const days = daysAgo(ml[0].date);
      if (days >= gap && (!best || days > best.days)) best = { m, days, log: ml[0] };
    }
    let text = 'Your workout time has arrived. Open Track Training and start your session.';
    if (best) {
      const top = [...best.log.entries].sort((a: any, b: any) => b.w - a.w)[0];
      text = `${best.m} is due (${best.days} days). ` + (top ? `Last: ${top.n} ${top.w} kg × ${top.r}` : '');
    }
    sent += await push((subs ?? []).filter((s: any) => s.user_id === row.user_id), { kind: 'rem', title: 'Workout time 💪', body: text });
  }
  return new Response(JSON.stringify({ sent }), { headers: CORS });
});
