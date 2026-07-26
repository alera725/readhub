"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  documentUrl: string;
  className?: string;
}

function getExtension(url: string): string {
  const withoutQuery = url.split("?")[0];
  const parts = withoutQuery.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

// El navegador no puede renderizar DOCX de forma nativa (a diferencia de
// TXT/PDF) y no se agregó ninguna librería de conversión para no sumar una
// dependencia nueva solo para este caso — se ofrece abrir/descargar en su
// lugar, igual de válido como "mostrar el documento".
function UnsupportedFormatViewer({ documentUrl }: { documentUrl: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
      <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Este formato de documento no se puede previsualizar en el navegador.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        nativeButton={false}
        render={
          <a href={documentUrl} target="_blank" rel="noopener noreferrer" />
        }
      >
        <ExternalLink className="size-4" />
        Abrir documento
      </Button>
    </div>
  );
}

function PlainTextViewer({ documentUrl }: { documentUrl: string }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setText(null);
    setFailed(false);

    fetch(documentUrl)
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo obtener el documento.");
        return response.text();
      })
      .then((content) => {
        if (isMounted) setText(content);
      })
      .catch(() => {
        if (isMounted) setFailed(true);
      });

    return () => {
      isMounted = false;
    };
  }, [documentUrl]);

  if (failed) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar el contenido del documento.
      </p>
    );
  }

  if (text === null) {
    return <LoadingState message="Cargando documento..." />;
  }

  return (
    <pre className="whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
      {text}
    </pre>
  );
}

function DocumentViewer({ documentUrl, className }: DocumentViewerProps) {
  const extension = getExtension(documentUrl);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {extension === "pdf" ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <iframe
            src={documentUrl}
            title="Documento del artículo"
            className="h-[75vh] w-full"
          />
        </div>
      ) : extension === "txt" ? (
        <PlainTextViewer documentUrl={documentUrl} />
      ) : (
        <UnsupportedFormatViewer documentUrl={documentUrl} />
      )}
    </div>
  );
}

export { DocumentViewer };
