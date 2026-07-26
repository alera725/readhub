-- Búsqueda semántica por similitud (infraestructura RAG reutilizable).
--
-- Encapsula la lógica de recuperación vectorial para que los Services de
-- fases posteriores (vector-search.service) la invoquen sin conocer detalles
-- de pgvector. NO se llama todavía desde la aplicación.
--
-- Recibe el embedding YA CALCULADO de la consulta (la conversión texto→vector
-- ocurre en el service, nunca en SQL: esta fase no genera embeddings ni llama
-- a IA) y devuelve el Top-K de artículos ordenados por relevancia.
--
-- Seguridad: SECURITY DEFINER con el MISMO criterio de visibilidad que el
-- resto del proyecto (público, propio o admin). La búsqueda NUNCA expone
-- borradores ajenos — igual que get_public_articles y la política de SELECT
-- de `articles`. `search_path = public, extensions` para resolver el operador
-- de distancia coseno `<=>` (vive en el schema `extensions`).
--
-- Parámetros y sus valores por defecto:
--   * match_count = 5      → Top-K razonable para RAG: suficiente contexto sin
--                            inflar tokens. La fase 6 podrá ajustarlo.
--   * similarity_threshold = 0.0 → por defecto no descarta nada (pura búsqueda
--                            Top-K); el filtrado por umbral es opt-in y lo
--                            calibrará el service de recuperación (fase 6).
--
-- similarity = 1 - distancia_coseno  → rango (-1..1], mayor = más parecido.
-- El ORDER BY usa la distancia cruda (`<=>`), que es lo que aprovecha el
-- índice HNSW.

create function public.match_articles(
  query_embedding extensions.vector(1536),
  match_count int default 5,
  similarity_threshold float default 0.0
)
returns table (
  article_id uuid,
  title text,
  summary text,
  author_id uuid,
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    a.id as article_id,
    a.title,
    a.summary,
    a.author_id,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.article_embeddings e
  join public.articles a on a.id = e.article_id
  where (a.is_public = true or a.author_id = auth.uid() or public.is_admin())
    and (1 - (e.embedding <=> query_embedding)) >= similarity_threshold
  order by e.embedding <=> query_embedding
  limit greatest(match_count, 0);
$$;

comment on function public.match_articles(extensions.vector, int, float) is
  'Top-K de artículos por similitud coseno respecto a un embedding de consulta. Respeta la visibilidad (público/propio/admin). No genera embeddings ni llama a modelos de IA.';

-- Mismo patrón de exposición que el resto de funciones del proyecto: solo
-- invocable por usuarios autenticados; anon no participa del RAG.
revoke execute on function public.match_articles(extensions.vector, int, float) from public, anon;
grant execute on function public.match_articles(extensions.vector, int, float) to authenticated;
