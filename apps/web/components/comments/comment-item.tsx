import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDateTime, getInitials } from "@/lib/utils";

interface CommentItemProps {
  authorName: string;
  createdAt: string | Date;
  content: string;
  className?: string;
}

function CommentItem({
  authorName,
  createdAt,
  content,
  className,
}: CommentItemProps) {
  return (
    <div className={cn("flex gap-3", className)}>
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">
            {authorName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(createdAt)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{content}</p>
      </div>
    </div>
  );
}

export { CommentItem };
