-- Valida las políticas RLS de public.comments.
-- Escenarios: no autenticado, autenticado, autor del recurso, sin permisos, admin.
-- Usa los datos fijos de supabase/seed.sql.
begin;
select plan(7);

-- 1) Usuario no autenticado (anon): puede leer comentarios (lectura pública).
set local role anon;
select ok(
  (select count(*) from public.comments) > 0,
  'Usuario no autenticado: puede leer comentarios'
);
reset role;

-- 2) Usuario sin permisos: no puede actualizar un comentario ajeno.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
update public.comments set comment = 'hackeado'
  where article_id = 'a1000000-0000-0000-0000-000000000001'
    and user_id = '44444444-4444-4444-4444-444444444444';
reset role;
select isnt(
  (select comment from public.comments
     where article_id = 'a1000000-0000-0000-0000-000000000001'
       and user_id = '44444444-4444-4444-4444-444444444444'),
  'hackeado',
  'Usuario sin permisos: no puede editar un comentario ajeno'
);

-- 3) Autor del comentario: sí puede editarlo.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
update public.comments set comment = 'Editado por su autora'
  where article_id = 'a1000000-0000-0000-0000-000000000001'
    and user_id = '44444444-4444-4444-4444-444444444444';
reset role;
select is(
  (select comment from public.comments
     where article_id = 'a1000000-0000-0000-0000-000000000001'
       and user_id = '44444444-4444-4444-4444-444444444444'),
  'Editado por su autora',
  'Autor del comentario: puede editar su propio comentario'
);

-- 4) Usuario sin permisos: no puede eliminar un comentario ajeno.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
delete from public.comments
  where article_id = 'a1000000-0000-0000-0000-000000000002'
    and user_id = '33333333-3333-3333-3333-333333333333';
reset role;
select is(
  (select count(*) from public.comments
     where article_id = 'a1000000-0000-0000-0000-000000000002'
       and user_id = '33333333-3333-3333-3333-333333333333')::int,
  1,
  'Usuario sin permisos: no puede eliminar un comentario ajeno'
);

-- 5) Administrador: sí puede eliminar un comentario ajeno.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
delete from public.comments
  where article_id = 'a1000000-0000-0000-0000-000000000002'
    and user_id = '33333333-3333-3333-3333-333333333333';
reset role;
select is(
  (select count(*) from public.comments
     where article_id = 'a1000000-0000-0000-0000-000000000002'
       and user_id = '33333333-3333-3333-3333-333333333333')::int,
  0,
  'Administrador: puede eliminar un comentario ajeno'
);

-- 6) Usuario sin permisos: no puede insertar un comentario suplantando a otro usuario.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.comments (article_id, user_id, comment)
     values ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Suplantación') $$,
  '42501',
  null,
  'Usuario sin permisos: no puede comentar a nombre de otro usuario'
);
reset role;

-- 7) Usuario autenticado: puede insertar su propio comentario.
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
insert into public.comments (article_id, user_id, comment)
  values ('a1000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Otro comentario más de Diego');
reset role;
select ok(
  (select count(*) from public.comments
     where article_id = 'a1000000-0000-0000-0000-000000000001'
       and user_id = '55555555-5555-5555-5555-555555555555') >= 1,
  'Usuario autenticado: puede insertar su propio comentario'
);

select * from finish();
rollback;
