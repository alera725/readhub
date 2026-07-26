import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../../context.js";
import { jsonResult, runTool } from "../_shared.js";

// Tool de análisis: extraer los temas principales.
// Reutiliza rag.ask (RAG completo). No duplica lógica de generación.
export function registerExtractMainThemes(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "extract_main_themes",
    {
      title: "Extraer temas principales",
      description:
        "Identifica y enumera los temas principales tratados en ReadHub (opcionalmente acotado a un tema), con una descripción breve de cada uno, fundamentado y con fuentes.",
      inputSchema: {
        topic: z
          .string()
          .optional()
          .describe("Tema para acotar el análisis (opcional)."),
        topK: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe("Documentos a considerar (por defecto 8)."),
      },
    },
    async ({ topic, topK }) =>
      runTool(async () => {
        const scope = topic ? ` sobre "${topic}"` : "";
        const prompt =
          `Identifica y enumera los temas principales tratados en ReadHub${scope}. ` +
          "Para cada tema, incluye una frase de descripción. Básate únicamente en " +
          "el contenido de ReadHub.";
        const result = await services.rag.ask(services.getSupabase(), prompt, {
          topK: topK ?? 8,
        });
        return jsonResult(result);
      })
  );
}
