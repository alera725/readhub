import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadHubServices } from "../context.js";
import { jsonContents } from "./_shared.js";

// Resources de autores. ReadHub no tiene un servicio dedicado de autores, así
// que se DERIVAN de la única consulta existente (getPublicArticles), que ya
// resuelve author_id/author_email por artículo. No se duplica ninguna consulta
// ni lógica: solo se agrupa en memoria para presentación.
export function registerAuthorResources(
  server: McpServer,
  services: ReadHubServices
): void {
  // Colección: autores con artículos públicos.
  server.registerResource(
    "readhub-authors",
    "readhub://authors",
    {
      title: "Autores",
      description:
        "Autores con artículos públicos en ReadHub, con su cantidad de artículos (derivado del catálogo público).",
      mimeType: "application/json",
    },
    async (uri) => {
      const articles = await services.database.getPublicArticles(
        services.getSupabase()
      );
      const byAuthor = new Map<
        string,
        { authorId: string; email: string | null; articleCount: number }
      >();
      for (const article of articles) {
        const current = byAuthor.get(article.author_id) ?? {
          authorId: article.author_id,
          email: article.author_email,
          articleCount: 0,
        };
        current.articleCount += 1;
        byAuthor.set(article.author_id, current);
      }
      const authors = [...byAuthor.values()];
      return jsonContents(uri, { count: authors.length, authors });
    }
  );

  // Individual: artículos públicos de un autor.
  server.registerResource(
    "readhub-author",
    new ResourceTemplate("readhub://authors/{id}", { list: undefined }),
    {
      title: "Autor por ID",
      description: "Artículos públicos de un autor, identificado por su UUID.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const id = String(variables.id);
      const articles = await services.database.getPublicArticles(
        services.getSupabase()
      );
      const own = articles.filter((article) => article.author_id === id);
      return jsonContents(uri, {
        authorId: id,
        email: own[0]?.author_email ?? null,
        articleCount: own.length,
        articles: own,
      });
    }
  );
}
