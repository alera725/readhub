import type { Metadata } from "next";

import { ChatWindow } from "@/components/chat/chat-window";

export const metadata: Metadata = {
  title: "Asistente · ReadHub",
};

// Pantalla del asistente inteligente. Protegida por el layout de (dashboard).
export default function AssistantPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Asistente
        </h1>
        <p className="text-sm text-muted-foreground">
          Preguntá sobre el conocimiento publicado en ReadHub. El asistente
          responde usando solo los artículos de la plataforma y te muestra las
          fuentes.
        </p>
      </div>
      <ChatWindow />
    </div>
  );
}
