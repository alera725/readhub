import type { RetrievedArticle } from "./vector-search.service";

// Constructor de contexto (RAG, fase 7).
//
// PUENTE entre el motor de recuperación (fase 6) y el LLM (fase 8+). Es un
// módulo PURO y determinista: recibe la consulta y los documentos ya
// recuperados (con su similitud) y produce un prompt estructurado + las fuentes.
//
// NO busca, NO llama a Storage, NO llama a ningún LLM. Su única responsabilidad
// es organizar el conocimiento para una consulta futura. El sistema se detiene
// tras construir el prompt.

// Documento de entrada: lo que devuelve vector-search (title/summary/similitud)
// más, opcionalmente, el cuerpo completo si un caller ya lo tiene a mano.
export interface ContextDocument extends RetrievedArticle {
  content?: string | null;
}

export interface BuildContextOptions {
  maxDocuments?: number; // tope de documentos en el contexto
  minSimilarity?: number; // piso de relevancia para justificar inclusión
  maxContextChars?: number; // presupuesto de tamaño del contexto (configurable)
  dedupeThreshold?: number; // Jaccard a partir del cual dos docs se consideran redundantes
  systemInstructions?: string; // permite sobrescribir las instrucciones del sistema
}

// Fuente conservada por cada fragmento incluido: se usará luego para mostrar
// las referencias al usuario.
export interface ContextSource {
  rank: number; // posición en el ranking (1-based)
  articleId: string;
  title: string;
  similarity: number;
}

export interface BuildContextResult {
  prompt: string; // prompt final autocontenido (system + contexto + pregunta)
  systemInstructions: string; // separado, para usar como `system` en la fase 8
  userPrompt: string; // contexto + pregunta, sin las instrucciones (mensaje de usuario)
  contextText: string; // solo el bloque de contexto
  query: string;
  sources: ContextSource[]; // fuentes seleccionadas, en orden de relevancia
  usedDocuments: number;
  droppedDocuments: number;
  contextChars: number;
  truncated: boolean; // true si hubo recorte por presupuesto
}

// --- Valores por defecto (justificación en el informe) ---------------------
const DEFAULT_MAX_DOCUMENTS = 5; // alineado con el Top-K de recuperación
const DEFAULT_MIN_SIMILARITY = 0.25; // algo por encima del piso de búsqueda (0.2)
const DEFAULT_MAX_CONTEXT_CHARS = 6000; // ~1500 tokens; deja margen para respuesta
const DEFAULT_DEDUPE_THRESHOLD = 0.9; // solo descarta casi-idénticos
const MIN_BODY_CHARS = 80; // recorte mínimo útil de un cuerpo

const DOCUMENT_SEPARATOR = "\n\n---\n\n";

const DEFAULT_SYSTEM_INSTRUCTIONS = [
  "Eres el asistente de ReadHub, una plataforma de artículos.",
  "Responde la pregunta del usuario basándote ÚNICA y EXCLUSIVAMENTE en el CONTEXTO",
  "proporcionado, que contiene fragmentos de artículos recuperados por relevancia.",
  "",
  "Reglas:",
  "- No uses conocimiento externo al contexto. Si el contexto no contiene la",
  "  información necesaria, indícalo con claridad y no inventes.",
  "- Cita las fuentes que utilices con su etiqueta [Fuente N].",
  "- Responde en el mismo idioma que la pregunta, de forma clara y concisa.",
].join("\n");

