-- Hastrekha AI core schema (applied to Supabase project ahxabfwpsotbrquwzrju)

-- ============ TABLES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  dob date,
  gender text,
  free_credit_used boolean not null default false,
  reading_credits int not null default 0 check (reading_credits >= 0),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  name text not null,
  dob date not null,
  gender text not null,
  hand text not null check (hand in ('left','right')),
  result_json jsonb not null,
  is_free boolean not null default false,
  questions_total int not null,
  questions_remaining int not null check (questions_remaining >= 0),
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  model text,
  created_at timestamptz not null default now()
);
create index readings_user_created_idx on public.readings(user_id, created_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.readings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);
create index chat_messages_reading_idx on public.chat_messages(reading_id, created_at);
create index chat_messages_user_created_idx on public.chat_messages(user_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount_paise int not null default 9900,
  status text not null default 'created' check (status in ('created','captured','failed','refunded')),
  credit_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_user_idx on public.payments(user_id);

-- hashed identities (phone / email) that have already received the one free credit
create table public.free_grants (
  identity text primary key,
  user_id uuid,
  created_at timestamptz not null default now()
);

-- OTP request log for rate limiting (5 / phone / hour)
create table public.otp_requests (
  id bigint generated always as identity primary key,
  phone text not null,
  created_at timestamptz not null default now()
);
create index otp_requests_phone_idx on public.otp_requests(phone, created_at desc);

-- reading attempts (successful or not) for rate limiting (5 / user / hour)
create table public.reading_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null default 'started',
  created_at timestamptz not null default now()
);
create index reading_attempts_user_idx on public.reading_attempts(user_id, created_at desc);

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.readings enable row level security;
alter table public.chat_messages enable row level security;
alter table public.payments enable row level security;
alter table public.free_grants enable row level security;
alter table public.otp_requests enable row level security;
alter table public.reading_attempts enable row level security;

create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own readings" on public.readings for select to authenticated using (user_id = (select auth.uid()));
create policy "own messages" on public.chat_messages for select to authenticated using (user_id = (select auth.uid()));
create policy "own payments" on public.payments for select to authenticated using (user_id = (select auth.uid()));
-- free_grants / otp_requests / reading_attempts: no policies => service role only

-- ============ SIGNUP TRIGGER (free credit + anti-abuse) ============
create or replace function public.norm_identity(p_phone text, p_email text)
returns text[] language sql immutable set search_path = '' as $$
  select array_remove(array[
    case when coalesce(p_phone,'') <> '' then encode(extensions.digest('phone:' || right(regexp_replace(p_phone, '\D', '', 'g'), 10), 'sha256'), 'hex') end,
    case when coalesce(p_email,'') <> '' then encode(extensions.digest('email:' || lower(trim(p_email)), 'sha256'), 'hex') end
  ], null);
$$;
revoke execute on function public.norm_identity(text,text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ids text[] := public.norm_identity(new.phone, new.email);
  already boolean;
begin
  select exists(select 1 from public.free_grants g where g.identity = any(ids)) into already;

  insert into public.profiles (id, full_name, phone, email, free_credit_used, reading_credits)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.phone, new.email,
    already,                         -- free credit counts as used if identity seen before
    case when already then 0 else 1 end
  );

  if not already then
    insert into public.free_grants(identity, user_id)
    select unnest(ids), new.id on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- phone/email linked later: if that identity already got a free credit elsewhere, revoke unused free credit
create or replace function public.handle_user_identity_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ids text[] := public.norm_identity(new.phone, new.email);
  other_owner boolean;
begin
  select exists(select 1 from public.free_grants g where g.identity = any(ids) and g.user_id <> new.id) into other_owner;
  update public.profiles set phone = new.phone, email = new.email where id = new.id;
  if other_owner then
    update public.profiles
       set reading_credits = greatest(reading_credits - 1, 0), free_credit_used = true
     where id = new.id and free_credit_used = false;
  else
    insert into public.free_grants(identity, user_id)
    select unnest(ids), new.id on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_identity_changed after update of phone, email on auth.users
for each row when (old.phone is distinct from new.phone or old.email is distinct from new.email)
execute function public.handle_user_identity_change();

-- ============ ATOMIC CREDIT / QUESTION FUNCTIONS (service role only) ============
create or replace function public.create_reading_with_credit(
  p_reading_id uuid, p_user_id uuid, p_image_path text, p_name text, p_dob date,
  p_gender text, p_hand text, p_result jsonb, p_input_tokens int, p_output_tokens int, p_model text
) returns public.readings language plpgsql security definer set search_path = '' as $$
declare
  prof public.profiles;
  free boolean;
  q int;
  r public.readings;
