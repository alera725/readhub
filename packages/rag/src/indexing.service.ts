import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@readhub/types";
import {
  buildArticleEmbeddingText,
  computeContentHash,
  embedArticle,
  extractArticleContent,
} from "./embedding.service";

// Pipeline de indexación automática: mantiene la base vectorial
// (article_embeddings) sincronizada con la base relacional (articles).
//
// REUTILIZA por completo embedding.service.ts (composición del texto,
// extracción de contenido, generación y persistencia del embedding). Aquí no
// se re-implementa nada de eso: solo se orquesta el ciclo de vida.
//
// Se ejecuta en servidor con el cliente service_role (bypass de RLS), porque
// la escritura en article_embeddings solo es posible con esa clave y la
// generación del embedding requiere secretos de servidor (OPENAI_API_KEY).

type AdminClient = SupabaseClient<Database>;
type ArticleRow = Tables<"articles">;

// Tipos de cambio tal como los emite un Database Webhook de Supabase.
export type ArticleChangeType = "INSERT" | "UPDATE" | "DELETE";

export type IndexAction = "indexed" | "skipped" | "deleted";

export interface IndexArticleInput {
  type: ArticleChangeType;
  // Subset mínimo de la fila de `articles` necesario para vectorizar.
  article: Pick<ArticleRow, "id" | "title" | "summary" | "document_path">;
}

export interface IndexResult {
  articleId: string;
  action: IndexAction;
  reason?: string;
  model?: string;
  dimensions?: number;
  contentHash?: string;
}

// Punto de entrada único del pipeline. El receptor del webhook (Route Handler)
// solo llama a esta función; toda la lógica de sincronización vive aquí.
//
// Pasos del pipeline:
//   1. detección del cambio        → se recibe `type` del webhook;
//   2. obtención del contenido      → extractArticleContent (Storage);
//   3. generación del embedding     → embedArticle (embedding.service);
//   4. actualización del registro   → UPSERT por article_id;
//   5. validación del resultado     → dimensión + relectura de la fila.
export async function indexArticleChange(
  admin: AdminClient,
  { type, article }: IndexArticleInput
): Promise<IndexResult> {
  if (type === "DELETE") {
    return removeArticleEmbedding(admin, article.id);
  }
  // INSERT y UPDATE comparten camino: en ambos se recompone y se hace UPSERT,
  // garantizando una única representación vigente por artículo.
  return reindexArticle(admin, article);
}

// INSERT / UPDATE ----------------------------------------------------------
async function reindexArticle(
  admin: AdminClient,
  article: IndexArticleInput["article"]
): Promise<IndexResult> {
  // (2) Obtener el contenido actualizado y componer el texto a vectorizar.
  const content = await extractArticleContent(admin, article);
  const text = buildArticleEmbeddingText({
    title: article.title,
    summary: article.summary,
    content,
  });

  // Sin texto vectorizable (p. ej. artículo sin título ni resumen y con
  // documento no extraíble): si existía un embedding previo, se elimina para
  // no dejar una representación obsoleta; nunca se deja algo inconsistente.
  if (!text) {
    await deleteRow(admin, article.id);
    return {
      articleId: article.id,
      action: "skipped",
      reason: "artículo sin texto vectorizable",
    };
  }

  // Idempotencia: si el contenido no cambió respecto al embedding vigente,
  // se evita re-vectorizar (ahorra llamadas al proveedor y garantiza que un
  // reintento del webhook no genere trabajo ni duplicados).
  const nextHash = computeContentHash(text);
  const currentHash = await getStoredContentHash(admin, article.id);
  if (currentHash && currentHash === nextHash) {
    return {
      articleId: article.id,
      action: "skipped",
      reason: "contenido sin cambios",
      contentHash: nextHash,
    };
  }

  // (3) + (4) Generar y persistir (UPSERT por article_id). Se reutiliza el
  // contenido ya extraído (fetchContent: false) para no volver a Storage.
  const result = await embedArticle(admin, {
    article,
    content,
    fetchContent: false,
  });

  // (5) Validación del resultado: confirmar que la representación quedó
  // efectivamente vigente y coincide con lo generado.
  const persistedHash = await getStoredContentHash(admin, article.id);
  if (persistedHash !== result.contentHash) {
    throw new Error(
      `indexArticleChange: la validación falló para ${article.id} (no se encontró el embedding recién persistido).`
    );
  }

  return {
    articleId: article.id,
    action: "indexed",
    model: result.model,
    dimensions: result.dimensions,
    contentHash: result.contentHash,
  };
}

// DELETE -------------------------------------------------------------------
// La FK article_embeddings.article_id → articles(id) es ON DELETE CASCADE
// (ver 20260704120100_article_embeddings.sql): al borrar el artículo, su
// embedding se elimina automáticamente. Esta operación explícita es defensa
// en profundidad e idempotente (borrar algo ya inexistente no falla).
async function removeArticleEmbedding(
  admin: AdminClient,
  articleId: string
): Promise<IndexResult> {
  await deleteRow(admin, articleId);
  return { articleId, action: "deleted" };
}

// Helpers ------------------------------------------------------------------
async function getStoredContentHash(
  admin: AdminClient,
  articleId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("article_embeddings")
    .select("content_hash")
    .eq("article_id", articleId)
    .maybeSingle();

  if (error) throw error;
  return data?.content_hash ?? null;
}

async function deleteRow(admin: AdminClient, articleId: string): Promise<void> {
  const { error } = await admin
    .from("article_embeddings")
    .delete()
    .eq("article_id", articleId);

  if (error) throw error;
}
