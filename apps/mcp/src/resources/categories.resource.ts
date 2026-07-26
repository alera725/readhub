import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { jsonContents } from "./_shared.js";

// Resource: categorías.
//
// IMPORTANTE (honestidad de datos): el modelo de datos actual de ReadHub NO
// tiene taxonomía de categorías — los artículos no cuentan con campo
// categoría/etiquetas (ver esquema en supabase/). Por eso este Resource
// devuelve una lista vacía y lo declara explícitamente, en vez de inventar
// categorías. La URI queda reservada para cuando exista esa capacidad.
export function registerCategoriesResource(
  server: McpServer,
  _services: ReadHubServices
): void {
  server.registerResource(
    "readhub-categories",
    "readhub://categories",
    {
      title: "Categorías",
      description:
        "Categorías de artículos. ReadHub aún no define una taxonomía de categorías en su modelo de datos; se expone vacío y reservado para el futuro.",
      mimeType: "application/json",
    },
    async (uri) =>
      jsonContents(uri, {
        taxonomy: "unavailable",
        categories: [],
        note: "El modelo de datos de ReadHub no incluye categorías/etiquetas todavía. Reservado para una futura iteración.",
      })
  );
}
