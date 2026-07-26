import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { userText, articleBlock } from "./_shared.js";

// Skill (Prompt MCP): generar preguntas de comprensión sobre un artículo.
export function registerGenerateQuestions(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerPrompt(
    "generate_questions",
    {
      title: "Generar preguntas",
      description:
        "Instrucción para generar preguntas de comprensión sobre un artículo de ReadHub, identificado por su UUID.",
      argsSchema: {
        articleId: z.string().describe("UUID del artículo."),
      },
    },
    async ({ articleId }) =>
      userText(
        "Genera entre 5 y 8 preguntas de comprensión sobre el siguiente artículo " +
          "de ReadHub, ordenadas de lo más básico a lo más profundo. Las preguntas " +
          "deben poder responderse con el contenido del artículo.\n\n" +
          (await articleBlock(services, articleId))
      )
  );
}
