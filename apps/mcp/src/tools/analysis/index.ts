import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadHubServices } from "../../context.js";

import { registerCompareMultipleArticles } from "./compare-articles.tool.js";
import { registerDetectSimilaritiesDifferences } from "./detect-similarities.tool.js";
import { registerExtractMainThemes } from "./extract-themes.tool.js";
import { registerGenerateGlobalSummary } from "./global-summary.tool.js";
import { registerMapArticleRelationships } from "./map-relationships.tool.js";
import { registerBuildResearchContext } from "./research-context.tool.js";

// Registro de las Tools de ANÁLISIS AVANZADO del servidor MCP de ReadHub.
//
// Todas reutilizan la infraestructura existente sin duplicar lógica:
//   - Deterministas (recuperación/contexto): compare_multiple_articles,
//     map_article_relationships, build_research_context (rag.searchArticles /
//     rag.buildContext / database).
//   - Generativas (RAG completo): detect_similarities_and_differences,
//     extract_main_themes, generate_global_summary (rag.ask).
export function registerAnalysisTools(
  server: McpServer,
  services: ReadHubServices
): void {
  registerCompareMultipleArticles(server, services);
  registerDetectSimilaritiesDifferences(server, services);
  registerExtractMainThemes(server, services);
  registerGenerateGlobalSummary(server, services);
  registerMapArticleRelationships(server, services);
  registerBuildResearchContext(server, services);
}
