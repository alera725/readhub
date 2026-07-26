import { createClient } from "@supabase/supabase-js";
import type { Database } from "@readhub/types";

// Cliente Supabase con la clave de servicio (service_role). USO EXCLUSIVO EN
// SERVIDOR: hace bypass de RLS, por lo que NUNCA debe importarse desde un
// componente cliente ni exponerse al navegador.
//
// Se apoya en SUPABASE_SERVICE_ROLE_KEY (sin prefijo NEXT_PUBLIC_), de modo
// que Next.js no la inyecta jamás en el bundle del cliente.
//
// Motivo: la tabla `public.article_embeddings` tiene RLS habilitado SIN
// políticas (ver supabase/migrations/20260704120100_article_embeddings.sql).
// Ningún rol de la API (anon/authenticated) puede escribir en ella; la
// persistencia de embeddings ocurre solo a través de este cliente.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("createAdminClient: falta NEXT_PUBLIC_SUPABASE_URL.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "createAdminClient: falta SUPABASE_SERVICE_ROLE_KEY (Project Settings > API)."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
