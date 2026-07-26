import * as database from "@readhub/database";
import * as rag from "@readhub/rag";
import * as ai from "@readhub/ai";

// Integración del servidor MCP con la lógica de negocio del monorepo.
//
// El MCP CONSUME los paquetes compartidos; no reimplementa nada. Se agrupan aquí
// los servicios y se provee el cliente Supabase que esos servicios reciben por
// parámetro, para inyectarlos a las Tools/Resources/Prompts.

type AdminClient = ReturnType<typeof database.createAdminClient>;

export interface ReadHubServices {
  /** Cliente admin + servicios de datos (auth, article, comment, storage). */
  readonly database: typeof database;
  /** Pipeline RAG: embeddings, indexación, búsqueda, contexto y chat. */
  readonly rag: typeof rag;
  /** Proveedor LLM intercambiable. */
  readonly ai: typeof ai;
  /**
   * Cliente Supabase (service_role) memoizado. LAZY: se crea recién en el primer
   * uso (dentro de una Tool), de modo que el arranque del servidor no accede a
   * Supabase ni exige variables de entorno.
   */
  getSupabase(): AdminClient;
}

let cachedClient: AdminClient | undefined;

// Reúne los servicios compartidos disponibles para el servidor MCP. Solo
// referencia módulos existentes (no ejecuta lógica de negocio).
export function getReadHubServices(): ReadHubServices {
  return {
    database,
    rag,
    ai,
    getSupabase() {
      if (!cachedClient) {
        cachedClient = database.createAdminClient();
      }
      return cachedClient;
    },
  };
}
