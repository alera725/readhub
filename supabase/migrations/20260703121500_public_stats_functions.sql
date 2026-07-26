-- Funciones de conteo público para likes/views.
-- Las políticas de SELECT de "likes" (propio) y "views" (admin o autor) son
-- correctas para proteger el detalle de quién dio like o vio un artículo,
-- pero como efecto colateral impiden mostrar el CONTEO agregado a terceros
-- (ej. "cantidad de me gusta" en la tarjeta de un artículo público, visible
-- para cualquier lector). Estas funciones SECURITY DEFINER exponen
-- únicamente el número, nunca las filas, y solo lo calculan si el artículo
-- es realmente visible para quien pregunta (público, propio o admin) —
-- para cualquier otro caso devuelven 0, igual que devolvería la política
-- de SELECT existente. No modifican ninguna política RLS ya creada.

create function public.get_article_likes_count(target_article_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.likes
  where article_id = target_article_id
    and exists (
      select 1 from public.articles
      where id = target_article_id
        and (is_public = true or author_id = auth.uid() or public.is_admin())
    );
$$;

create function public.get_article_views_count(target_article_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.views
  where article_id = target_article_id
    and exists (
      select 1 from public.articles
      where id = target_article_id
        and (is_public = true or author_id = auth.uid() or public.is_admin())
    );
$$;

comment on function public.get_article_likes_count(uuid) is
  'Cuenta likes de un artículo sin exponer las filas individuales. Devuelve 0 si el artículo no es visible para quien consulta (no público, no propio, no admin).';
comment on function public.get_article_views_count(uuid) is
  'Cuenta views de un artículo sin exponer las filas individuales. Devuelve 0 si el artículo no es visible para quien consulta (no público, no propio, no admin).';

-- Mismo criterio de exposición pública que is_article_author(): callable
-- por cualquier rol autenticado (necesitan poder consultar el conteo de
-- artículos públicos ajenos); anon no tiene ninguna política/grant sobre
-- likes/views y no le hace falta invocarlas.
revoke execute on function public.get_article_likes_count(uuid) from public, anon;
revoke execute on function public.get_article_views_count(uuid) from public, anon;
grant execute on function public.get_article_likes_count(uuid) to authenticated;
grant execute on function public.get_article_views_count(uuid) to authenticated;
