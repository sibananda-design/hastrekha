-- Lets a signed-in user record their own Terms consent (only ever sets their own timestamp once).
create or replace function public.accept_terms()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set terms_accepted_at = now()
   where id = (select auth.uid()) and terms_accepted_at is null;
$$;
revoke all on function public.accept_terms() from public, anon;
grant execute on function public.accept_terms() to authenticated;
