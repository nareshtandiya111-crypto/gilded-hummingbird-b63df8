-- Combo Change From Home: Supabase starter schema
-- Run in Supabase SQL Editor. Review security rules and test before taking live payments.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','agent','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.agent_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  experience text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id),
  customer_email text,
  customer_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  brand text not null,
  model text not null,
  issue text not null,
  preferred_date date,
  notes text,
  status text not null default 'pending' check (status in ('pending','assigned','in_progress','completed','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','refunded','failed')),
  total_amount numeric(10,2) not null default 0 check (total_amount >= 0),
  parts_cost numeric(10,2) not null default 0 check (parts_cost >= 0),
  agent_earning numeric(10,2) not null default 0 check (agent_earning >= 0),
  commission_rate numeric(5,2) not null default 10 check (commission_rate >= 0 and commission_rate <= 100),
  admin_commission numeric(10,2) not null default 0 check (admin_commission >= 0),
  agent_id uuid references public.profiles(id),
  payment_reference text,
  completion_otp_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  provider text not null,
  provider_order_id text,
  provider_payment_id text,
  amount numeric(10,2) not null,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'); $$;

alter table public.profiles enable row level security;
alter table public.agent_applications enable row level security;
alter table public.bookings enable row level security;
alter table public.payment_events enable row level security;

create policy "profiles read self or admin" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles update self basic" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- Agent applications can be submitted by the public; only admin can view/change them.
create policy "public submit agent application" on public.agent_applications
for insert to anon, authenticated with check (status = 'pending' and user_id is null);
create policy "admin manage applications" on public.agent_applications
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Customers may create pending bookings without setting price/commission/agent themselves.
-- Production should use a server-side function for booking creation and price calculation.
create policy "public create pending booking" on public.bookings
for insert to anon, authenticated with check (
  status = 'pending' and payment_status = 'pending' and agent_id is null
  and total_amount = 0 and parts_cost = 0 and agent_earning = 0 and admin_commission = 0
);
create policy "customer sees own bookings" on public.bookings
for select to authenticated using (customer_id = auth.uid() or customer_email = (auth.jwt() ->> 'email'));
create policy "admin reads bookings" on public.bookings
for select to authenticated using (public.is_admin());
create policy "admin updates bookings" on public.bookings
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "assigned agent reads own bookings" on public.bookings
for select to authenticated using (agent_id = auth.uid());

create policy "admin reads payment events" on public.payment_events
for select to authenticated using (public.is_admin());

-- Summary view for admin. Use only with strict server-side authorization in production.
create or replace view public.admin_booking_summary as
select id, created_at, customer_name, city, pincode, brand, model, status,
       payment_status, total_amount, admin_commission, agent_id
from public.bookings;

-- IMPORTANT:
-- 1. Do NOT put a Supabase service_role key in browser code.
-- 2. Do NOT trust payment success reported by the browser; verify gateway webhooks on a server/Edge Function.
-- 3. Configure an admin profile role only from a trusted server/admin process.
-- 4. Before production, add robust customer identity verification, agent approval, server-side price/commission calculation,
--    agent assignment RPC, refund/chargeback handling, audit logs, privacy policy and support details.
-- 5. SMS OTP needs a configured auth phone provider and is not implemented by this starter UI.
