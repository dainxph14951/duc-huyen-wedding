-- Run after supabase/wishes.sql in an isolated test database, never production.
begin;
do $$
begin
  assert not has_table_privilege('anon', 'public.wedding_wishes', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.wedding_wishes', 'SELECT');
  assert not has_table_privilege('anon', 'public.wedding_wishes', 'INSERT');
  assert not has_function_privilege('anon', 'public.submit_wedding_wish(uuid,text,text,text)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.submit_wedding_wish(uuid,text,text,text)', 'EXECUTE');
  assert (select relrowsecurity from pg_class where oid = 'public.wedding_wishes'::regclass);
end $$;

set local role service_role;
do $$
declare
  first_id uuid := '80b4fc78-15b6-43f8-a2d5-985ed79793e1';
  second_id uuid := '80b4fc78-15b6-43f8-a2d5-985ed79793e2';
  sender text := repeat('a', 64);
  result jsonb;
begin
  result := public.submit_wedding_wish(first_id, 'Bạn thân', 'Hạnh phúc nhé ♥', sender);
  assert result->>'status' = 'saved';
  assert result->>'id' = first_id::text;
  result := public.submit_wedding_wish(first_id, 'Bạn thân', 'Hạnh phúc nhé ♥', sender);
  assert result->>'status' = 'saved', 'retry should be idempotent';
  assert (select count(*) from public.wedding_wishes where id = first_id) = 1;
  result := public.submit_wedding_wish(first_id, 'Bạn thân', 'Changed', sender);
  assert result->>'status' = 'conflict';
  result := public.submit_wedding_wish(second_id, 'Bạn thân', 'Lời chúc khác', sender);
  assert result->>'status' = 'rate_limited';
  result := public.submit_wedding_wish(second_id, 'Khách khác', 'Hạnh phúc ♥', repeat('b',64));
  assert result->>'status' = 'saved';
end $$;
rollback;
