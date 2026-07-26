"use client";

import { Newspaper } from "lucide-react";

import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/cards/article-card-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useArticles } from "@/hooks/useArticles";

export default function HomePage() {
  const { articles, loading, error, refresh } = useArticles();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <ArticleCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudieron cargar los artículos"
        description={error}
        onRetry={refresh}
      />
    );
  }

  if (articles.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title="Todavía no hay artículos publicados"
        description="Cuando se publique el primer artículo, va a aparecer acá."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">Artículos</h1>
        <p className="text-muted-foreground">
          Lo último publicado por la comunidad de ReadHub.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            href={`/article/${article.id}`}
            title={article.title}
            summary={article.summary}
            coverImageUrl={article.imageUrl}
            authorName={article.author_email ?? "Autor desconocido"}
            publishedAt={article.created_at}
            viewsCount={article.views_count}
            likesCount={article.likes_count}
          />
        ))}
      </div>
    </div>
  );
}
