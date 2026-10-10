# Track Training: deploy guide (about 30 minutes, all free)

Files: index.html, config.js, sw.js, manifest.json, supabase.js, icon-192.png, icon-512.png (the website);
schema.sql, cron.sql, supabase/functions/send-reminders/index.ts (the backend).

## 1. Create the database (Supabase)
1. Go to supabase.com, sign up, click **New project**. Pick any name and a strong database password. Choose a region near you (Mumbai or Singapore). Wait 1-2 minutes.
2. Open **SQL Editor > New query**, paste all of `schema.sql`, click **Run**. You should see "Success".
3. Open **Authentication > Providers > Email**. For easy testing, turn **Confirm email** OFF and save.

## 2. Copy your project keys
Open **Project Settings > API**. Copy the **Project URL** and the **anon public** key.

## 3. Make push-notification keys
Install Node.js (nodejs.org, LTS). In a terminal run:
    npx web-push generate-vapid-keys
Copy the Public Key and the Private Key somewhere safe. Never put the private key in config.js.

## 4. Fill in config.js
Open `config.js` in Notepad and replace the three YOUR_ values: Project URL, anon key, Public Key.
Leave `seedHistory: true` for your own account. Set it to false before friends sign up.

## 5. Put the website online (Netlify, free)
1. Go to app.netlify.com/drop and sign up.
2. Drag the whole `tt` folder (the one containing index.html) onto the page.
3. Netlify gives you a link like https://something.netlify.app. Copy it.
4. Back in Supabase: **Authentication > URL Configuration**, set **Site URL** to that link and save.

## 6. Deploy the reminder function
1. In Supabase open **Edge Functions > Deploy a new function > Via Editor**. Name it `send-reminders`.
2. Delete the sample code, paste all of `supabase/functions/send-reminders/index.ts`, click **Deploy**.
3. Open **Edge Functions > Secrets** and add these 3:
   - VAPID_PUBLIC = your public key
   - VAPID_PRIVATE = your private key
   - VAPID_SUBJECT = mailto:youremail@example.com
   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are added automatically.)

## 7. Schedule the daily alert
1. **Database > Extensions**: enable `pg_cron` and `pg_net`.
2. Open `cron.sql`, replace YOUR_PROJECT_REF (the part before .supabase.co in your URL) and YOUR_SUPABASE_ANON_KEY, paste it in the SQL Editor and Run.
3. It runs daily at 6:00 PM India time. To change it, edit the cron time (it is in UTC).

## 8. Install and test on your Android phone
1. Open your Netlify link in Chrome, sign up, log a session.
2. Chrome menu (3 dots) > **Add to Home screen / Install app**. Open it from the home screen.
3. Tap the bell icon at the top and allow notifications.
4. Test now: in the SQL Editor run `select net.http_post(url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders', headers:='{"Authorization":"Bearer YOUR_SUPABASE_ANON_KEY"}'::jsonb);`
   A notification appears if any muscle is past your rest gap and you have not trained today.

## Troubleshooting
- Login says "Invalid API key": config.js still has a YOUR_ value, or you re-uploaded the old folder.
- No notification: check the bell was tapped inside the installed app, and secrets in step 6 are set. View errors in Edge Functions > send-reminders > Logs.
- After changing any file, drag the folder to Netlify again (Deploys tab).
- Data: each user is one row in `user_data`; row-level security keeps users apart.
