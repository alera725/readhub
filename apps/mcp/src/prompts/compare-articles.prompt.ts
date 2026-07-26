import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { articleQueryText } from "../lib/article-query.js";
import { userText, articleBlock } from "./_shared.js";

// Skill (Prompt MCP): comparar dos artículos de ReadHub.
//
// Reutiliza el sistema RAG "cuando es necesario": si no se indica el segundo
// artículo, se elige automáticamente el más similar mediante búsqueda semántica
// (rag.searchArticles). No duplica lógica de las Tools: solo construye la
// instrucción reutilizando los servicios compartidos.
export function registerCompareArticles(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerPrompt(
    "compare_articles",
    {
      title: "Comparar artículos",
      description:
        "Instrucción para comparar dos artículos de ReadHub. Si solo se da uno, el segundo se elige por similitud semántica (RAG).",
      argsSchema: {
        articleId: z.string().describe("UUID del primer artículo."),
        compareWithId: z
          .string()
          .optional()
          .describe(
            "UUID del segundo artículo (opcional). Si se omite, se elige el más similar."
          ),
      },
    },
    async ({ articleId, compareWithId }) => {
      const blockA = await articleBlock(services, articleId);

      let blockB: string;
      let note = "";

      if (compareWithId) {
        blockB = await articleBlock(services, compareWithId);
      } else {
        // RAG: buscar el artículo más similar al primero para compararlo.
        const source = await services.database.getArticleById(
          services.getSupabase(),
          articleId
        );
        const query = source ? articleQueryText(source) : articleId;
        const search = await services.rag.searchArticles(
          services.getSupabase(),
          query,
          { topK: 3 }
        );
        const other = search.results.find((r) => r.articleId !== articleId);
        if (other) {
          blockB = await articleBlock(services, other.articleId);
          note = ` (El segundo artículo se eligió automáticamente por similitud semántica: ${Math.round(
            other.similarity * 100
          )}%.)`;
        } else {
          blockB = "«No se encontró un artículo similar para comparar.»";
        }
      }

      return userText(
        "Compara los dos artículos de ReadHub siguientes en enfoque, alcance, " +
          "método y conclusiones. Señala coincidencias, diferencias y qué aporta " +
          "cada uno." +
          note +
          "\n\n== Artículo A ==\n" +
          blockA +
          "\n\n== Artículo B ==\n" +
          blockB
      );
    }
  );
}
