-- Almacenamiento vectorial de artículos (infraestructura RAG).
--
-- Se elige una TABLA SEPARADA (no una columna `embedding` en `articles`)
-- por cuatro razones, alineadas con la evaluación pedida:
--   * Rendimiento: `articles` se lee en cada listado; no conviene cargar cada
--     SELECT con 1536 floats que la UI relacional nunca usa.
--   * Escalabilidad / futuras ampliaciones: el RAG puede evolucionar a
--     "chunking" (varios fragmentos por artículo) — con tabla separada eso es
--     agregar filas, sin cambios estructurales; una columna única no lo permite.
--   * Mantenimiento: se guardan metadatos del modelo, lo que permite cambiar de
--     proveedor o re-embeber sin ambigüedad.
--   * Aislamiento: no modifica la tabla `articles` ni ninguna migración previa.
--
-- Por ahora: UNA representación vigente por artículo (unique article_id).
-- La FK con ON DELETE CASCADE garantiza que al borrar un artículo no queden
-- embeddings huérfanos (requisito de consistencia de la fase 5).

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

comment on table public.article_embeddings is
  'Embeddings vectoriales de artículos para búsqueda semántica (RAG). Una representación vigente por artículo; preparada para evolucionar a chunking.';
comment on column public.article_embeddings.embedding is
  'Vector de 1536 dimensiones (OpenAI text-embedding-3-small).';
comment on column public.article_embeddings.model is
  'Identificador del modelo/proveedor que generó el embedding; permite migrar de proveedor sin ambigüedad.';
comment on column public.article_embeddings.content_hash is
  'Hash del texto vectorizado; permite (fase 5) detectar cambios y evitar re-embeber contenido sin modificar.';

-- Índice sobre la FK: acelera el reemplazo/borrado del embedding de un
-- artículo concreto (upsert por article_id en fases 4/5).
create index article_embeddings_article_id_idx
  on public.article_embeddings (article_id);

-- Índice vectorial HNSW con distancia coseno (estándar para embeddings de
-- texto normalizados como los de OpenAI).
--
-- Se elige HNSW sobre IVFFlat porque:
--   * IVFFlat necesita datos existentes para entrenar sus listas, y esta tabla
--     nace vacía (esta fase no persiste embeddings reales) — un IVFFlat sobre
--     tabla vacía daría recuperación pobre.
--   * HNSW ofrece alta recuperación desde cero filas y es óptimo para el
--     volumen esperado de ReadHub (catálogo pequeño-mediano).
--   * La dimensión (1536) está por debajo del límite indexable de pgvector
--     (2000) para el tipo `vector`.
create index article_embeddings_embedding_hnsw_idx
  on public.article_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- RLS habilitado SIN políticas: ningún rol de la API (anon/authenticated)
-- accede directamente a esta tabla (además, no se le otorga ningún GRANT).
-- El acceso de lectura ocurre exclusivamente vía funciones SECURITY DEFINER
-- (match_articles), y la escritura (fase 4) vía service_role en el servidor.
-- Coincide con la postura del resto del proyecto: todas las tablas de `public`
-- tienen RLS habilitado, y evita el advisor de seguridad de Supabase.
alter table public.article_embeddings enable row level security;
