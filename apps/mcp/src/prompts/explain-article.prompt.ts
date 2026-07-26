import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { userText, articleBlock } from "./_shared.js";

// Skill (Prompt MCP): explicar un artículo de ReadHub a una audiencia no experta.
export function registerExplainArticle(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerPrompt(
    "explain_article",
    {
      title: "Explicar artículo",
      description:
        "Instrucción para explicar de forma clara y accesible un artículo de ReadHub, identificado por su UUID.",
      argsSchema: {
        articleId: z.string().describe("UUID del artículo a explicar."),
      },
    },
    async ({ articleId }) =>
      userText(
        "Explica de forma clara y accesible el siguiente artículo de ReadHub a " +
          "una persona no experta en el tema. Define los términos técnicos y usa " +
          "ejemplos simples cuando ayuden. Básate únicamente en el contenido dado.\n\n" +
          (await articleBlock(services, articleId))
      )
  );
}
