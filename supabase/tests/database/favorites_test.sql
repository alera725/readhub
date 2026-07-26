-- Valida las políticas RLS de public.favorites.
-- Escenarios: no autenticado, autenticado, propietario, sin permisos.
-- Usa los datos fijos de supabase/seed.sql.
begin;
select plan(7);

-- 1) Propietario: ve sus propios favoritos.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select is(
  (select count(*) from public.favorites)::int,
  1,
  'Propietario: ve sus propios favoritos'
);
reset role;

-- 2) Usuario sin permisos: no ve los favoritos de otro usuario (solo los propios).
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select is(
  (select count(*) from public.favorites where user_id = '44444444-4444-4444-4444-444444444444')::int,
  0,
  'Usuario sin permisos: no ve los favoritos de otro usuario'
);
reset role;

-- 3) Propietario: puede agregar un favorito propio.
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
insert into public.favorites (article_id, user_id)
  values ('a1000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333');
reset role;
select is(
  (select count(*) from public.favorites
     where article_id = 'a1000000-0000-0000-0000-000000000002'
       and user_id = '33333333-3333-3333-3333-333333333333')::int,
  1,
  'Propietario: puede agregar un favorito propio'
);

-- 4) Usuario sin permisos: no puede agregar un favorito a nombre de otro usuario.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.favorites (article_id, user_id)
     values ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444') $$,
  '42501',
  null,
  'Usuario sin permisos: no puede agregar un favorito a nombre de otro usuario'
);
reset role;

-- 5) Usuario sin permisos: no puede eliminar un favorito ajeno.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
delete from public.favorites
  where article_id = 'a1000000-0000-0000-0000-000000000001'
    and user_id = '44444444-4444-4444-4444-444444444444';
reset role;
select is(
  (select count(*) from public.favorites
     where article_id = 'a1000000-0000-0000-0000-000000000001'
       and user_id = '44444444-4444-4444-4444-444444444444')::int,
  1,
  'Usuario sin permisos: no puede eliminar un favorito ajeno'
);

-- 6) Propietario: puede eliminar su propio favorito.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
delete from public.favorites
  where article_id = 'a1000000-0000-0000-0000-000000000001'
    and user_id = '44444444-4444-4444-4444-444444444444';
reset role;
select is(
  (select count(*) from public.favorites
     where article_id = 'a1000000-0000-0000-0000-000000000001'
       and user_id = '44444444-4444-4444-4444-444444444444')::int,
  0,
  'Propietario: puede eliminar su propio favorito'
);

-- 7) Usuario no autenticado (anon): no puede leer favoritos (sin GRANT).
set local role anon;
select throws_ok(
  $$ select count(*) from public.favorites $$,
  '42501',
  null,
  'Usuario no autenticado: no puede leer favoritos'
);
reset role;

select * from finish();
rollback;
