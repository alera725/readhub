import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@readhub/types";
import { fetchWithTimeout } from "@readhub/shared";

// Cliente con service_role (bypass de RLS). La escritura en
// `article_embeddings` solo es posible con este cliente — ver
// lib/supabase/admin.ts y la migración 20260704120100_article_embeddings.sql.
type AdminClient = SupabaseClient<Database>;
type ArticleRow = Tables<"articles">;

// ---------------------------------------------------------------------------
// Configuración del proveedor de embeddings (ENCAPSULADA aquí)
// ---------------------------------------------------------------------------
// Ningún otro módulo del proyecto conoce estos detalles: si mañana se cambia
// de OpenAI a otro proveedor, solo se toca este archivo.
export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536; // debe coincidir con vector(1536) de la tabla
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_TIMEOUT_MS = 20_000; // acota la llamada al proveedor (ver lib/http)

// text-embedding-3-small admite hasta 8191 tokens (~1 token ≈ 4 chars). Se
// recorta el texto compuesto a un tope de caracteres conservador para no
// exceder el límite del modelo. El título y el resumen van primero, así que
// nunca se pierden: si algo se recorta, es la cola del contenido.
const MAX_EMBEDDING_CHARS = 24000;

const BUCKET = "media"; // mismo bucket privado que storage.service.ts

interface OpenAIEmbeddingResponse {
  data?: { embedding?: number[] }[];
}

// ---------------------------------------------------------------------------
// 1. Extracción del conocimiento: composición del texto a vectorizar
// ---------------------------------------------------------------------------
export interface ArticleEmbeddingSource {
  title: string;
  summary?: string | null;
  content?: string | null;
}

// Construye el texto que se convertirá en embedding a partir de la información
// relevante del artículo.
//
// Estrategia (y su justificación):
//   * Título   → señal semántica más fuerte por token (etiqueta curada del
//                tema); se incluye siempre y primero.
//   * Resumen  → abstract denso escrito por el autor; altísimo valor semántico
//                por token, ideal para recall temático.
//   * Contenido→ cuerpo completo; aporta profundidad y cobertura, aunque más
//                ruidoso. Va al final para que, si hay recorte por longitud,
//                se pierda su cola y no las secciones de mayor señal.
//
// Se etiqueta cada sección ("Título:", "Resumen:", "Contenido:") para dar
// estructura al modelo. `categoría`/`etiquetas` no existen en el esquema de
// ReadHub (la tabla `articles` solo tiene title/summary/document_path/…), por
// lo que se omiten deliberadamente — el prompt las contempla "si existen".
export function buildArticleEmbeddingText(source: ArticleEmbeddingSource): string {
  const sections: string[] = [];
  const title = source.title?.trim();
  const summary = source.summary?.trim();
  const content = source.content?.trim();

  if (title) sections.push(`Título: ${title}`);
  if (summary) sections.push(`Resumen: ${summary}`);
  if (content) sections.push(`Contenido:\n${content}`);

  const composed = sections.join("\n\n").trim();

  return composed.length > MAX_EMBEDDING_CHARS
    ? composed.slice(0, MAX_EMBEDDING_CHARS).trim()
    : composed;
}

// Extrae el cuerpo del artículo desde Storage para poder incluirlo en el
// texto vectorizado. El contenido de ReadHub vive como archivo (no en la DB),
// por lo que esta extracción es necesaria.
//
// En esta fase solo se procesa text/plain (.txt) de forma fiable. PDF/DOCX
// requerirían parsers dedicados (mejora futura); para ellos se devuelve null
// y el embedding se compone solo con título + resumen.
export async function extractArticleContent(
  admin: AdminClient,
  article: Pick<ArticleRow, "document_path">
): Promise<string | null> {
  if (!article.document_path) return null;

  const ext = article.document_path.split(".").pop()?.toLowerCase();
  if (ext !== "txt") return null;

  const { data, error } = await admin.storage
    .from(BUCKET)
    .download(article.document_path);

  if (error) throw error;
  if (!data) return null;

  const text = (await data.text()).trim();
  return text || null;
}

