import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { jsonContents } from "./_shared.js";

// Resources de artículos. Reutilizan los servicios de @readhub/database sin
// duplicar consultas: la colección usa getPublicArticles y el individual
// getArticleById.
export function registerArticleResources(
  server: McpServer,
  services: ReadHubServices
): void {
  // Colección: todos los artículos públicos.
  server.registerResource(
    "readhub-articles",
    "readhub://articles",
    {
      title: "Artículos públicos",
      description:
        "Listado de los artículos públicos de ReadHub (autor, fecha, likes y views).",
      mimeType: "application/json",
    },
    async (uri) => {
      const articles = await services.database.getPublicArticles(
        services.getSupabase()
      );
      return jsonContents(uri, { count: articles.length, articles });
    }
  );

  // Individual: un artículo por su UUID (URI parametrizada).
  server.registerResource(
    "readhub-article",
    new ResourceTemplate("readhub://articles/{id}", { list: undefined }),
    {
      title: "Artículo por ID",
      description: "Un artículo de ReadHub identificado por su UUID.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const id = String(variables.id);
      const article = await services.database.getArticleById(
        services.getSupabase(),
        id
      );
      return jsonContents(
        uri,
        article ?? { error: `No se encontró ningún artículo con el ID ${id}.` }
      );
    }
  );
}
