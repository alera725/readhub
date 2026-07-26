"use client";

import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  liked: boolean;
  likesCount: number;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

function LikeButton({
  liked,
  likesCount,
  onToggle,
  disabled,
  className,
}: LikeButtonProps) {
  return (
    <Button
      type="button"
      variant={liked ? "secondary" : "outline"}
      size="sm"
      aria-pressed={liked}
      disabled={disabled}
      onClick={onToggle}
      className={cn("gap-1.5", className)}
    >
      <Heart
        className={cn("size-4", liked && "fill-primary text-primary")}
        aria-hidden="true"
      />
      {likesCount}
      <span className="sr-only">Me gusta</span>
    </Button>
  );
}

export { LikeButton };
