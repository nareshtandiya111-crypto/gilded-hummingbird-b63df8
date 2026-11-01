# Combo Change From Home — Starter Website

A Hindi-first React/Vite starter for a home mobile-combo repair booking service.

## Run locally
1. Install Node.js (LTS).
2. In this folder run:
   ```bash
   npm install
   npm run dev
   ```
3. Open the local URL Vite prints.

## Connect Supabase
1. Create a project at https://supabase.com/
2. Open SQL Editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and fill:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (publishable/anon key only)
4. Restart the dev server.

## Important implementation status
- Home, booking form, agent application form, login form, customer orders, agent panel, and admin UI are included.
- Without Supabase credentials, forms show demo/setup messages and do not save data.
- This is a starter project, NOT a production-ready marketplace yet.
- Booking insert currently stores a request without customer authentication and does not yet set `customer_email`, so customer order listing needs the booking/auth flow completed.
- Admin and agent screens need full server-side role enforcement before live use. Do not expose them as secure just because they are behind a UI.
- SMS OTP, agent assignment, real pricing, payment gateway, webhook verification, commission settlement, refunds, invoice, support, privacy terms and legal/tax setup are not connected.
- Do not add a Supabase service-role key to frontend environment variables.
- Payment gateway keys and settlement actions must be implemented on a trusted backend/Edge Function, never in browser code.

## Deploy to Netlify
Build command: `npm run build`
Publish directory: `dist`
Set the two `VITE_SUPABASE_*` environment variables in Netlify site settings after configuring Supabase.


## Email OTP password reset (added)
1. In Supabase Dashboard, open **Authentication → Email Templates → Reset Password**.
2. Change the email body to include the 6-digit token, for example: `Your password reset code is {{ .Token }}`. Save it. The app uses `verifyOtp` with `type: 'recovery'`, so use the **Reset Password** template, not the signup confirmation template.
3. In Supabase Authentication URL Configuration, add your deployed Netlify site URL to the allowed redirect URLs (for example, `https://YOUR-SITE.netlify.app/**`).
4. In Netlify, open **Site configuration → Environment variables** and set:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Publishable key (or legacy anon key)
5. Deploy/build the updated project with build command `npm run build` and publish directory `dist`.
6. Test with an email account that exists in Supabase Auth. The OTP must be a valid recovery token; expired or incorrect tokens will fail.

Security notes:
- Never put a Supabase `service_role` or secret key in the browser.
- Use a strong password (at least 8 characters). Configure Supabase email sending/SMTP for reliable production delivery; default email service may have limits.
- This starter UI is not a full production-ready system. Role-based authorization and admin/agent access must be enforced with database policies/server-side checks.


## Login repair notes
- The login now checks the signed-in user's `profiles.role` against the selected login type and displays useful errors instead of silently routing by the dropdown.
- Run the updated `supabase/schema.sql` in Supabase SQL Editor. It creates/backfills profiles for Auth users; new accounts default to `customer`.
- To grant Admin to an existing Auth user, run in Supabase SQL Editor after replacing the email:
  ```sql
  update public.profiles
  set role = 'admin'
  where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
  ```
- To grant Agent after approval, use the same query with `role = 'agent'` and the approved agent's email. The current agent application form only submits an application; it does not create an Auth login account.
- Never make a user Admin/Agent based only on a browser dropdown. The role must be set in the database by a trusted admin process.
