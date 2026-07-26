import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@readhub/database";
import { ask, type ChatOptions } from "@readhub/rag";
import { rateLimit } from "@readhub/shared";

// Transporte del asistente (RAG, fase 9). Es la ÚNICA pieza servidor que la UI
// necesita para consumir el servicio conversacional: NO contiene lógica de
// negocio, solo autentica al usuario y delega en chatService.ask().
//
// Streaming: ask() computa la respuesta completa (servicio no-streaming, fase
// 8, que esta fase no debe modificar). Aquí se transmite de forma PROGRESIVA
// palabra a palabra vía NDJSON, para el renderizado fluido en el cliente. El
// streaming token-a-token del LLM es una mejora futura que exigiría tocar el
// proveedor/servicio (documentada, fuera del alcance de esta fase).
//
// runtime nodejs: ask() usa embedding.service (node:crypto) y secretos de
// servidor; no puede correr en el Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  query?: string;
  options?: ChatOptions;
}

const CHUNK_DELAY_MS = 18; // pausa breve para un revelado fluido

// Límite por usuario: acota el gasto en OpenAI/HF ante abuso.
const CHAT_RATE_LIMIT = 10;
const CHAT_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  // Rate limiting por usuario (ver lib/rate-limit).
  const limit = rateLimit(`chat:${user.id}`, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS);
  if (!limit.success) {
    return Response.json(
      {
        error: `Demasiadas consultas seguidas. Esperá ${limit.retryAfterSeconds}s e intentá de nuevo.`,
      },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return Response.json({ error: "La consulta está vacía." }, { status: 400 });
  }

  // Delegación pura al servicio conversacional.
  let result;
  try {
    result = await ask(supabase, query, body.options ?? {});
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar la respuesta.";
    console.error(`[api/chat] fallo respondiendo: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }

  // Respuesta ya computada → se transmite progresivamente (NDJSON, una línea
  // JSON por evento): varios {type:"chunk"} y un {type:"done"} con las fuentes.
  const encoder = new TextEncoder();
  const words = result.answer.match(/\S+\s*/g) ?? [];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));

      for (const word of words) {
        send({ type: "chunk", value: word });
        if (CHUNK_DELAY_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
        }
      }

      send({
        type: "done",
        hasContext: result.hasContext,
        sources: result.sources,
        metadata: result.metadata,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}
