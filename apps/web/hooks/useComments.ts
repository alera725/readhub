"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@readhub/database";
import {
  createComment,
  getArticleComments,
  type ArticleComment,
} from "@readhub/database";

interface UseCommentsResult {
  comments: ArticleComment[];
  loading: boolean;
  isSubmitting: boolean;
  error: string | null;
  addComment: (content: string) => Promise<void>;
}

// Flujo 7: listar y publicar comentarios sin recargar la página.
export function useComments(articleId: string | undefined): UseCommentsResult {
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    getArticleComments(supabase, articleId)
      .then((data) => {
        if (isMounted) setComments(data);
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los comentarios."
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [articleId]);

  const addComment = useCallback(
    async (content: string) => {
      if (!articleId) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const supabase = createClient();
        const currentUser = await getCurrentUser(supabase);
        if (!currentUser) {
          throw new Error("Debes iniciar sesión para comentar.");
        }

        await createComment(supabase, {
          article_id: articleId,
          user_id: currentUser.id,
          comment: content,
        });

        // El insert no devuelve el email del autor resuelto; se refresca
        // el hilo completo para reflejar el nuevo comentario ya enriquecido,
        // sin recargar la página.
        const updated = await getArticleComments(supabase, articleId);
        setComments(updated);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo publicar el comentario."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [articleId]
  );

  return { comments, loading, isSubmitting, error, addComment };
}
