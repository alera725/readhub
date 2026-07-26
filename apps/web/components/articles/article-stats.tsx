import { Eye, Heart, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface ArticleStatsProps {
  viewsCount: number;
  likesCount: number;
  commentsCount?: number;
  className?: string;
}

function ArticleStats({
  viewsCount,
  likesCount,
  commentsCount,
  className,
}: ArticleStatsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-xs text-muted-foreground",
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        <Eye className="size-3.5" aria-hidden="true" />
        {viewsCount}
      </span>
      <span className="inline-flex items-center gap-1">
        <Heart className="size-3.5" aria-hidden="true" />
        {likesCount}
      </span>
      {typeof commentsCount === "number" ? (
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="size-3.5" aria-hidden="true" />
          {commentsCount}
        </span>
      ) : null}
    </div>
  );
}

export { ArticleStats };
