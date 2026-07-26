import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../../context.js";
import { articleQueryText } from "../../lib/article-query.js";
import { jsonResult, runTool } from "../_shared.js";

// Tool de análisis: comparar múltiples artículos.
// Reutiliza database.getArticleById (metadatos) + rag.searchArticles (similitud
// semántica entre los artículos del conjunto). Determinista: no llama al LLM;
// devuelve conocimiento estructurado para que el modelo del cliente lo analice.
export function registerCompareMultipleArticles(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "compare_multiple_articles",
    {
      title: "Comparar múltiples artículos",
      description:
        "Compara varios artículos de ReadHub (por sus UUID): devuelve sus metadatos lado a lado y la matriz de similitud semántica entre ellos. Base estructurada para que el modelo detecte coincidencias y diferencias.",
      inputSchema: {
        articleIds: z
          .array(z.string().uuid())
          .min(2)
          .max(8)
          .describe("UUID de los artículos a comparar (entre 2 y 8)."),
      },
    },
    async ({ articleIds }) =>
      runTool(async () => {
        const client = services.getSupabase();
        const idSet = new Set(articleIds);

        const rows = await Promise.all(
          articleIds.map((id) => services.database.getArticleById(client, id))
        );
        const articles = rows.map((article, i) =>
          article
            ? {
                id: article.id,
                title: article.title,
                summary: article.summary,
                authorId: article.author_id,
                isPublic: article.is_public,
              }
            : { id: articleIds[i], error: "no encontrado" }
        );

        // Similitud semántica entre los del conjunto: se busca con el texto de
        // cada artículo y se registran las coincidencias con los demás ids.
        const semanticSimilarity: Array<{
          from: string;
          to: string;
          similarity: number;
        }> = [];
        for (const article of rows) {
          if (!article) continue;
          const query = articleQueryText(article);
          const result = await services.rag.searchArticles(client, query, {
            topK: articleIds.length + 5,
            similarityThreshold: 0,
          });
          for (const match of result.results) {
            if (match.articleId !== article.id && idSet.has(match.articleId)) {
              semanticSimilarity.push({
                from: article.id,
                to: match.articleId,
                similarity: Number(match.similarity.toFixed(4)),
              });
            }
          }
        }

        return jsonResult({ articles, semanticSimilarity });
      })
  );
}
