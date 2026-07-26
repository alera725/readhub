"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface CommentFormProps {
  onSubmit: (content: string) => void | Promise<void>;
  isSubmitting?: boolean;
  placeholder?: string;
  className?: string;
}

function CommentForm({
  onSubmit,
  isSubmitting = false,
  placeholder = "Escribe un comentario...",
  className,
}: CommentFormProps) {
  const [value, setValue] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    await onSubmit(trimmed);
    setValue("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-3", className)}
    >
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        disabled={isSubmitting}
        rows={3}
        aria-label="Nuevo comentario"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || value.trim().length === 0}
          className="gap-1.5"
        >
          {isSubmitting ? <Spinner /> : null}
          Comentar
        </Button>
      </div>
    </form>
  );
}

export { CommentForm };
