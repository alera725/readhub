import { CommentItem } from "@/components/comments/comment-item";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentListItem {
  id: string;
  authorName: string;
  createdAt: string | Date;
  content: string;
}

interface CommentListProps {
  comments: CommentListItem[];
  emptyMessage?: string;
  className?: string;
}

function CommentList({
  comments,
  emptyMessage = "Sé el primero en comentar este artículo.",
  className,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Todavía no hay comentarios"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          authorName={comment.authorName}
          createdAt={comment.createdAt}
          content={comment.content}
        />
      ))}
    </div>
  );
}

export { CommentList };
export type { CommentListItem };
