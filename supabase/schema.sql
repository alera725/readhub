-- ============================================================================
-- ReadHub — Esquema relacional (snapshot de referencia)
-- ============================================================================
-- Este archivo es una vista consolidada y de solo lectura del esquema.
-- NO se ejecuta directamente: la fuente de verdad son los archivos versionados
-- en supabase/migrations/, aplicados en orden mediante el CLI de Supabase
-- (`supabase db reset` / `supabase migration up`).
-- ============================================================================

-- ── Extensiones ──────────────────────────────────────────────────────────
create extension if not exists "pgcrypto" with schema extensions;

-- ── PROFILES ─────────────────────────────────────────────────────────────
-- Usuarios registrados en la plataforma. Relación 1:1 con auth.users,
-- usando el mismo UUID como clave primaria y clave foránea.
create type public.user_role as enum ('reader', 'writer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  birth_date date,
  phone text,
  role public.user_role not null default 'reader',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Usuarios registrados en la plataforma. 1:1 con auth.users.';
comment on column public.profiles.id is 'Mismo UUID que auth.users.id.';
comment on column public.profiles.role is 'reader, writer o admin.';

-- Crea automáticamente el perfil correspondiente cuando se registra un usuario en auth.users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── ARTICLES ─────────────────────────────────────────────────────────────
-- Artículos publicados por los usuarios. Un usuario puede publicar
-- múltiples artículos (1 ---- N).
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  summary text,
  document_path text,
  image_path text,
  created_at timestamptz not null default now(),
  is_public boolean not null default false
);

comment on table public.articles is 'Artículos publicados por los usuarios.';
comment on column public.articles.author_id is 'Propietario del artículo (public.profiles.id).';
comment on column public.articles.is_public is 'Controla la visibilidad pública del artículo.';

create index articles_author_id_idx on public.articles (author_id);

-- ── VIEWS ────────────────────────────────────────────────────────────────
-- Evento de apertura de un artículo. No almacena contadores: cada
-- visualización es un evento independiente para permitir estadísticas vía SQL.
create table public.views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

comment on table public.views is 'Evento de visualización de un artículo (uno por apertura, sin contador).';

create index views_article_id_idx on public.views (article_id);

-- ── LIKES ────────────────────────────────────────────────────────────────
-- "Me gusta" de un usuario sobre un artículo. Un usuario solo puede
-- registrar un like por artículo.
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (article_id, user_id)
);

comment on table public.likes is 'Me gusta de un usuario sobre un artículo. Único por (article_id, user_id).';

create index likes_article_id_idx on public.likes (article_id);

-- ── COMMENTS ─────────────────────────────────────────────────────────────
-- Comentarios realizados sobre un artículo.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

comment on table public.comments is 'Comentarios de un usuario sobre un artículo.';

create index comments_article_id_idx on public.comments (article_id);

-- ── FAVORITES ────────────────────────────────────────────────────────────
-- Artículos guardados por un usuario. Funcionalidad prevista para fases
-- posteriores; la estructura queda preparada desde el inicio.
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (article_id, user_id)
);

comment on table public.favorites is 'Artículos guardados por un usuario. Único por (article_id, user_id).';

create index favorites_article_id_idx on public.favorites (article_id);

-- ── ARTICLE_EMBEDDINGS (infraestructura RAG, sesión 4) ────────────────────
-- Almacenamiento vectorial para búsqueda semántica. Tabla separada de
-- `articles` (no una columna) para no cargar cada SELECT con 1536 floats,
-- permitir evolucionar a chunking, y guardar metadatos del modelo.
-- Ver migraciones 20260704120000/120100/120200. Requiere pgvector.
create table public.article_embeddings (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  embedding extensions.vector(1536) not null,
  model text not null,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id)
);

create index article_embeddings_article_id_idx on public.article_embeddings (article_id);
create index article_embeddings_embedding_hnsw_idx
  on public.article_embeddings using hnsw (embedding extensions.vector_cosine_ops);

alter table public.article_embeddings enable row level security;
-- Sin políticas: acceso solo vía función SECURITY DEFINER match_articles()
-- (lectura) y service_role (escritura, fase 4).

-- match_articles(query_embedding, match_count=5, similarity_threshold=0.0):
-- Top-K por similitud coseno respetando visibilidad (público/propio/admin).
