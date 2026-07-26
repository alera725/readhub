"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

interface ChatInputProps {
  onSend: (query: string) => void;
  disabled?: boolean;
}

// Campo de consulta: envío con botón y con Enter (Shift+Enter = salto de línea).
export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-border bg-background/95 p-3 backdrop-blur"
    >
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe tu pregunta…"
        rows={1}
        aria-label="Escribe tu pregunta"
        className="max-h-40 min-h-10 flex-1 resize-none"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || value.trim().length === 0}
        aria-label="Enviar pregunta"
      >
        {disabled ? <Spinner /> : <SendHorizontal className="size-4" />}
      </Button>
    </form>
  );
}
