import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../../context.js";
import { articleQueryText } from "../../lib/article-query.js";
import { jsonResult, runTool } from "../_shared.js";

// Tool de análisis: identificar relaciones entre documentos.
// Reutiliza database.getArticleById + rag.searchArticles: dado un artículo,
// devuelve los más relacionados del catálogo con su puntuación de similitud.
// Determinista (no llama al LLM).
export function registerMapArticleRelationships(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "map_article_relationships",
    {
      title: "Mapear relaciones entre documentos",
      description:
        "Dado un artículo (por su UUID), identifica los artículos de ReadHub más relacionados por significado, con su puntuación de similitud. Útil para descubrir vínculos entre documentos.",
      inputSchema: {
        articleId: z.string().uuid().describe("UUID del artículo de origen."),
        topK: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe("Cantidad de relaciones a devolver (por defecto 5)."),
      },
    },
    async ({ articleId, topK }) =>
      runTool(async () => {
        const client = services.getSupabase();
        const source = await services.database.getArticleById(client, articleId);
        if (!source) {
          return jsonResult({
            source: { id: articleId, error: "no encontrado" },
            related: [],
          });
        }

        const query = articleQueryText(source);
        const result = await services.rag.searchArticles(client, query, {
          topK: (topK ?? 5) + 1, // +1 para descartar el propio artículo
        });
        const related = result.results
          .filter((match) => match.articleId !== articleId)
          .slice(0, topK ?? 5)
          .map((match) => ({
            articleId: match.articleId,
            title: match.title,
            similarity: Number(match.similarity.toFixed(4)),
          }));

        return jsonResult({
          source: { id: source.id, title: source.title },
          related,
        });
      })
  );
}