begin
  select * into prof from public.profiles where id = p_user_id for update;
  if prof.id is null then raise exception 'NO_PROFILE'; end if;
  if prof.reading_credits <= 0 then raise exception 'NO_CREDITS'; end if;

  free := not prof.free_credit_used;
  q := case when free then 1 else 10 end;

  update public.profiles
     set reading_credits = reading_credits - 1,
         free_credit_used = true,
         full_name = coalesce(full_name, p_name),
         dob = p_dob, gender = p_gender
   where id = p_user_id;

  insert into public.readings (id, user_id, image_path, name, dob, gender, hand, result_json,
                               is_free, questions_total, questions_remaining, input_tokens, output_tokens, model)
  values (p_reading_id, p_user_id, p_image_path, p_name, p_dob, p_gender, p_hand, p_result,
          free, q, q, p_input_tokens, p_output_tokens, p_model)
  returning * into r;
  return r;
end $$;

create or replace function public.use_question(p_reading_id uuid, p_user_id uuid, p_content text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  msg_id uuid;
begin
  update public.readings
     set questions_remaining = questions_remaining - 1
   where id = p_reading_id and user_id = p_user_id and questions_remaining > 0;
  if not found then raise exception 'NO_QUESTIONS'; end if;

  insert into public.chat_messages (reading_id, user_id, role, content)
  values (p_reading_id, p_user_id, 'user', p_content)
  returning id into msg_id;
  return msg_id;
end $$;

create or replace function public.refund_question(p_reading_id uuid, p_user_id uuid, p_message_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.chat_messages where id = p_message_id and user_id = p_user_id;
  update public.readings
     set questions_remaining = least(questions_remaining + 1, questions_total)
   where id = p_reading_id and user_id = p_user_id;
end $$;

create or replace function public.grant_payment_credit(p_order_id text, p_payment_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
begin
  select * into pay from public.payments where razorpay_order_id = p_order_id for update;
  if pay.id is null then raise exception 'UNKNOWN_ORDER'; end if;
  if pay.credit_granted then return false; end if;

  update public.payments
     set status = 'captured', razorpay_payment_id = p_payment_id, credit_granted = true, updated_at = now()
   where id = pay.id;
  if pay.user_id is not null then
    update public.profiles set reading_credits = reading_credits + 1 where id = pay.user_id;
  end if;
  return true;
end $$;

create or replace function public.refund_payment(p_payment_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
begin
  select * into pay from public.payments where razorpay_payment_id = p_payment_id for update;
  if pay.id is null or pay.status = 'refunded' then return; end if;
  update public.payments set status = 'refunded', updated_at = now() where id = pay.id;
  if pay.credit_granted and pay.user_id is not null then
    update public.profiles set reading_credits = greatest(reading_credits - 1, 0) where id = pay.user_id;
  end if;
end $$;

revoke all on function public.create_reading_with_credit(uuid,uuid,text,text,date,text,text,jsonb,int,int,text) from public, anon, authenticated;
revoke all on function public.use_question(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.refund_question(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.grant_payment_credit(text,text) from public, anon, authenticated;
revoke all on function public.refund_payment(text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_identity_change() from public, anon, authenticated;
grant execute on function public.create_reading_with_credit(uuid,uuid,text,text,date,text,text,jsonb,int,int,text) to service_role;
grant execute on function public.use_question(uuid,uuid,text) to service_role;
grant execute on function public.refund_question(uuid,uuid,uuid) to service_role;
grant execute on function public.grant_payment_credit(text,text) to service_role;
grant execute on function public.refund_payment(text) to service_role;

-- ============ STORAGE ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('palms', 'palms', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "read own palm images" on storage.objects for select to authenticated
using (bucket_id = 'palms' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============ ADMIN VIEW (private schema, not exposed to the API) ============
-- Query from the SQL editor:  select * from admin.daily_stats;
create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;
create or replace view admin.daily_stats as
with days as (
  select generate_series(date_trunc('day', now()) - interval '59 days', date_trunc('day', now()), interval '1 day')::date as day
)
select d.day,
  (select count(*) from public.profiles p where p.created_at::date = d.day) as signups,
  (select count(*) from public.readings r where r.created_at::date = d.day) as readings,
  (select count(*) from public.readings r where r.created_at::date = d.day and not r.is_free) as paid_readings,
  (select count(*) from public.payments y where y.created_at::date = d.day and y.status = 'captured') as payments_captured,
  (select coalesce(sum(amount_paise),0)/100.0 from public.payments y where y.created_at::date = d.day and y.status = 'captured') as revenue_inr,
  (select coalesce(sum(input_tokens),0) from public.readings r where r.created_at::date = d.day)
   + (select coalesce(sum(input_tokens),0) from public.chat_messages m where m.created_at::date = d.day) as ai_input_tokens,
  (select coalesce(sum(output_tokens),0) from public.readings r where r.created_at::date = d.day)
   + (select coalesce(sum(output_tokens),0) from public.chat_messages m where m.created_at::date = d.day) as ai_output_tokens
from days d order by d.day desc;
