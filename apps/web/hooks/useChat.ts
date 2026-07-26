"use client";

import { useCallback, useRef, useState } from "react";

// Hook del asistente (RAG, fase 9). Solo TRANSPORTE + estado de la conversación:
// habla con el endpoint /api/chat (que delega en chat.service) y mantiene el
// historial en memoria durante la sesión. No contiene lógica de negocio ni
// llama a Supabase/LLM directamente.
//
// Evolución a historial persistente: el historial vive en `messages` (useState).
// Persistirlo (localStorage o una tabla) solo implica reemplazar este estado por
// un store con la misma forma — los componentes no cambian.

export interface ChatSourceView {
  rank: number;
  articleId: string;
  title: string;
  similarity: number;
}

export type ChatMessageStatus = "streaming" | "done" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSourceView[];
  hasContext?: boolean;
  status?: ChatMessageStatus;
}

interface UseChatResult {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (query: string) => Promise<void>;
  reset: () => void;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evita envíos concurrentes mientras hay una respuesta en curso.
  const inFlight = useRef(false);

  const patchMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const sendMessage = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || inFlight.current) return;

      inFlight.current = true;
      setError(null);
      setIsLoading(true);

      const assistantId = newId();
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "", status: "streaming" },
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });

        if (!response.ok || !response.body) {
          const detail = await response
            .json()
            .then((d) => (d as { error?: string }).error)
            .catch(() => null);
          throw new Error(detail ?? "No se pudo obtener la respuesta.");
        }

        // Lectura del stream NDJSON: una línea JSON por evento.
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";

        const handleEvent = (line: string) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          const event = JSON.parse(trimmedLine) as
            | { type: "chunk"; value: string }
            | {
                type: "done";
                hasContext: boolean;
                sources: ChatSourceView[];
              };

          if (event.type === "chunk") {
            answer += event.value;
            patchMessage(assistantId, { content: answer });
          } else if (event.type === "done") {
            patchMessage(assistantId, {
              status: "done",
              sources: event.sources,
              hasContext: event.hasContext,
            });
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let index = buffer.indexOf("\n");
          while (index !== -1) {
            handleEvent(buffer.slice(0, index));
            buffer = buffer.slice(index + 1);
            index = buffer.indexOf("\n");
          }
        }
        if (buffer.trim()) handleEvent(buffer);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo obtener la respuesta.";
        setError(message);
        patchMessage(assistantId, {
          status: "error",
          content:
            "No se pudo obtener la respuesta. Intenta nuevamente en unos segundos.",
        });
      } finally {
        setIsLoading(false);
        inFlight.current = false;
      }
    },
    [patchMessage]
  );

  const reset = useCallback(() => {
    if (inFlight.current) return;
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, reset };
}
