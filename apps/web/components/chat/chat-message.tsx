import { Bot, User as UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ChatSources } from "@/components/chat/chat-sources";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import type { ChatMessage as ChatMessageData } from "@/hooks/useChat";

interface ChatMessageProps {
  message: ChatMessageData;
}

// Burbuja de un mensaje. El usuario a la derecha; el asistente a la izquierda
// con su panel de fuentes. Reutilizable; presentación pura.
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";
  const showTyping = isStreaming && message.content.length === 0;

  return (
    <div
      className={cn(
        "flex w-full gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
        aria-hidden="true"
      >
        {isUser ? <UserIcon className="size-4" /> : <Bot className="size-4" />}
      </span>

      <div className={cn("flex min-w-0 max-w-[85%] flex-col", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "bg-primary text-primary-foreground"
              : isError
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-foreground"
          )}
        >
          {showTyping ? <TypingIndicator /> : message.content}
        </div>

        {!isUser && message.status === "done" && message.sources ? (
          <ChatSources sources={message.sources} className="w-full" />
        ) : null}
      </div>
    </div>
  );
}
