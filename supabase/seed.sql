-- ============================================================================
-- ReadHub — Datos de prueba (seed)
-- ============================================================================
-- Uso exclusivo para desarrollo local. Se ejecuta automáticamente después de
-- las migraciones con `supabase db reset` (ver supabase/config.toml, [db.seed]).
-- Corre como el rol "postgres" (bypassa RLS), igual que el resto de las
-- migraciones, por lo que no requiere sesión de usuario autenticado.
--
-- Contraseña de todos los usuarios de prueba: ReadHub123!
-- (únicamente para login local vía Supabase Auth; nunca usar en producción).
-- ============================================================================

-- ── USUARIOS DE PRUEBA ───────────────────────────────────────────────────
-- auth.users + auth.identities (requerido por Supabase Auth para permitir
-- login con email/password). El trigger on_auth_user_created crea
-- automáticamente la fila correspondiente en public.profiles (con role
-- 'reader' por defecto), que luego ajustamos según el usuario.

-- Nota: confirmation_token, recovery_token, email_change_token_new y
-- email_change no tienen default en auth.users. GoTrue asume que son
-- cadenas vacías (no NULL) al leer el usuario; sin este valor explícito,
-- el login falla con "converting NULL to string is unsupported".
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'admin@readhub.dev', crypt('ReadHub123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin ReadHub"}',
   now() - interval '60 days', now() - interval '60 days',
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'ana.writer@readhub.dev', crypt('ReadHub123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ana Torres"}',
   now() - interval '45 days', now() - interval '45 days',
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'bruno.writer@readhub.dev', crypt('ReadHub123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bruno Gómez"}',
   now() - interval '40 days', now() - interval '40 days',
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
   'carla.reader@readhub.dev', crypt('ReadHub123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carla Ruiz"}',
   now() - interval '30 days', now() - interval '30 days',
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated',
   'diego.reader@readhub.dev', crypt('ReadHub123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Diego Paz"}',
   now() - interval '20 days', now() - interval '20 days',
   '', '', '', '');

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, created_at, updated_at
) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@readhub.dev"}', 'email', now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"ana.writer@readhub.dev"}', 'email', now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"bruno.writer@readhub.dev"}', 'email', now(), now()),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444',
   '{"sub":"44444444-4444-4444-4444-444444444444","email":"carla.reader@readhub.dev"}', 'email', now(), now()),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555',
   '{"sub":"55555555-5555-5555-5555-555555555555","email":"diego.reader@readhub.dev"}', 'email', now(), now());

-- Ajusta el role y datos de perfil creados por el trigger (default: reader).
update public.profiles set role = 'admin', birth_date = '1988-04-12', phone = '+54 9 11 5555-0001'
  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set role = 'writer', birth_date = '1992-09-03', phone = '+54 9 11 5555-0002'
  where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'writer', birth_date = '1990-01-21', phone = '+54 9 11 5555-0003'
  where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set role = 'reader', birth_date = '1999-06-15', phone = '+54 9 11 5555-0004'
  where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set role = 'reader', birth_date = '2001-11-30', phone = '+54 9 11 5555-0005'
  where id = '55555555-5555-5555-5555-555555555555';

-- ── ARTICLES ─────────────────────────────────────────────────────────────
-- Ana y Bruno son los autores. Cada uno tiene artículos públicos y un
-- borrador (is_public = false) para probar la visibilidad de RLS.

insert into public.articles (id, author_id, title, summary, document_path, image_path, is_public, created_at) values
  ('a1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Introducción a PostgreSQL para nuevos desarrolladores',
   'Los conceptos esenciales para empezar a trabajar con PostgreSQL en proyectos reales.',
   'articles/a1000000-0000-0000-0000-000000000001/document.md',
   'articles/a1000000-0000-0000-0000-000000000001/cover.jpg',
   true, now() - interval '25 days'),
  ('a1000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'Row Level Security explicado con ejemplos',
   'Cómo funciona RLS en Postgres y por qué es clave para proteger datos multiusuario.',
   'articles/a1000000-0000-0000-0000-000000000002/document.md',
   'articles/a1000000-0000-0000-0000-000000000002/cover.jpg',
   true, now() - interval '18 days'),
  ('a1000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222',
   'Borrador: ideas para el próximo artículo',
   'Notas sin terminar, todavía no listas para publicar.',
   'articles/a1000000-0000-0000-0000-000000000003/document.md',
   null,
   false, now() - interval '2 days'),
  ('a1000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333',
   'Next.js 15 y el App Router en profundidad',
   'Server Components, layouts anidados y las novedades del App Router.',
   'articles/a1000000-0000-0000-0000-000000000004/document.md',
   'articles/a1000000-0000-0000-0000-000000000004/cover.jpg',
   true, now() - interval '10 days'),
  ('a1000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333',
   'Notas privadas de investigación',
   'Material de investigación aún no revisado.',
   'articles/a1000000-0000-0000-0000-000000000005/document.md',
   null,
   false, now() - interval '1 days');

-- ── COMMENTS ─────────────────────────────────────────────────────────────

insert into public.comments (article_id, user_id, comment, created_at) values
  ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'Excelente introducción, muy clara para quien recién empieza.', now() - interval '20 days'),
  ('a1000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555',
   'Me hubiera gustado más ejemplos sobre índices.', now() - interval '19 days'),
  ('a1000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444',
   'El App Router cambió por completo mi forma de estructurar proyectos.', now() - interval '9 days'),
  ('a1000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333',
   'Justo lo que necesitaba para entender RLS en mi propio proyecto.', now() - interval '17 days');

-- ── LIKES ────────────────────────────────────────────────────────────────
-- Un like por usuario y artículo (UNIQUE(article_id, user_id)).

insert into public.likes (article_id, user_id, created_at) values
  ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', now() - interval '20 days'),
  ('a1000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', now() - interval '19 days'),
  ('a1000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', now() - interval '9 days'),
  ('a1000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', now() - interval '17 days');

-- ── VIEWS ────────────────────────────────────────────────────────────────
-- Cada fila es un evento independiente; un mismo usuario puede tener varias
-- visualizaciones del mismo artículo (no hay UNIQUE en esta tabla).

insert into public.views (article_id, user_id, viewed_at) values
  ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', now() - interval '21 days'),
  ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', now() - interval '20 days'),
  ('a1000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', now() - interval '19 days'),
  ('a1000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', now() - interval '9 days'),
  ('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now() - interval '15 days'),
  ('a1000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', now() - interval '1 days');

-- ── FAVORITES ────────────────────────────────────────────────────────────
-- Un favorito por usuario y artículo (UNIQUE(article_id, user_id)).

insert into public.favorites (article_id, user_id, created_at) values
  ('a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', now() - interval '20 days'),
  ('a1000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', now() - interval '9 days');
