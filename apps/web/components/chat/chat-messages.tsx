"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

import { ChatMessage } from "@/components/chat/chat-message";
import type { ChatMessage as ChatMessageData } from "@/hooks/useChat";

interface ChatMessagesProps {
  messages: ChatMessageData[];
}

const SUGGESTIONS = [
  "¿Qué artículos hay sobre PostgreSQL?",
  "Explícame qué es Row Level Security",
  "¿De qué trata el contenido sobre Next.js?",
];

// Área de mensajes con desplazamiento automático al mensaje más reciente.
export function ChatMessages({ messages }: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-heading text-base font-medium text-foreground">
            Pregúntale al asistente de ReadHub
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Responde usando únicamente el conocimiento publicado en la plataforma,
            y te muestra las fuentes.
          </p>
        </div>
        <ul className="mt-1 flex flex-wrap justify-center gap-1.5">
          {SUGGESTIONS.map((s) => (
            <li
              key={s}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
            >
              {s}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