// ---------------------------------------------------------------------------
// 2. Generación del embedding (comunicación con el proveedor)
// ---------------------------------------------------------------------------
// Recibe texto ya preparado y devuelve su vector. Valida la respuesta y la
// dimensión antes de entregar el resultado. Es la ÚNICA función que habla con
// el proveedor externo.
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text?.trim();
  if (!input) {
    throw new Error("generateEmbedding: el texto de entrada está vacío.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("generateEmbedding: falta OPENAI_API_KEY.");
  }

  const response = await fetchWithTimeout(
    OPENAI_EMBEDDINGS_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
    },
    EMBEDDING_TIMEOUT_MS
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `generateEmbedding: el proveedor respondió ${response.status}. ${detail}`.trim()
    );
  }

  const payload = (await response.json()) as OpenAIEmbeddingResponse;
  const embedding = payload?.data?.[0]?.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error("generateEmbedding: respuesta del proveedor sin embedding válido.");
  }
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `generateEmbedding: dimensión inesperada ${embedding.length} (esperada ${EMBEDDING_DIMENSIONS}).`
    );
  }

  return embedding;
}

// ---------------------------------------------------------------------------
// 3. Persistencia en la base vectorial
// ---------------------------------------------------------------------------
export interface PersistEmbeddingInput {
  articleId: string;
  embedding: number[];
  model?: string;
  contentHash?: string | null;
}

// Valida la dimensión (defensa en profundidad: aunque la columna es
// vector(1536), fallamos antes y con un mensaje claro) y hace UPSERT por
// article_id (la tabla tiene unique(article_id): una representación vigente
// por artículo). El vector se envía como string "[...]", formato que pgvector
// acepta vía PostgREST y que refleja el tipo generado (embedding: string).
export async function persistArticleEmbedding(
  admin: AdminClient,
  { articleId, embedding, model = EMBEDDING_MODEL, contentHash = null }: PersistEmbeddingInput
): Promise<void> {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `persistArticleEmbedding: dimensión ${embedding.length} != ${EMBEDDING_DIMENSIONS}.`
    );
  }

  const { error } = await admin.from("article_embeddings").upsert(
    {
      article_id: articleId,
      embedding: JSON.stringify(embedding),
      model,
      content_hash: contentHash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "article_id" }
  );

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// 4. Orquestación: recibir un artículo → generar y almacenar su embedding
// ---------------------------------------------------------------------------
// Punto de entrada manual de esta fase y pieza reutilizable por la indexación
// automática (fase 5): esa fase solo tendrá que invocar embedArticle() dentro
// de su disparador, sin volver a implementar composición/generación/persistencia.
export interface EmbedArticleInput {
  // Campos mínimos necesarios; acepta una fila completa de `articles` o un subset.
  article: Pick<ArticleRow, "id" | "title" | "summary" | "document_path">;
  // Cuerpo en texto plano ya disponible (evita ir a Storage). Si no se pasa y
  // fetchContent = true, se intenta extraer de Storage.
  content?: string | null;
  fetchContent?: boolean;
}

export interface EmbedArticleResult {
  articleId: string;
  model: string;
  dimensions: number;
  charCount: number;
  contentHash: string;
  usedContent: boolean;
}

export async function embedArticle(
  admin: AdminClient,
  { article, content, fetchContent = true }: EmbedArticleInput
): Promise<EmbedArticleResult> {
  let body = content?.trim() || null;
  if (!body && fetchContent) {
    body = await extractArticleContent(admin, article);
  }

  const text = buildArticleEmbeddingText({
    title: article.title,
    summary: article.summary,
    content: body,
  });

  if (!text) {
    throw new Error(
      `embedArticle: el artículo ${article.id} no tiene texto vectorizable.`
    );
  }

  const embedding = await generateEmbedding(text);
  // Hash del texto compuesto COMPLETO (título+resumen+contenido): permite a la
  // fase 5 detectar cualquier cambio (edición de título, resumen o cuerpo) y
  // evitar re-vectorizar contenido idéntico.
  const contentHash = hashText(text);

  await persistArticleEmbedding(admin, {
    articleId: article.id,
    embedding,
    model: EMBEDDING_MODEL,
    contentHash,
  });

  return {
    articleId: article.id,
    model: EMBEDDING_MODEL,
    dimensions: embedding.length,
    charCount: text.length,
    contentHash,
    usedContent: Boolean(body),
  };
}

function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// Hash estable del texto vectorizado, expuesto para que la indexación
// automática (fase 5) pueda comparar contra content_hash y decidir si un
// artículo cambió sin re-vectorizar. Mantiene el hashing en un único lugar.
export function computeContentHash(text: string): string {
  return hashText(text);
}
