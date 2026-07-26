import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { jsonResult, runTool } from "./_shared.js";

// Tool: responder una consulta con el pipeline RAG de ReadHub.
// Reutiliza rag.ask (embedding → búsqueda semántica → contexto → LLM →
// respuesta fundamentada + fuentes). No duplica lógica: todo el RAG vive en
// @readhub/rag. Si no hay contexto suficiente, el servicio responde que no
// encontró información en lugar de inventar.
export function registerAskReadHub(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "ask_readhub",
    {
      title: "Preguntar a ReadHub (RAG)",
      description:
        "Responde una pregunta en lenguaje natural usando ÚNICAMENTE el conocimiento publicado en ReadHub (pipeline RAG). Devuelve la respuesta fundamentada y las fuentes utilizadas.",
      inputSchema: {
        query: z.string().min(1).describe("Pregunta en lenguaje natural."),
        topK: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe("Documentos a recuperar para el contexto (por defecto 5)."),
      },
    },
    async ({ query, topK }) =>
      runTool(async () => {
        const result = await services.rag.ask(services.getSupabase(), query, {
          topK,
        });
        return jsonResult(result);
      })
  );
}
