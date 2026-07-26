import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { jsonResult, runTool } from "./_shared.js";

// Tool: búsqueda semántica de artículos.
// Reutiliza rag.searchArticles (embedding de la consulta + match_articles sobre
// pgvector). No duplica lógica: la generación del embedding y la búsqueda viven
// en el paquete @readhub/rag.
export function registerSemanticSearch(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "semantic_search_articles",
    {
      title: "Buscar artículos (búsqueda semántica)",
      description:
        "Busca los artículos de ReadHub más relevantes para una consulta en lenguaje natural, por similitud de significado (embeddings + pgvector). Devuelve el Top-K con su puntuación de similitud.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Consulta en lenguaje natural."),
        topK: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe("Cantidad máxima de resultados (por defecto 5)."),
        similarityThreshold: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Umbral mínimo de similitud (0–1)."),
      },
    },
    async ({ query, topK, similarityThreshold }) =>
      runTool(async () => {
        const result = await services.rag.searchArticles(
          services.getSupabase(),
          query,
          { topK, similarityThreshold }
        );
        return jsonResult(result);
      })
  );
}
