-- Valida las políticas RLS de public.articles.
-- Escenarios: no autenticado, autenticado sin permisos, autor del recurso.
-- Usa los datos fijos de supabase/seed.sql.
begin;
select plan(9);

-- 1) Usuario no autenticado (anon): solo ve artículos públicos.
set local role anon;
select is(
  (select count(*) from public.articles)::int,
  3,
  'Usuario no autenticado: solo ve los 3 artículos públicos'
);

-- 2) Usuario no autenticado: no ve un borrador puntual.
select is(
  (select count(*) from public.articles where id = 'a1000000-0000-0000-0000-000000000003')::int,
  0,
  'Usuario no autenticado: no ve el borrador de otro usuario'
);
reset role;

-- 3) Usuario autenticado sin permisos (no autor): también ve solo los públicos.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select is(
  (select count(*) from public.articles)::int,
  3,
  'Usuario autenticado sin permisos: solo ve los artículos públicos'
);
reset role;

-- 4) Autor: puede insertar un artículo propio.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
insert into public.articles (id, author_id, title, is_public)
values ('a1000000-0000-0000-0000-000000000099', '22222222-2222-2222-2222-222222222222', 'Artículo de prueba', true);
reset role;
select is(
  (select count(*) from public.articles where id = 'a1000000-0000-0000-0000-000000000099')::int,
  1,
  'Autor: puede insertar un artículo propio'
);

-- 5) Usuario sin permisos: no puede actualizar un artículo ajeno.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
update public.articles set title = 'hackeado' where id = 'a1000000-0000-0000-0000-000000000001';
reset role;
select isnt(
  (select title from public.articles where id = 'a1000000-0000-0000-0000-000000000001'),
  'hackeado',
  'Usuario sin permisos: no puede actualizar un artículo ajeno'
);

-- 6) Autor: sí puede actualizar su propio artículo.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
update public.articles set title = 'Introducción a PostgreSQL (editado)'
  where id = 'a1000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select title from public.articles where id = 'a1000000-0000-0000-0000-000000000001'),
  'Introducción a PostgreSQL (editado)',
  'Autor: puede actualizar su propio artículo'
);

-- 7) Usuario sin permisos: no puede insertar un artículo suplantando a otro autor.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.articles (author_id, title, is_public)
     values ('22222222-2222-2222-2222-222222222222', 'Suplantación', true) $$,
  '42501',
  null,
  'Usuario sin permisos: no puede insertar un artículo a nombre de otro usuario'
);
reset role;

-- 8) Usuario sin permisos: no puede eliminar un artículo ajeno.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
delete from public.articles where id = 'a1000000-0000-0000-0000-000000000099';
reset role;
select is(
  (select count(*) from public.articles where id = 'a1000000-0000-0000-0000-000000000099')::int,
  1,
  'Usuario sin permisos: no puede eliminar un artículo ajeno'
);

-- 9) Autor: sí puede eliminar su propio artículo.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
delete from public.articles where id = 'a1000000-0000-0000-0000-000000000099';
reset role;
select is(
  (select count(*) from public.articles where id = 'a1000000-0000-0000-0000-000000000099')::int,
  0,
  'Autor: puede eliminar su propio artículo'
);

select * from finish();
rollback;
