"use client";

import { RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { useChat } from "@/hooks/useChat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";

// Ventana principal del chat. Orquesta presentación + estado del hook; sin
// lógica de negocio (toda la comunicación pasa por useChat → /api/chat).
export function ChatWindow({ className }: { className?: string }) {
  const { messages, isLoading, error, sendMessage, reset } = useChat();

  return (
    <div
      className={cn(
        "flex h-[calc(100svh-8rem)] min-h-96 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex flex-col">
          <span className="font-heading text-sm font-semibold">Asistente</span>
          <span className="text-xs text-muted-foreground">
            Responde con el conocimiento de ReadHub
          </span>
        </div>
        {messages.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={reset}
            disabled={isLoading}
          >
            <RotateCcw className="size-4" />
            Nueva conversación
          </Button>
        ) : null}
      </div>

      <ChatMessages messages={messages} />

      {error ? (
        <Alert variant="destructive" className="mx-3 mb-2 w-auto">
          <AlertTitle>No se pudo responder</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
