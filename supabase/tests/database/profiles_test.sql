-- Valida las políticas RLS de public.profiles.
-- Escenarios: usuario autenticado, usuario sin permisos, no autenticado, admin.
-- Usa los datos fijos de supabase/seed.sql.
begin;
select plan(6);

-- 1) Usuario autenticado: puede ver su propio perfil.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select is(
  (select count(*) from public.profiles where id = '44444444-4444-4444-4444-444444444444')::int,
  1,
  'Usuario autenticado: ve su propio perfil'
);

-- 2) Usuario sin permisos: no ve el perfil de otro usuario.
select is(
  (select count(*) from public.profiles where id = '55555555-5555-5555-5555-555555555555')::int,
  0,
  'Usuario sin permisos: no puede ver el perfil de otro usuario'
);
reset role;

-- 3) Usuario no autenticado (anon): sin acceso de lectura a profiles.
set local role anon;
select throws_ok(
  $$ select count(*) from public.profiles $$,
  '42501',
  null,
  'Usuario no autenticado: permission denied al leer profiles'
);
reset role;

-- 4) Usuario sin permisos (sobre su propio rol): no puede autoescalar a admin.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';
reset role;
select is(
  (select role::text from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  'reader',
  'Usuario autenticado: no puede autoescalar su propio role a admin'
);

-- 5) Usuario autenticado (autor del propio recurso): sí puede editar otros campos propios.
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
update public.profiles set phone = '+54 9 11 0000-0000' where id = '44444444-4444-4444-4444-444444444444';
reset role;
select is(
  (select phone from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  '+54 9 11 0000-0000',
  'Usuario autenticado: puede modificar otros campos de su propio perfil'
);

-- 6) Administrador: conserva su rol admin (sanity check de datos de seed).
select is(
  (select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'admin',
  'Administrador: su perfil tiene role = admin'
);

select * from finish();
rollback;
