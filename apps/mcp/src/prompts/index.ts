import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadHubServices } from "../context.js";

import { registerSummarizeArticle } from "./summarize-article.prompt.js";
import { registerExplainArticle } from "./explain-article.prompt.js";
import { registerCompareArticles } from "./compare-articles.prompt.js";
import { registerGenerateQuestions } from "./generate-questions.prompt.js";
import { registerExtractKeyConcepts } from "./extract-key-concepts.prompt.js";

// Registro central de los Prompts/Skills del servidor MCP de ReadHub.
//
// Cada Skill vive en su propio archivo y reutiliza los servicios compartidos del
// monorepo (`services`), sin duplicar la lógica de las Tools. Extensible: para
// sumar una Skill, crear su archivo `*.prompt.ts` y añadir su `register…`.
export function registerPrompts(
  server: McpServer,
  services: ReadHubServices
): void {
  registerSummarizeArticle(server, services);
  registerExplainArticle(server, services);
  registerCompareArticles(server, services);
  registerGenerateQuestions(server, services);
  registerExtractKeyConcepts(server, services);
}
