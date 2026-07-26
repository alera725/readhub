-- ============================================================================
-- ReadHub — Validación manual de políticas RLS (sin pgTAP, sin Docker)
-- ============================================================================
-- Alternativa a supabase/tests/database/*.sql (pgTAP) pensada para correr
-- directo contra el proyecto Supabase remoto vía `execute_sql` del MCP o
-- `psql`/SQL Editor del dashboard — no requiere la extensión pgtap ni un
-- Postgres local.
--
-- Cada bloque es independiente y autocontenido: `begin; ... rollback;`.
-- Los que solo leen (select) son inofensivos por sí solos; los que escriben
-- (insert/update/delete) usan rollback para no alterar los datos de seed.
--
-- Requiere los datos de supabase/seed.sql ya aplicados (IDs fijos:
-- admin=1111..., ana(writer)=2222..., bruno(writer)=3333...,
-- carla(reader)=4444..., diego(reader)=5555...,
-- artículos públicos a1..01/02/04, borradores a1..03/05).
--
-- Formato de cada test: comentario con el escenario y el resultado esperado,
-- seguido del SQL. Al ejecutarlo, comparar la columna `resultado` esperada.
-- ============================================================================


-- ── PROFILES ─────────────────────────────────────────────────────────────

-- [1] Usuario autenticado ve su propio perfil. Esperado: total = 1
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select count(*) as total, 1 as esperado from public.profiles where id = '44444444-4444-4444-4444-444444444444';
rollback;

-- [2] Usuario sin permisos no ve el perfil de otro. Esperado: total = 0
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select count(*) as total, 0 as esperado from public.profiles where id = '55555555-5555-5555-5555-555555555555';
rollback;

-- [3] Usuario no autenticado (anon) no puede leer profiles. Esperado: total = 0
-- Nota: en Supabase Cloud, anon/authenticated reciben GRANT completo por
-- defecto sobre las tablas (a diferencia del stack local vía CLI/Docker, que
-- arranca sin GRANTs). Por eso el SELECT no lanza "permission denied": el
-- GRANT existe, pero RLS filtra la fila silenciosamente a 0 resultados
-- (ninguna política de profiles incluye a "anon" en su "to"). El acceso
-- sigue bloqueado igual; solo cambia si se observa como error o como
-- conjunto vacío.
begin;
set local role anon;
select count(*) as total, 0 as esperado from public.profiles;
rollback;

-- [4] Un usuario no puede autoescalar su propio role a admin. Esperado: role sigue 'reader'
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';
reset role;
select role::text as resultado, 'reader' as esperado from public.profiles where id = '44444444-4444-4444-4444-444444444444';
rollback;

-- [5] Administrador conserva su rol. Esperado: resultado = 'admin'
begin;
select role::text as resultado, 'admin' as esperado from public.profiles where id = '11111111-1111-1111-1111-111111111111';
rollback;


-- ── ARTICLES ─────────────────────────────────────────────────────────────

-- [6] Usuario no autenticado (anon) solo ve artículos públicos. Esperado: total = 3
begin;
set local role anon;
select count(*) as total, 3 as esperado from public.articles;
rollback;

-- [7] Usuario autenticado sin permisos (no autor) solo ve públicos. Esperado: total = 3
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select count(*) as total, 3 as esperado from public.articles;
rollback;

-- [8] Usuario sin permisos no puede actualizar un artículo ajeno. Esperado: title original (no 'hackeado')
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
update public.articles set title = 'hackeado' where id = 'a1000000-0000-0000-0000-000000000001';
reset role;
select (title <> 'hackeado') as resultado_ok, title from public.articles where id = 'a1000000-0000-0000-0000-000000000001';
rollback;

-- [9] Autor sí puede actualizar su propio artículo. Esperado: resultado_ok = true
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
update public.articles set title = 'Introducción a PostgreSQL (editado)' where id = 'a1000000-0000-0000-0000-000000000001';
reset role;
select (title = 'Introducción a PostgreSQL (editado)') as resultado_ok from public.articles where id = 'a1000000-0000-0000-0000-000000000001';
rollback;

-- [10] Usuario sin permisos no puede insertar un artículo suplantando a otro autor. Esperado: error 42501
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
do $$
begin
  insert into public.articles (author_id, title, is_public)
    values ('22222222-2222-2222-2222-222222222222', 'Suplantación', true);
  raise exception 'FAIL: se esperaba permission denied y no ocurrió';
exception
  when insufficient_privilege then
    raise notice 'PASS: insert bloqueado por RLS/WITH CHECK';
end $$;
rollback;


-- ── COMMENTS ─────────────────────────────────────────────────────────────

-- [11] Usuario no autenticado puede leer comentarios (lectura pública). Esperado: total > 0
begin;
set local role anon;
select (count(*) > 0) as resultado_ok, count(*) as total from public.comments;
rollback;

-- [12] Usuario sin permisos no puede editar un comentario ajeno. Esperado: resultado_ok = true (no cambió)
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
update public.comments set comment = 'hackeado'
  where article_id = 'a1000000-0000-0000-0000-000000000001' and user_id = '44444444-4444-4444-4444-444444444444';
reset role;
select (comment <> 'hackeado') as resultado_ok from public.comments
  where article_id = 'a1000000-0000-0000-0000-000000000001' and user_id = '44444444-4444-4444-4444-444444444444';
rollback;

-- [13a] Usuario sin permisos no puede eliminar un comentario ajeno. Esperado: total = 1 (sigue existiendo)
-- Nota: se separa del [13b] en su propia transacción porque, si ambos delete
-- corrieran en la misma transacción, un "0 filas" final sería ambiguo: no
-- distinguiría "el sin-permiso lo borró él mismo" de "lo dejó y lo borró el
-- admin después". Verificar cada mitad por separado evita ese falso positivo.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
delete from public.comments where article_id = 'a1000000-0000-0000-0000-000000000002' and user_id = '33333333-3333-3333-3333-333333333333';
reset role;
select count(*) as total, 1 as esperado from public.comments where article_id = 'a1000000-0000-0000-0000-000000000002' and user_id = '33333333-3333-3333-3333-333333333333';
rollback;

-- [13b] Administrador sí puede eliminar un comentario ajeno. Esperado: total = 0
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
delete from public.comments where article_id = 'a1000000-0000-0000-0000-000000000002' and user_id = '33333333-3333-3333-3333-333333333333';
reset role;
select count(*) as total, 0 as esperado from public.comments where article_id = 'a1000000-0000-0000-0000-000000000002' and user_id = '33333333-3333-3333-3333-333333333333';
rollback;


-- ── LIKES ────────────────────────────────────────────────────────────────

-- [14] Usuario autenticado solo ve sus propios likes. Esperado: total = 2 (los de carla)
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select count(*) as total, 2 as esperado from public.likes;
rollback;

-- [15] Usuario sin permisos no puede dar like a nombre de otro. Esperado: error 42501
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
do $$
begin
  insert into public.likes (article_id, user_id)
    values ('a1000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555');
  raise exception 'FAIL: se esperaba permission denied y no ocurrió';
exception
  when insufficient_privilege then
    raise notice 'PASS: insert bloqueado por RLS/WITH CHECK';
end $$;
rollback;

-- [16] Restricción UNIQUE: no se puede duplicar un like. Esperado: error 23505
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
do $$
begin
  insert into public.likes (article_id, user_id)
    values ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444');
  raise exception 'FAIL: se esperaba unique_violation y no ocurrió';
exception
  when unique_violation then
    raise notice 'PASS: unique_violation detectada correctamente';
end $$;
rollback;

-- [17] Propietario puede eliminar su propio like; usuario sin permisos no puede eliminar el ajeno.
-- Esperado: propio=0 filas restantes (se borró), ajeno=1 fila restante (no se borró).
-- El "ajeno" usa el like real de bruno sobre a1..02 (ver seed.sql) — usar un
-- par (article_id,user_id) que no existe daría 0 en ambos casos y no
-- probaría nada (ese fue justamente un error detectado al ejecutar este
-- script contra el remoto).
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
delete from public.likes where article_id = 'a1000000-0000-0000-0000-000000000001' and user_id = '44444444-4444-4444-4444-444444444444';
delete from public.likes where article_id = 'a1000000-0000-0000-0000-000000000002' and user_id = '33333333-3333-3333-3333-333333333333';
reset role;

select
  (select count(*) from public.likes where article_id = 'a1000000-0000-0000-0000-000000000001' and user_id = '44444444-4444-4444-4444-444444444444') as propio_esperado_0,
  (select count(*) from public.likes where article_id = 'a1000000-0000-0000-0000-000000000002' and user_id = '33333333-3333-3333-3333-333333333333') as ajeno_esperado_1_no_se_borro;
rollback;


-- ── VIEWS ────────────────────────────────────────────────────────────────

-- [18] Autor ve las views de su propio borrador; admin ve las de cualquier artículo;
-- usuario sin permisos no ve las de un artículo ajeno.
-- Esperado: autor > 0, admin > 0, sin_permiso = 0
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select (count(*) > 0) as autor_ve_su_borrador from public.views where article_id = 'a1000000-0000-0000-0000-000000000003';
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select (count(*) > 0) as admin_ve_cualquier_articulo from public.views where article_id = 'a1000000-0000-0000-0000-000000000001';
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select count(*) as sin_permiso_esperado_0 from public.views where article_id = 'a1000000-0000-0000-0000-000000000001';
rollback;

-- [19] Usuario no autenticado (anon) no puede leer views. Esperado: total = 0
-- (mismo caso que [3]: en Supabase Cloud anon tiene GRANT de tabla, pero
-- ninguna política de views incluye "anon" en su "to", así que RLS filtra
-- todo silenciosamente en vez de lanzar un error).
begin;
set local role anon;
select count(*) as total, 0 as esperado from public.views;
rollback;


-- ── FAVORITES ────────────────────────────────────────────────────────────

-- [20] Propietario ve sus propios favoritos; usuario sin permisos no ve los ajenos.
-- Esperado: propio = 1, ajeno_filtrado = 0
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select count(*) as propio_esperado_1 from public.favorites;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select count(*) as ajeno_filtrado_esperado_0 from public.favorites where user_id = '44444444-4444-4444-4444-444444444444';
rollback;

-- [21] Usuario sin permisos no puede agregar un favorito a nombre de otro. Esperado: error 42501
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
do $$
begin
  insert into public.favorites (article_id, user_id)
    values ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444');
  raise exception 'FAIL: se esperaba permission denied y no ocurrió';
exception
  when insufficient_privilege then
    raise notice 'PASS: insert bloqueado por RLS/WITH CHECK';
end $$;
rollback;

-- [22] Usuario sin permisos no puede eliminar un favorito ajeno. Esperado: total = 1 (sigue existiendo)
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
delete from public.favorites where article_id = 'a1000000-0000-0000-0000-000000000001' and user_id = '44444444-4444-4444-4444-444444444444';
reset role;
select count(*) as esperado_1 from public.favorites where article_id = 'a1000000-0000-0000-0000-000000000001' and user_id = '44444444-4444-4444-4444-444444444444';
rollback;
