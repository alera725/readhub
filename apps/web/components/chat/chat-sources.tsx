import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatSourceView } from "@/hooks/useChat";

interface ChatSourcesProps {
  sources: ChatSourceView[];
  className?: string;
}

// Panel de fuentes usadas como contexto: título, relevancia y enlace directo
// al artículo. Reutilizable; no contiene lógica.
export function ChatSources({ sources, className }: ChatSourcesProps) {
  if (sources.length === 0) return null;

  return (
    <div className={cn("mt-3 flex flex-col gap-1.5", className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="size-3.5" aria-hidden="true" />
        Fuentes ({sources.length})
      </p>
      <ul className="flex flex-col gap-1">
        {sources.map((source) => (
          <li key={source.articleId}>
            <Link
              href={`/article/${source.articleId}`}
              className="group/source flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  [{source.rank}]
                </span>
                <span className="truncate font-medium text-foreground">
                  {source.title}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Badge variant="secondary" className="tabular-nums">
                  {Math.round(source.similarity * 100)}%
                </Badge>
                <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover/source:text-foreground" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
