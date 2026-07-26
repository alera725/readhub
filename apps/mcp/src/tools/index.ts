import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadHubServices } from "../context.js";

import { registerListArticles } from "./list-articles.tool.js";
import { registerSearchArticles } from "./search-articles.tool.js";
import { registerGetArticle } from "./get-article.tool.js";
import { registerSemanticSearch } from "./semantic-search.tool.js";
import { registerAskReadHub } from "./ask-readhub.tool.js";
import { registerAnalysisTools } from "./analysis/index.js";

// Registro central de las Tools del servidor MCP de ReadHub.
//
// Cada Tool vive en su propio archivo y reutiliza los servicios compartidos del
// monorepo (`services`), sin duplicar lógica. Extensible: para sumar una Tool,
// crear su archivo `*.tool.ts` y añadir su `register…` a la lista de abajo.
export function registerTools(
  server: McpServer,
  services: ReadHubServices
): void {
  // Tools básicas de consulta.
  registerListArticles(server, services);
  registerSearchArticles(server, services);
  registerGetArticle(server, services);
  registerSemanticSearch(server, services);
  registerAskReadHub(server, services);

  // Tools de análisis avanzado.
  registerAnalysisTools(server, services);
}
