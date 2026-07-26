import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { jsonResult, runTool } from "./_shared.js";

// Tool: listar artículos públicos de ReadHub.
// Reutiliza database.getPublicArticles (RPC get_public_articles): un solo
// round-trip con autor y conteos ya resueltos. No duplica lógica.
export function registerListArticles(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "list_articles",
    {
      title: "Listar artículos",
      description:
        "Lista los artículos públicos publicados en ReadHub (con autor, fecha, likes y views). Útil para explorar el catálogo.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Máximo de artículos a devolver (por defecto, todos)."),
      },
    },
    async ({ limit }) =>
      runTool(async () => {
        const articles = await services.database.getPublicArticles(
          services.getSupabase()
        );
        return jsonResult(
          typeof limit === "number" ? articles.slice(0, limit) : articles
        );
      })
  );
}
