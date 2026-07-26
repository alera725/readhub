-- Funciones de listado enriquecido: evitan N+1 llamadas RPC por fila desde
-- el cliente (una por artículo/comentario) devolviendo todo en una sola
-- consulta. Mismo criterio de seguridad que las funciones anteriores:
-- SECURITY DEFINER, solo exponen lo necesario para mostrar la UI pública,
-- nunca datos fuera de lo que la política RLS correspondiente ya permitiría
-- ver fila por fila.

-- Listado principal (página de inicio): todos los artículos públicos con
-- email del autor y conteo de likes/views ya resueltos.
create function public.get_public_articles()
returns table (
  id uuid,
  author_id uuid,
  title text,
  summary text,
  document_path text,
  image_path text,
  created_at timestamptz,
  is_public boolean,
  author_email text,
  likes_count bigint,
  views_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.author_id,
    a.title,
    a.summary,
    a.document_path,
    a.image_path,
    a.created_at,
    a.is_public,
    u.email as author_email,
    (select count(*) from public.likes l where l.article_id = a.id) as likes_count,
    (select count(*) from public.views v where v.article_id = a.id) as views_count
  from public.articles a
  join auth.users u on u.id = a.author_id
  where a.is_public = true
  order by a.created_at desc;
$$;

comment on function public.get_public_articles() is
  'Listado de artículos públicos con email del autor y conteo de likes/views, en una sola consulta. Nunca expone artículos no públicos.';

-- Hilo de comentarios de un artículo, con email del autor de cada
-- comentario. Los comentarios ya son de lectura pública (política
-- "Comments: select all"); esto solo agrega el email del autor.
create function public.get_article_comments(target_article_id uuid)
returns table (
  id uuid,
  article_id uuid,
  user_id uuid,
  comment text,
  created_at timestamptz,
  author_email text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.article_id, c.user_id, c.comment, c.created_at, u.email as author_email
  from public.comments c
  join auth.users u on u.id = c.user_id
  where c.article_id = target_article_id
  order by c.created_at asc;
$$;

comment on function public.get_article_comments(uuid) is
  'Comentarios de un artículo con el email de cada autor, en una sola consulta. Los comentarios ya son públicos vía RLS; esto solo agrega el email.';

revoke execute on function public.get_public_articles() from public, anon;
revoke execute on function public.get_article_comments(uuid) from public, anon;
grant execute on function public.get_public_articles() to authenticated;
grant execute on function public.get_article_comments(uuid) to authenticated;
