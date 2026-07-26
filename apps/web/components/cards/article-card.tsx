import Link from "next/link";

import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { ArticleMeta } from "@/components/articles/article-meta";
import { ArticleStats } from "@/components/articles/article-stats";
import { cn } from "@/lib/utils";

interface ArticleCardProps {
  href: string;
  title: string;
  summary?: string | null;
  coverImageUrl?: string | null;
  authorName: string;
  publishedAt: string | Date;
  viewsCount: number;
  likesCount: number;
  className?: string;
}

function ArticleCard({
  href,
  title,
  summary,
  coverImageUrl,
  authorName,
  publishedAt,
  viewsCount,
  likesCount,
  className,
}: ArticleCardProps) {
  return (
    <Link href={href} className="group/article-link block">
      <Card
        className={cn(
          "h-full py-0 transition-shadow group-hover/article-link:shadow-md",
          className
        )}
      >
        <div className="aspect-video w-full overflow-hidden bg-muted">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage, dominio aún no configurado en next.config
            <img
              src={coverImageUrl}
              alt={title}
              loading="lazy"
              className="size-full object-cover transition-transform group-hover/article-link:scale-[1.02]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <span className="font-heading text-sm">ReadHub</span>
            </div>
          )}
        </div>

        <CardContent className="flex flex-col gap-2 pt-4">
          <CardTitle className="line-clamp-2 text-lg">{title}</CardTitle>
          {summary ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {summary}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3 bg-transparent">
          <ArticleMeta authorName={authorName} publishedAt={publishedAt} />
          <ArticleStats viewsCount={viewsCount} likesCount={likesCount} />
        </CardFooter>
      </Card>
    </Link>
  );
}

export { ArticleCard };
