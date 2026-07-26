-- Entidad ARTICLES: cada artículo publicado por un usuario.
-- Un usuario (profiles) puede publicar múltiples artículos (1 ---- N).

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
