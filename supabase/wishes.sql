-- Run once in the Supabase project's SQL Editor. Safe to run again.
begin;

create table if not exists public.wedding_wishes (
  id uuid primary key,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  sender_hash text not null check (sender_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists wedding_wishes_sender_created_idx
  on public.wedding_wishes (sender_hash, created_at desc);

alter table public.wedding_wishes enable row level security;
revoke all on public.wedding_wishes from public, anon, authenticated;
grant select, insert on public.wedding_wishes to service_role;

create or replace function public.submit_wedding_wish(
  p_id uuid, p_name text, p_message text, p_sender_hash text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous public.wedding_wishes%rowtype;
begin
  -- Serialize retries and per-IP submissions across serverless instances.
  perform pg_catalog.pg_advisory_xact_lock(1, pg_catalog.hashtext(p_id::text));
  perform pg_catalog.pg_advisory_xact_lock(2, pg_catalog.hashtext(p_sender_hash));

  select * into previous from public.wedding_wishes where id = p_id;
  if found then
    if previous.name = p_name and previous.message = p_message
      and previous.sender_hash = p_sender_hash then
      return jsonb_build_object('status', 'saved', 'id', p_id);
    end if;
    return jsonb_build_object('status', 'conflict');
  end if;

  if exists (
    select 1 from public.wedding_wishes
    where sender_hash = p_sender_hash and created_at > now() - interval '30 seconds'
  ) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  insert into public.wedding_wishes (id, name, message, sender_hash)
    values (p_id, p_name, p_message, p_sender_hash);
  return jsonb_build_object('status', 'saved', 'id', p_id);
end;
$$;

revoke all on function public.submit_wedding_wish(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_wedding_wish(uuid, text, text, text) to service_role;

commit;
