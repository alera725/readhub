import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { jsonContents } from "./_shared.js";

// Resource: estadísticas agregadas del catálogo público.
// Se DERIVAN de la única consulta existente (getPublicArticles), que ya trae
// likes_count/views_count por artículo. No se duplica ninguna consulta ni
// lógica: solo se agregan en memoria.
export function registerStatsResource(
  server: McpServer,
  services: ReadHubServices
): void {
  server.registerResource(
    "readhub-stats",
    "readhub://stats",
    {
      title: "Estadísticas de ReadHub",
      description:
        "Métricas agregadas del catálogo público: cantidad de artículos, autores, likes y views.",
      mimeType: "application/json",
    },
    async (uri) => {
      const articles = await services.database.getPublicArticles(
        services.getSupabase()
      );
      const totalLikes = articles.reduce(
        (sum, article) => sum + (article.likes_count ?? 0),
        0
      );
      const totalViews = articles.reduce(
        (sum, article) => sum + (article.views_count ?? 0),
        0
      );
      const totalAuthors = new Set(articles.map((article) => article.author_id))
        .size;
      return jsonContents(uri, {
        totalPublicArticles: articles.length,
        totalAuthors,
        totalLikes,
        totalViews,
      });
    }
  );
}
