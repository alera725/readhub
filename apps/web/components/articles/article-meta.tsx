import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";

interface ArticleMetaProps {
  authorName: string;
  publishedAt: string | Date;
  className?: string;
}

function ArticleMeta({ authorName, publishedAt, className }: ArticleMetaProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Avatar size="sm">
        <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-medium text-foreground">
          {authorName}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(publishedAt)}
        </span>
      </div>
    </div>
  );
}

export { ArticleMeta };
