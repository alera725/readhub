-- Valida las políticas RLS de public.views.
-- Escenarios: no autenticado, autenticado, autor del recurso, sin permisos, admin.
-- Usa los datos fijos de supabase/seed.sql.
begin;
select plan(7);

-- 1) Usuario autenticado: puede registrar su propia visualización.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
insert into public.views (article_id, user_id)
  values ('a1000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555');
reset role;
select ok(
  (select count(*) from public.views
     where article_id = 'a1000000-0000-0000-0000-000000000004'
       and user_id = '55555555-5555-5555-5555-555555555555') >= 1,
  'Usuario autenticado: puede registrar su propia visualización'
);

-- 2) Usuario sin permisos: no puede registrar una visualización a nombre de otro.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.views (article_id, user_id)
     values ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444') $$,
  '42501',
  null,
  'Usuario sin permisos: no puede registrar una visualización a nombre de otro usuario'
);
reset role;

-- 3) Autor del artículo: ve las visualizaciones de su propio artículo (incluso un borrador).
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select ok(
  (select count(*) from public.views where article_id = 'a1000000-0000-0000-0000-000000000003') > 0,
  'Autor del artículo: ve las visualizaciones de su propio borrador'
);
reset role;

-- 4) Usuario sin permisos (no autor, no admin): no ve visualizaciones de un artículo ajeno.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select is(
  (select count(*) from public.views where article_id = 'a1000000-0000-0000-0000-000000000001')::int,
  0,
  'Usuario sin permisos: no ve visualizaciones de un artículo ajeno'
);
reset role;

-- 5) Administrador: ve las visualizaciones de cualquier artículo.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select ok(
  (select count(*) from public.views where article_id = 'a1000000-0000-0000-0000-000000000001') > 0,
  'Administrador: ve las visualizaciones de cualquier artículo'
);
reset role;

-- 6) Usuario no autenticado (anon): no puede leer visualizaciones (sin GRANT).
set local role anon;
select throws_ok(
  $$ select count(*) from public.views $$,
  '42501',
  null,
  'Usuario no autenticado: no puede leer visualizaciones'
);
reset role;

-- 7) Usuario no autenticado (anon): no puede registrar una visualización.
set local role anon;
select throws_ok(
  $$ insert into public.views (article_id, user_id)
     values ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444') $$,
  '42501',
  null,
  'Usuario no autenticado: no puede registrar una visualización'
);
reset role;

select * from finish();
rollback;
