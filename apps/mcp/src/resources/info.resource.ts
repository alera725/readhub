import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { APP_NAME, USER_ROLES } from "@readhub/shared";

import type { ReadHubServices } from "../context.js";
import { jsonContents } from "./_shared.js";

// Resource: información general de ReadHub (estático, no accede a Supabase).
// Da al cliente MCP una visión de qué es ReadHub y cómo navegar el resto de
// los Resources.
export function registerInfoResource(
  server: McpServer,
  _services: ReadHubServices
): void {
  server.registerResource(
    "readhub-info",
    "readhub://info",
    {
      title: "Información general de ReadHub",
      description:
        "Descripción general de la plataforma ReadHub y guía de los Resources disponibles.",
      mimeType: "application/json",
    },
    async (uri) =>
      jsonContents(uri, {
        name: APP_NAME,
        description:
          "Plataforma de artículos científicos, académicos y técnicos con búsqueda semántica y asistente RAG.",
        roles: USER_ROLES,
        resources: {
          "readhub://info": "Esta información general.",
          "readhub://articles": "Listado de artículos públicos.",
          "readhub://articles/{id}": "Un artículo por su UUID.",
          "readhub://authors": "Autores con artículos públicos.",
          "readhub://authors/{id}": "Artículos públicos de un autor.",
          "readhub://categories": "Categorías (taxonomía no disponible aún).",
          "readhub://stats": "Estadísticas agregadas del catálogo público.",
        },
      })
  );
}
