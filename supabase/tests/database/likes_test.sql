-- Valida las políticas RLS de public.likes.
-- Escenarios: no autenticado, autenticado, sin permisos, propietario.
-- SELECT está acotado a las propias filas (ver 20260703121100_likes_rls.sql):
-- Postgres exige privilegio SELECT sobre las columnas de un WHERE en DELETE,
-- por lo que sin esta política el propio dueño no podría ni siquiera
-- ejecutar `DELETE ... WHERE article_id = X` sobre su propio like.
-- Usa los datos fijos de supabase/seed.sql.
begin;
select plan(7);

-- 1) Usuario no autenticado (anon): no puede insertar un like (sin GRANT).
set local role anon;
select throws_ok(
  $$ insert into public.likes (article_id, user_id)
     values ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444') $$,
  '42501',
  null,
  'Usuario no autenticado: no puede insertar un like'
);
reset role;

-- 2) Usuario autenticado: solo ve sus propios likes, no los de otros usuarios.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select is(
  (select count(*) from public.likes)::int,
  2,
  'Usuario autenticado: solo ve sus propios likes (2), no los de otros usuarios'
);
reset role;

-- 3) Usuario autenticado: puede insertar su propio like.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
insert into public.likes (article_id, user_id)
  values ('a1000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555');
reset role;
select is(
  (select count(*) from public.likes
     where article_id = 'a1000000-0000-0000-0000-000000000002'
       and user_id = '55555555-5555-5555-5555-555555555555')::int,
  1,
  'Usuario autenticado: puede insertar su propio like'
);

-- 4) Usuario sin permisos: no puede dar like a nombre de otro usuario.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.likes (article_id, user_id)
     values ('a1000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555') $$,
  '42501',
  null,
  'Usuario sin permisos: no puede insertar un like a nombre de otro usuario'
);
reset role;

-- 5) Restricción de unicidad: un usuario no puede dar like dos veces al mismo artículo.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.likes (article_id, user_id)
     values ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444') $$,
  '23505',
  null,
  'Restricción UNIQUE: un usuario no puede duplicar su like sobre el mismo artículo'
);
reset role;

-- 6) Propietario: puede eliminar su propio like.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
delete from public.likes
  where article_id = 'a1000000-0000-0000-0000-000000000001'
    and user_id = '55555555-5555-5555-5555-555555555555';
reset role;
select is(
  (select count(*) from public.likes
     where article_id = 'a1000000-0000-0000-0000-000000000001'
       and user_id = '55555555-5555-5555-5555-555555555555')::int,
  0,
  'Propietario: puede eliminar su propio like'
);

-- 7) Usuario sin permisos: no puede eliminar un like ajeno.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
delete from public.likes
  where article_id = 'a1000000-0000-0000-0000-000000000002'
    and user_id = '33333333-3333-3333-3333-333333333333';
reset role;
select is(
  (select count(*) from public.likes
     where article_id = 'a1000000-0000-0000-0000-000000000002'
       and user_id = '33333333-3333-3333-3333-333333333333')::int,
  1,
  'Usuario sin permisos: no puede eliminar un like ajeno'
);

select * from finish();
rollback;
