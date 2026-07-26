import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../../context.js";
import { jsonResult, runTool } from "../_shared.js";

// Tool de análisis: detectar similitudes y diferencias sobre un tema.
// Reutiliza rag.ask (RAG completo): recupera los artículos relevantes al tema y
// genera el análisis fundamentado + fuentes. No duplica lógica del LLM: `ask`
// es el único punto de entrada de generación.
export function registerDetectSimilaritiesDifferences(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "detect_similarities_and_differences",
    {
      title: "Detectar similitudes y diferencias",
      description:
        "Sobre un tema, recupera los artículos relevantes de ReadHub y analiza en qué se parecen y en qué se diferencian (enfoque, alcance, conclusiones), fundamentado y con fuentes.",
      inputSchema: {
        topic: z.string().min(1).describe("Tema a analizar."),
        topK: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe("Documentos a considerar (por defecto 6)."),
      },
    },
    async ({ topic, topK }) =>
      runTool(async () => {
        const prompt =
          `Analiza los artículos de ReadHub relacionados con "${topic}" y explica ` +
          "en qué se PARECEN y en qué se DIFERENCIAN (enfoque, alcance, método y " +
          "conclusiones). Usa únicamente el conocimiento de ReadHub.";
        const result = await services.rag.ask(services.getSupabase(), prompt, {
          topK: topK ?? 6,
        });
        return jsonResult(result);
      })
  );
}
