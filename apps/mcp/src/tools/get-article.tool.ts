import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { jsonResult, textResult, runTool } from "./_shared.js";

// Tool: obtener un artículo por su ID.
// Reutiliza database.getArticleById. No duplica lógica.
export function registerGetArticle(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "get_article",
    {
      title: "Obtener artículo por ID",
      description:
        "Devuelve un artículo de ReadHub por su identificador (UUID): título, resumen, autor, rutas de documento/portada y visibilidad.",
      inputSchema: {
        id: z.string().uuid().describe("UUID del artículo."),
      },
    },
    async ({ id }) =>
      runTool(async () => {
        const article = await services.database.getArticleById(
          services.getSupabase(),
          id
        );
        return article
          ? jsonResult(article)
          : textResult(`No se encontró ningún artículo con el ID ${id}.`);
      })
  );
}
