-- Otorga los privilegios de tabla necesarios a los roles de Supabase.
-- RLS controla QUÉ FILAS son visibles/modificables; estos GRANT controlan
-- qué OPERACIONES puede intentar cada rol sobre cada tabla. Sin ambos,
-- las políticas de la siguiente migración no tienen efecto (Postgres deniega
-- antes de evaluar cualquier política). El alcance de cada GRANT refleja
-- exactamente las políticas RLS definidas para cada tabla.

grant usage on schema public to anon, authenticated;

-- profiles: solo el propio dueño puede leer/actualizar (sin insert/delete vía API).
grant select, update on public.profiles to authenticated;

-- articles: lectura pública de artículos públicos; el resto solo autenticado.
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;

-- comments: lectura pública; escritura solo autenticado.
grant select on public.comments to anon, authenticated;
grant insert, update, delete on public.comments to authenticated;

-- likes: select/insert/delete autenticado, acotado a las propias filas vía RLS.
grant select, insert, delete on public.likes to authenticated;

-- views: insert autenticado; select restringido a admin/autor vía política.
grant select, insert on public.views to authenticated;

-- favorites: select/insert/delete solo autenticado (dueño).
grant select, insert, delete on public.favorites to authenticated;
