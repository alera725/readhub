import { ArticleMeta } from "@/components/articles/article-meta";
import { ArticleStats } from "@/components/articles/article-stats";
import { cn } from "@/lib/utils";

interface ArticleContentProps {
  title: string;
  summary?: string | null;
  coverImageUrl?: string | null;
  authorName: string;
  publishedAt: string | Date;
  viewsCount: number;
  likesCount: number;
  commentsCount?: number;
  children?: React.ReactNode;
  className?: string;
}

function ArticleContent({
  title,
  summary,
  coverImageUrl,
  authorName,
  publishedAt,
  viewsCount,
  likesCount,
  commentsCount,
  children,
  className,
}: ArticleContentProps) {
  return (
    <article className={cn("mx-auto flex w-full max-w-2xl flex-col gap-6", className)}>
      <header className="flex flex-col gap-4">
        <h1>{title}</h1>
        {summary ? (
          <p className="text-lg leading-relaxed text-muted-foreground">
            {summary}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <ArticleMeta authorName={authorName} publishedAt={publishedAt} />
          <ArticleStats
            viewsCount={viewsCount}
            likesCount={likesCount}
            commentsCount={commentsCount}
          />
        </div>
      </header>

      {coverImageUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage, dominio aún no configurado en next.config */}
          <img
            src={coverImageUrl}
            alt={title}
            loading="lazy"
            className="size-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 text-base leading-relaxed text-foreground">
        {children}
      </div>
    </article>
  );
}

export { ArticleContent };
