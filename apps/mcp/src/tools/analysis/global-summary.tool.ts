import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../../context.js";
import { jsonResult, runTool } from "../_shared.js";

// Tool de análisis: generar un resumen global sobre un tema.
// Reutiliza rag.ask (RAG completo): integra varios artículos en un resumen
// fundamentado + fuentes. No duplica lógica de generación.
export function registerGenerateGlobalSummary(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerTool(
    "generate_global_summary",
    {
      title: "Generar resumen global",
      description:
        "Genera un resumen global del conocimiento disponible en ReadHub sobre un tema, integrando los distintos artículos, fundamentado y con fuentes.",
      inputSchema: {
        topic: z.string().min(1).describe("Tema a resumir globalmente."),
        topK: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe("Documentos a integrar (por defecto 8)."),
      },
    },
    async ({ topic, topK }) =>
      runTool(async () => {
        const prompt =
          `Genera un resumen global del conocimiento disponible en ReadHub sobre ` +
          `"${topic}", integrando los distintos artículos relevantes. Si la ` +
          "cobertura es limitada, indícalo. Usa únicamente el conocimiento de ReadHub.";
        const result = await services.rag.ask(services.getSupabase(), prompt, {
          topK: topK ?? 8,
        });
        return jsonResult(result);
      })
  );
}
