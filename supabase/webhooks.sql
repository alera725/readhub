-- ===========================================================================
-- Auto-indexación de embeddings vía trigger HTTP (pg_net)
-- ===========================================================================
--
-- NO es una migración versionada: la URL del endpoint y el secreto son
-- específicos del entorno (dev con túnel / preview / prod), por lo que no van
-- en supabase/migrations/. Sigue la convención de policies.sql/rls_validation.sql.
--
-- Enfoque autocontenido con `pg_net` (sin depender de supabase_functions):
-- un trigger sobre public.articles arma el mismo payload que un Database
-- Webhook nativo ({type, table, schema, record, old_record}) y lo envía por
-- HTTP POST al endpoint app/api/webhooks/articles/route.ts, que lo autentica
-- con la cabecera x-webhook-secret y dispara indexing.service.
--
-- pg_net.http_post es asíncrono (fire-and-forget): si el endpoint está caído,
-- la escritura del artículo NO se bloquea. Requiere una URL PÚBLICA alcanzable
-- desde la base (deploy, o un túnel a localhost).
--
-- Aplicar por entorno sustituyendo <APP_URL> y <ARTICLE_WEBHOOK_SECRET>.

create extension if not exists pg_net;

create or replace function public.notify_article_change()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    'old_record', case when tg_op = 'DELETE' then to_jsonb(old) else null end
  );

  perform net.http_post(
    url := '<APP_URL>/api/webhooks/articles',
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '<ARTICLE_WEBHOOK_SECRET>'
    )
  );

  return null; -- trigger AFTER: el valor de retorno se ignora
end;
$$;

drop trigger if exists index_article_on_change on public.articles;

create trigger index_article_on_change
  after insert or update or delete on public.articles
  for each row
  execute function public.notify_article_change();

-- Para desactivar la auto-indexación:
--   drop trigger if exists index_article_on_change on public.articles;
--
-- Notas de consistencia:
--   * DELETE: además del webhook, la FK article_embeddings.article_id →
--     articles(id) es ON DELETE CASCADE (el embedding se borra estructuralmente).
--   * INSERT/UPDATE: el pipeline hace UPSERT por article_id (una representación
--     vigente por artículo) con corto-circuito por content_hash.