// ---------------------------------------------------------------------------
// Punto de entrada único.
// ---------------------------------------------------------------------------
export function buildContext(
  query: string,
  documents: ContextDocument[],
  options: BuildContextOptions = {}
): BuildContextResult {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    throw new Error("buildContext: la consulta está vacía.");
  }

  const maxDocuments = positiveInt(options.maxDocuments, DEFAULT_MAX_DOCUMENTS);
  const minSimilarity = clamp01(options.minSimilarity, DEFAULT_MIN_SIMILARITY);
  const maxContextChars = positiveInt(
    options.maxContextChars,
    DEFAULT_MAX_CONTEXT_CHARS
  );
  const dedupeThreshold = clamp01(options.dedupeThreshold, DEFAULT_DEDUPE_THRESHOLD);
  const systemInstructions =
    options.systemInstructions?.trim() || DEFAULT_SYSTEM_INSTRUCTIONS;

  const totalCandidates = documents.length;

  // (1) SELECCIÓN: relevancia → calidad → deduplicación → tope de documentos.
  const selected = selectDocuments(documents, {
    maxDocuments,
    minSimilarity,
    dedupeThreshold,
  });

  // (2) ORGANIZACIÓN + (3) CONTROL DE TAMAÑO: se arma cada bloque en orden de
  // relevancia respetando el presupuesto de caracteres.
  const { blocks, sources, contextChars, truncated } = renderBlocks(
    selected,
    maxContextChars
  );

  const contextText = blocks.length
    ? blocks.join(DOCUMENT_SEPARATOR)
    : "(No se recuperaron documentos relevantes para esta consulta.)";

  // (4) PROMPT: instrucciones + contexto + pregunta, con separación explícita.
  // userPrompt = contexto + pregunta (mensaje de usuario); prompt = system + userPrompt.
  const userPrompt = [
    "=== CONTEXTO ===",
    contextText,
    "",
    "=== PREGUNTA DEL USUARIO ===",
    trimmedQuery,
  ].join("\n");
  const prompt = `${systemInstructions}\n\n${userPrompt}`;

  return {
    prompt,
    systemInstructions,
    userPrompt,
    contextText,
    query: trimmedQuery,
    sources,
    usedDocuments: sources.length,
    droppedDocuments: totalCandidates - sources.length,
    contextChars,
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Selección de documentos
// ---------------------------------------------------------------------------
interface SelectionParams {
  maxDocuments: number;
  minSimilarity: number;
  dedupeThreshold: number;
}

function selectDocuments(
  documents: ContextDocument[],
  { maxDocuments, minSimilarity, dedupeThreshold }: SelectionParams
): ContextDocument[] {
  // Orden por relevancia (desc). No se confía en el orden del caller.
  const ordered = [...documents].sort((a, b) => b.similarity - a.similarity);

  const selected: ContextDocument[] = [];
  const seenIds = new Set<string>();
  const seenTokenSets: Set<string>[] = [];

  for (const doc of ordered) {
    if (selected.length >= maxDocuments) break;

    // Piso de similitud: solo entra lo que justifica su inclusión.
    if (doc.similarity < minSimilarity) continue;

    // Defensa: un mismo artículo no se repite (match_articles ya es único).
    if (seenIds.has(doc.articleId)) continue;

    // Calidad: descartar documentos sin texto aprovechable.
    const body = documentBody(doc);
    if (!doc.title?.trim() && !body) continue;

    // Redundancia: descartar casi-duplicados por solapamiento de tokens.
    const tokens = tokenSet(`${doc.title ?? ""} ${body}`);
    const isRedundant = seenTokenSets.some(
      (prev) => jaccard(prev, tokens) >= dedupeThreshold
    );
    if (isRedundant) continue;

    selected.push(doc);
    seenIds.add(doc.articleId);
    seenTokenSets.push(tokens);
  }

  return selected;
}

// ---------------------------------------------------------------------------
// Organización + control de tamaño (renderizado de bloques con presupuesto)
// ---------------------------------------------------------------------------
function renderBlocks(
  selected: ContextDocument[],
  maxContextChars: number
): {
  blocks: string[];
  sources: ContextSource[];
  contextChars: number;
  truncated: boolean;
} {
  const blocks: string[] = [];
  const sources: ContextSource[] = [];
  let used = 0;
  let truncated = false;

  for (let i = 0; i < selected.length; i++) {
    const doc = selected[i];
    const rank = i + 1;
    const remaining = maxContextChars - used - (blocks.length ? DOCUMENT_SEPARATOR.length : 0);

    // Si no queda presupuesto ni para un bloque mínimo, se detiene: los docs
    // restantes son los menos relevantes.
    const header = renderHeader(doc, rank);
    if (remaining <= header.length + MIN_BODY_CHARS) {
      truncated = truncated || selected.length > blocks.length;
      break;
    }

    const bodyBudget = remaining - header.length - 1; // -1 por el salto de línea
    const body = documentBody(doc);
    let blockBody = body;
    if (body.length > bodyBudget) {
      // -1 reserva el espacio del carácter de elipsis, para no exceder el presupuesto.
      blockBody = body.slice(0, Math.max(bodyBudget - 1, 0)).trimEnd() + "…";
      truncated = true;
    }

    const block = `${header}\n${blockBody}`;
    used += block.length + (blocks.length ? DOCUMENT_SEPARATOR.length : 0);
    blocks.push(block);
    sources.push({
      rank,
      articleId: doc.articleId,
      title: doc.title,
      similarity: doc.similarity,
    });
  }

  return { blocks, sources, contextChars: used, truncated };
}

// Cabecera del fragmento: identifica la fuente de forma explícita.
function renderHeader(doc: ContextDocument, rank: number): string {
  const title = doc.title?.trim() || "(sin título)";
  return `[Fuente ${rank}] ${title} · similitud ${doc.similarity.toFixed(3)} · id ${doc.articleId}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Cuerpo aprovechable: se prefiere el contenido completo; si no, el resumen.
function documentBody(doc: ContextDocument): string {
  return (doc.content?.trim() || doc.summary?.trim() || "").trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function positiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  const asInt = Math.floor(value);
  return asInt >= 1 ? asInt : fallback;
}

function clamp01(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
