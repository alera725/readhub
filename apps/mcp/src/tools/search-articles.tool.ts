import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { jsonResult, runTool } from "./_shared.js";

// Tool: búsqueda de artículos por palabra clave (coincidencia en título/resumen).
// Reutiliza database.getPublicArticles y filtra el catálogo público; la
// visibilidad ya la resuelve el servicio. Es una búsqueda léxica simple: para
// búsqueda por significado, ver la Tool semantic_search_articles.
export function registerSearchArticles(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "search_articles",
    {
      title: "Buscar artículos (palabra clave)",
      description:
        "Busca artículos públicos de ReadHub cuya coincidencia de palabra clave aparezca en el título o el resumen. Para búsqueda por significado usar 'semantic_search_articles'.",
      inputSchema: {
        query: z.string().min(1).describe("Texto a buscar en título/resumen."),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Máximo de resultados (por defecto 10)."),
      },
    },
    async ({ query, limit }) =>
      runTool(async () => {
        const needle = query.trim().toLowerCase();
        const articles = await services.database.getPublicArticles(
          services.getSupabase()
        );
        const matches = articles.filter((article) => {
          const haystack = `${article.title ?? ""} ${article.summary ?? ""}`.toLowerCase();
          return haystack.includes(needle);
        });
        return jsonResult(matches.slice(0, limit ?? 10));
      })
  );
}
