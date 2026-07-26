"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@readhub/database";
import {
  getArticleById,
  getArticleStats,
  getPublicArticles,
  recordArticleView,
  type ArticleStats,
  type PublicArticle,
} from "@readhub/database";
import { getSignedFileUrl } from "@readhub/database";
import type { Tables } from "@readhub/types";

type ArticleRow = Tables<"articles">;
type SupabaseBrowserClient = ReturnType<typeof createClient>;

export interface ArticleListItem extends PublicArticle {
  // image_path es una ruta dentro del bucket privado "media", no una URL
  // navegable — se resuelve acá a una URL firmada para poder usarla en <img>.
  imageUrl: string | null;
}

interface UseArticlesResult {
  articles: ArticleListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

async function resolveFileUrl(
  supabase: SupabaseBrowserClient,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  try {
    return await getSignedFileUrl(supabase, path);
  } catch {
    // Si no se puede firmar el archivo (ausente, permisos, etc.), se
    // muestra igual sin ese recurso en vez de romper toda la pantalla.
    return null;
  }
}

// Listado de la página principal (Flujo 4).
export function useArticles(): UseArticlesResult {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    getPublicArticles(supabase)
      .then(async (data) => {
        const withImages = await Promise.all(
          data.map(async (article) => ({
            ...article,
            imageUrl: await resolveFileUrl(supabase, article.image_path),
          }))
        );
        if (isMounted) setArticles(withImages);
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los artículos."
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return { articles, loading, error, refresh };
}

interface UseArticleResult {
  article: ArticleRow | null;
  stats: ArticleStats | null;
  // image_path/document_path son rutas dentro del bucket privado "media",
  // no URLs navegables — se resuelven acá a URLs firmadas.
  imageUrl: string | null;
  documentUrl: string | null;
  loading: boolean;
  error: string | null;
}

// Vista de un artículo individual (Flujo 5): carga el artículo + stats,
// resuelve las URLs firmadas de portada/documento, y registra
// automáticamente una visualización (best-effort, no bloquea la lectura
// del artículo si falla).
export function useArticle(articleId: string | undefined): UseArticleResult {
  const [article, setArticle] = useState<ArticleRow | null>(null);
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    async function load(id: string) {
      try {
        const [articleData, statsData] = await Promise.all([
          getArticleById(supabase, id),
          getArticleStats(supabase, id),
        ]);

        if (!isMounted) return;
        setArticle(articleData);
        setStats(statsData);

        const [resolvedImageUrl, resolvedDocumentUrl] = await Promise.all([
          resolveFileUrl(supabase, articleData?.image_path ?? null),
          resolveFileUrl(supabase, articleData?.document_path ?? null),
        ]);

        if (!isMounted) return;
        setImageUrl(resolvedImageUrl);
        setDocumentUrl(resolvedDocumentUrl);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el artículo."
          );
        }
        return;
      } finally {
        if (isMounted) setLoading(false);
      }

      try {
        const currentUser = await getCurrentUser(supabase);
        if (currentUser) {
          await recordArticleView(supabase, id, currentUser.id);
        }
      } catch {
        // Silencioso a propósito: registrar la visualización es un efecto
        // secundario best-effort, no debe impedir ver el artículo.
      }
    }

    load(articleId);

    return () => {
      isMounted = false;
    };
  }, [articleId]);

  return { article, stats, imageUrl, documentUrl, loading, error };
}
