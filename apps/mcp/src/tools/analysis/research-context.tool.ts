import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../../context.js";
import { jsonResult, runTool } from "../_shared.js";

// Tool de análisis: construir contexto para investigaciones.
// Reutiliza rag.searchArticles (recuperación) + rag.buildContext (ensamblado
// del contexto). Determinista (no llama al LLM): devuelve el contexto ya
// estructurado y sus fuentes, listo para una investigación asistida por LLM.
export function registerBuildResearchContext(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "build_research_context",
    {
      title: "Construir contexto de investigación",
      description:
        "A partir de una consulta de investigación, recupera los artículos más relevantes de ReadHub y ensambla un contexto estructurado (con fuentes) listo para que un LLM lo utilice.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Tema o pregunta de investigación."),
        topK: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe("Documentos a recuperar (por defecto 5)."),
        maxContextChars: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Presupuesto de tamaño del contexto en caracteres."),
      },
    },
    async ({ query, topK, maxContextChars }) =>
      runTool(async () => {
        const client = services.getSupabase();
        const search = await services.rag.searchArticles(client, query, {
          topK,
        });
        const context = services.rag.buildContext(query, search.results, {
          maxContextChars,
        });
        return jsonResult({
          query,
          sources: context.sources,
          usedDocuments: context.usedDocuments,
          contextChars: context.contextChars,
          truncated: context.truncated,
          context: context.contextText,
        });
      })
  );
}
