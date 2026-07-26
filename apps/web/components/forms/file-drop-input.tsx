"use client";

import { useId, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileDropInputProps {
  label: string;
  accept?: string;
  hint?: string;
  file?: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileDropInput({
  label,
  accept,
  hint,
  file,
  onFileSelect,
  disabled,
  error,
  className,
}: FileDropInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    const nextFile = fileList?.[0] ?? null;
    onFileSelect(nextFile);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input px-4 py-8 text-center transition-colors",
          isDragging && "border-ring bg-accent",
          disabled && "cursor-not-allowed opacity-50",
          error && "border-destructive"
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />

        {file ? (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="size-4 shrink-0" aria-hidden="true" />
            <span className="max-w-56 truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              ({formatFileSize(file.size)})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Quitar archivo"
              onClick={(event) => {
                event.stopPropagation();
                onFileSelect(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <UploadCloud
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Arrastra un archivo o{" "}
              <span className="text-primary underline underline-offset-4">
                selecciona uno
              </span>
            </p>
          </>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export { FileDropInput };
