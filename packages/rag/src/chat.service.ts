import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@readhub/types";
import { getDefaultProvider } from "@readhub/ai";
import type { LlmProvider } from "@readhub/ai";
import {
  buildContext,
  type BuildContextOptions,
} from "./context-builder.service";
import {
  searchArticles,
  type VectorSearchOptions,
} from "./vector-search.service";

// Servicio conversacional (RAG, fase 8).
//
// ÚNICO punto de entrada del asistente inteligente. Solo COORDINA el flujo RAG
// reutilizando los servicios existentes; no contiene lógica de recuperación,
// generación de embeddings ni construcción de contexto.
//
// Nota de diseño (evita duplicación): la generación del embedding de la
// consulta ya vive dentro de vector-search.service (fase 6). Por eso este
// servicio NO llama a embedding.service directamente — delegar en la búsqueda
// mantiene un único responsable del embedding y respeta la separación.
//
// La comunicación con el LLM queda encapsulada tras la interfaz LlmProvider
// (lib/ai): este servicio es su único consumidor y el resto de la app no conoce
// al proveedor. Por defecto se usa Hugging Face (Llama-3.3-70B vía el router
// compatible con OpenAI); se puede cambiar con AI_PROVIDER/HF_MODEL o inyectando
// otro LlmProvider — sin cambios en este servicio.

type Client = SupabaseClient<Database>;

export interface ChatOptions {
  // Recuperación (fase 6)
  topK?: number;
  similarityThreshold?: number;
  // Contexto (fase 7)
  maxDocuments?: number;
  minSimilarity?: number;
  maxContextChars?: number;
  // Generación (fase 8)
  maxTokens?: number;
  temperature?: number;
  // Mensaje cuando no hay contexto suficiente (configurable).
  noContextMessage?: string;
}

export interface ChatSource {
  rank: number;
  articleId: string;
  title: string;
  similarity: number;
}

export interface ChatResult {
  answer: string;
  sources: ChatSource[];
  hasContext: boolean;
  query: string;
  metadata: {
    llmModel: string | null; // null si no se invocó al modelo (sin contexto)
    embeddingModel: string;
    retrievedCount: number; // documentos devueltos por la búsqueda
    usedCount: number; // documentos que entraron al contexto
    contextChars: number;
    truncated: boolean;
    stopReason?: string | null;
    usage?: { inputTokens?: number; outputTokens?: number };
  };
}

// Inyección de dependencias para pruebas deterministas (sin OpenAI ni Claude).
export interface ChatDeps {
  provider?: LlmProvider;
  embed?: (text: string) => Promise<number[]>;
}

const DEFAULT_NO_CONTEXT_MESSAGE =
  "No encontré información relevante en ReadHub para responder esa consulta.";

export async function ask(
  supabase: Client,
  query: string,
  options: ChatOptions = {},
  deps: ChatDeps = {}
): Promise<ChatResult> {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    throw new Error("ask: la consulta está vacía.");
  }

  // (1)+(2)+(3) Recuperación semántica (embed de la consulta + búsqueda).
  const searchOptions: VectorSearchOptions = {
    topK: options.topK,
    similarityThreshold: options.similarityThreshold,
  };
  const retrieval = await searchArticles(supabase, trimmedQuery, searchOptions, {
    embed: deps.embed,
  });

  // (4) Construcción del contexto a partir de los documentos recuperados.
  const contextOptions: BuildContextOptions = {
    maxDocuments: options.maxDocuments,
    minSimilarity: options.minSimilarity,
    maxContextChars: options.maxContextChars,
  };
  const context = buildContext(trimmedQuery, retrieval.results, contextOptions);

  const sources: ChatSource[] = context.sources.map((source) => ({
    rank: source.rank,
    articleId: source.articleId,
    title: source.title,
    similarity: source.similarity,
  }));

  // Sin contexto suficiente: se responde explícitamente que no hay información,
  // en lugar de generar algo no respaldado. Además se evita gastar en el LLM.
  if (sources.length === 0) {
    return {
      answer: options.noContextMessage ?? DEFAULT_NO_CONTEXT_MESSAGE,
      sources,
      hasContext: false,
      query: trimmedQuery,
      metadata: {
        llmModel: null,
        embeddingModel: retrieval.model,
        retrievedCount: retrieval.results.length,
        usedCount: 0,
        contextChars: context.contextChars,
        truncated: context.truncated,
      },
    };
  }

  // (5)+(6) Invocación a Claude. El system refuerza responder solo desde el
  // contexto; el mensaje de usuario lleva contexto + pregunta ya formateados.
  const provider = deps.provider ?? getDefaultProvider();
  const completion = await provider.complete({
    system: context.systemInstructions,
    messages: [{ role: "user", content: context.userPrompt }],
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  });

  // (7) Resultado estructurado, listo para la interfaz.
  return {
    answer: completion.text,
    sources,
    hasContext: true,
    query: trimmedQuery,
    metadata: {
      llmModel: completion.model,
      embeddingModel: retrieval.model,
      retrievedCount: retrieval.results.length,
      usedCount: sources.length,
      contextChars: context.contextChars,
      truncated: context.truncated,
      stopReason: completion.stopReason ?? null,
      usage: completion.usage,
    },
  };
}
