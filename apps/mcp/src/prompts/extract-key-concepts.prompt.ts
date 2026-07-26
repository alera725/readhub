import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { userText, articleBlock } from "./_shared.js";

// Skill (Prompt MCP): extraer los conceptos clave de un artículo.
export function registerExtractKeyConcepts(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerPrompt(
    "extract_key_concepts",
    {
      title: "Extraer conceptos clave",
      description:
        "Instrucción para extraer los conceptos y términos clave de un artículo de ReadHub, identificado por su UUID.",
      argsSchema: {
        articleId: z.string().describe("UUID del artículo."),
      },
    },
    async ({ articleId }) =>
      userText(
        "Extrae los conceptos y términos clave del siguiente artículo de ReadHub. " +
          "Devuélvelos como una lista, cada uno con una definición breve basada en " +
          "el propio texto. No incluyas conceptos que no aparezcan en el artículo.\n\n" +
          (await articleBlock(services, articleId))
      )
  );
}
