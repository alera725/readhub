import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ArticleCardSkeletonProps {
  className?: string;
}

function ArticleCardSkeleton({ className }: ArticleCardSkeletonProps) {
  return (
    <Card className={cn("h-full py-0", className)}>
      <Skeleton className="aspect-video w-full rounded-none rounded-t-xl" />
      <CardContent className="flex flex-col gap-2 pt-4">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3 bg-transparent">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-16" />
      </CardFooter>
    </Card>
  );
}

export { ArticleCardSkeleton };
