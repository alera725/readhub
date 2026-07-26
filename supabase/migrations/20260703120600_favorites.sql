-- Entidad FAVORITES: artículos guardados por un usuario.
-- Funcionalidad prevista para fases posteriores; la estructura queda preparada desde el inicio.

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (article_id, user_id)
);

comment on table public.favorites is 'Artículos guardados por un usuario. Único por (article_id, user_id).';

create index favorites_article_id_idx on public.favorites (article_id);
