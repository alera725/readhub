import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadHubServices } from "../context.js";

import { registerInfoResource } from "./info.resource.js";
import { registerArticleResources } from "./articles.resource.js";
import { registerAuthorResources } from "./authors.resource.js";
import { registerCategoriesResource } from "./categories.resource.js";
import { registerStatsResource } from "./stats.resource.js";

// Registro central de los Resources del servidor MCP de ReadHub.
//
// Cada grupo vive en su propio archivo y reutiliza los servicios compartidos
// del monorepo (`services`), sin duplicar consultas ni lógica. Extensible: para
// sumar un Resource, crear su archivo `*.resource.ts` y añadir su `register…`.
export function registerResources(
  server: McpServer,
  services: ReadHubServices
): void {
  registerInfoResource(server, services);
  registerArticleResources(server, services);
  registerAuthorResources(server, services);
  registerCategoriesResource(server, services);
  registerStatsResource(server, services);
}
