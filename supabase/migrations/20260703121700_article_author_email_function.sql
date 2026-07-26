-- Resuelve el email del autor de un artículo para mostrarlo como "autor".
-- Mismo motivo y mismo patrón que get_article_likes_count/views_count: la
-- tabla profiles no tiene columna de nombre (nunca la tuvo, y el formulario
-- de registro del laboratorio tampoco lo pide), así que el único
-- identificador disponible es el email en auth.users — schema no expuesto
-- vía PostgREST/RLS a otros usuarios. Esta función SECURITY DEFINER expone
-- únicamente el email del autor, y solo si el artículo es visible para
-- quien pregunta (público, propio o admin); en cualquier otro caso
-- devuelve NULL. No modifica ninguna política RLS existente.

create function public.get_article_author_email(target_article_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.articles a
  join auth.users u on u.id = a.author_id
  where a.id = target_article_id
    and (a.is_public = true or a.author_id = auth.uid() or public.is_admin());
$$;

comment on function public.get_article_author_email(uuid) is
  'Devuelve el email del autor de un artículo si es visible para quien consulta (público, propio o admin); NULL en cualquier otro caso.';

revoke execute on function public.get_article_author_email(uuid) from public, anon;
grant execute on function public.get_article_author_email(uuid) to authenticated;
