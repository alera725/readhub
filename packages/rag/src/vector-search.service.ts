import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@readhub/types";
import { EMBEDDING_MODEL, generateEmbedding } from "./embedding.service";

// Motor de recuperación semántica (RAG, fase 6).
//
// Responsabilidad ÚNICA: transformar una consulta en lenguaje natural en un
// conjunto ordenado de artículos relevantes. NO construye contexto, ni prompts,
// ni llama a un LLM — eso corresponde a fases posteriores.
//
// Flujo: consulta → embedding de la consulta → búsqueda por similitud
// (match_articles) → Top-K ordenado → resultado estructurado.
//
// Corre en servidor: la generación del embedding requiere OPENAI_API_KEY.
// El cliente Supabase que se recibe DEBE portar la sesión del usuario (cliente
// de servidor con cookies), porque match_articles es SECURITY DEFINER y filtra
// por visibilidad usando auth.uid(): así el usuario recupera artículos públicos
// y también los propios (borradores), pero nunca borradores ajenos.

type Client = SupabaseClient<Database>;

// Valores por defecto del ranking (justificación en el informe):
//   * TOP_K = 5  → suficiente contexto para el RAG sin inflar tokens; coincide
//                  con el default de match_articles (fase 3).
//   * THRESHOLD = 0.2 → los embeddings de text-embedding-3-small están
//                  normalizados: el contenido no relacionado se agrupa en
//                  similitudes bajas (~0.05–0.25) y el relacionado más arriba
//                  (~0.35+). 0.2 descarta ruido evidente conservando recall.
const DEFAULT_TOP_K = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.2;
const MAX_TOP_K = 50; // cota de seguridad para no pedir cargas absurdas

export interface VectorSearchOptions {
  topK?: number;
  similarityThreshold?: number;
}

// Cada resultado incluye todo lo necesario para construir luego el contexto
// del LLM (fase 7): identificación, texto consultable y autoría.
export interface RetrievedArticle {
  articleId: string;
  title: string;
  summary: string | null;
  authorId: string;
  similarity: number; // 1 - distancia coseno; mayor = más parecido
}

export interface VectorSearchResponse {
  query: string;
  model: string;
  topK: number;
  similarityThreshold: number;
  results: RetrievedArticle[]; // ordenados por relevancia (desc)
}

// Inyección de dependencias para pruebas deterministas: permite sustituir el
// generador de embeddings sin tocar la lógica ni depender del proveedor real.
export interface VectorSearchDeps {
  embed?: (text: string) => Promise<number[]>;
}

export async function searchArticles(
  supabase: Client,
  query: string,
  options: VectorSearchOptions = {},
  deps: VectorSearchDeps = {}
): Promise<VectorSearchResponse> {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    throw new Error("searchArticles: la consulta está vacía.");
  }

  const topK = normalizeTopK(options.topK);
  const similarityThreshold = normalizeThreshold(options.similarityThreshold);
  const embed = deps.embed ?? generateEmbedding;

  // (1)+(2) Embedding de la consulta.
  const queryEmbedding = await embed(trimmedQuery);

  // (3)+(4) Búsqueda por similitud y Top-K ordenado por relevancia. El vector
  // se envía como string "[...]" (formato pgvector vía PostgREST).
  const { data, error } = await supabase.rpc("match_articles", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: topK,
    similarity_threshold: similarityThreshold,
  });

  if (error) throw error;

  // (5) Resultado estructurado, listo para las siguientes etapas del RAG.
  const results: RetrievedArticle[] = (data ?? []).map((row) => ({
    articleId: row.article_id,
    title: row.title,
    summary: row.summary,
    authorId: row.author_id,
    similarity: row.similarity,
  }));

  return {
    query: trimmedQuery,
    model: EMBEDDING_MODEL,
    topK,
    similarityThreshold,
    results,
  };
}

function normalizeTopK(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_TOP_K;
  const asInt = Math.floor(value);
  if (asInt < 1) return 1;
  if (asInt > MAX_TOP_K) return MAX_TOP_K;
  return asInt;
}

function normalizeThreshold(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_SIMILARITY_THRESHOLD;
  }
  // La similitud coseno vive en [-1, 1]; se acota a ese rango.
  if (value < -1) return -1;
  if (value > 1) return 1;
  return value;
}
