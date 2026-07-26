import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { userText, articleBlock } from "./_shared.js";

// Skill (Prompt MCP): resumir un artículo de ReadHub.
export function registerSummarizeArticle(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerPrompt(
    "summarize_article",
    {
      title: "Resumir artículo",
      description:
        "Instrucción para resumir de forma concisa y fiel un artículo de ReadHub, identificado por su UUID.",
      argsSchema: {
        articleId: z.string().describe("UUID del artículo a resumir."),
      },
    },
    async ({ articleId }) =>
      userText(
        "Resume de forma concisa y fiel el siguiente artículo de ReadHub. " +
          "No agregues información que no esté en el texto; si el contenido es " +
          "insuficiente, indícalo.\n\n" +
          (await articleBlock(services, articleId))
      )
  );
}
