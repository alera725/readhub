"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@readhub/database";
import {
  getArticleStats,
  getOwnLike,
  likeArticle,
  unlikeArticle,
} from "@readhub/database";

interface UseLikesResult {
  liked: boolean;
  likesCount: number;
  loading: boolean;
  isToggling: boolean;
  error: string | null;
  toggleLike: () => Promise<void>;
}

// Flujo 8: like/unlike de un artículo, sin permitir múltiples "me gusta"
// del mismo usuario (la propia tabla lo garantiza con UNIQUE(article_id,
// user_id); este hook además evita doble envío mientras hay un toggle en
// curso y revierte la actualización optimista si la operación falla).
export function useLikes(articleId: string | undefined): UseLikesResult {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
        const currentUser = await getCurrentUser(supabase);
        if (!isMounted) return;
        setUserId(currentUser?.id ?? null);

        const [ownLike, stats] = await Promise.all([
          currentUser
            ? getOwnLike(supabase, id, currentUser.id)
            : Promise.resolve(false),
          getArticleStats(supabase, id),
        ]);

        if (!isMounted) return;
        setLiked(ownLike);
        setLikesCount(stats.likesCount);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el estado de me gusta."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load(articleId);

    return () => {
      isMounted = false;
    };
  }, [articleId]);

  const toggleLike = useCallback(async () => {
    if (!articleId || !userId || isToggling) return;

    setError(null);
    setIsToggling(true);

    const wasLiked = liked;

    // Actualización optimista: refleja el cambio de inmediato, se revierte
    // en el catch si la operación contra Supabase falla.
    setLiked(!wasLiked);
    setLikesCount((count) => (wasLiked ? count - 1 : count + 1));

    try {
      const supabase = createClient();
      if (wasLiked) {
        await unlikeArticle(supabase, articleId, userId);
      } else {
        await likeArticle(supabase, articleId, userId);
      }
    } catch (err) {
      setLiked(wasLiked);
      setLikesCount((count) => (wasLiked ? count + 1 : count - 1));
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar el me gusta."
      );
    } finally {
      setIsToggling(false);
    }
  }, [articleId, userId, liked, isToggling]);

  return { liked, likesCount, loading, isToggling, error, toggleLike };
}
