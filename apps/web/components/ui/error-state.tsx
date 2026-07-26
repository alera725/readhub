import { AlertCircle, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({
  icon: Icon = AlertCircle,
  title = "Ocurrió un error",
  description = "No pudimos completar la operación. Intenta nuevamente.",
  retryLabel = "Reintentar",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center",
        className
      )}
    >
      <Icon className="size-8 text-destructive" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-heading text-base font-medium text-foreground">
          {title}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export { ErrorState };
