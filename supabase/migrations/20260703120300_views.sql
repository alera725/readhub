-- Entidad VIEWS: registra cada apertura de un artículo como un evento independiente.
-- No almacena contadores; las estadísticas se obtienen mediante consultas SQL.

create table public.views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

comment on table public.views is 'Evento de visualización de un artículo (uno por apertura, sin contador).';

create index views_article_id_idx on public.views (article_id);
