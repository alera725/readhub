# app/api

Carpeta reservada para Route Handlers de una API REST versionada (`/api/v1/...`),
prevista en la especificación (§7).

**No se implementó en este MVP a propósito.** La arquitectura del laboratorio
(restricciones §9) exige que todo el acceso a datos pase por la capa `services/`
consumida vía `hooks/`, sobre el cliente de Supabase con RLS. El frontend nunca
llama a `/api/*`: PostgREST (la API REST autogenerada de Supabase) cumple ese rol,
con la seguridad aplicada por RLS.

El scaffolding original (`app/api/v1/**/route.ts` vacíos) se eliminó porque los
archivos sin exports no son módulos válidos y rompían `npm run build`. La carpeta
queda como punto de extensión para cuando se decida exponer endpoints propios.

## Endpoints internos (no son API del frontend)

`app/api/webhooks/articles/route.ts` **no** forma parte del flujo de datos del
SPA (que sigue pasando por `services/` + `hooks/` sobre PostgREST con RLS). Es un
receptor **máquina-a-máquina** del Database Webhook de Supabase para la indexación
automática de embeddings (RAG, fase 5): se ejecuta en servidor con `service_role`,
está autenticado por la cabecera `x-webhook-secret` y reutiliza
`services/indexing.service.ts`. Su configuración por entorno vive en
`supabase/webhooks.sql`.
