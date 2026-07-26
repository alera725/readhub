import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildArticleEmbeddingText,
  generateEmbedding,
  persistArticleEmbedding,
  embedArticle,
  computeContentHash,
  EMBEDDING_DIMENSIONS,
} from "./embedding.service";

const realFetch = globalThis.fetch;

function stubFetch(dim: number, ok = true) {
  globalThis.fetch = vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ data: [{ embedding: Array(dim).fill(0.01) }] }),
    text: async () => "error simulado",
  })) as unknown as typeof fetch;
}

// Cliente admin falso: captura el UPSERT.
function makeFakeAdmin() {
  const state: { row?: Record<string, unknown>; opts?: unknown } = {};
  return {
    admin: {
      from() {
        return {
          upsert(row: Record<string, unknown>, opts: unknown) {
            state.row = row;
            state.opts = opts;
            return Promise.resolve({ error: null });
          },
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    state,
  };
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("buildArticleEmbeddingText — composición", () => {
  it("compone las secciones etiquetadas presentes", () => {
    const t = buildArticleEmbeddingText({ title: "Postgres", summary: "BD", content: "cuerpo" });
    expect(t).toContain("Título: Postgres");
    expect(t).toContain("Resumen: BD");
    expect(t).toContain("Contenido:\ncuerpo");
  });

  it("omite las secciones ausentes", () => {
    const t = buildArticleEmbeddingText({ title: "Solo título", summary: null });
    expect(t).toContain("Título: Solo título");
    expect(t).not.toContain("Resumen:");
  });
});

describe("generateEmbedding — validación y errores", () => {
  it("devuelve un vector de la dimensión esperada", async () => {
    stubFetch(EMBEDDING_DIMENSIONS);
    const emb = await generateEmbedding("hola");
    expect(Array.isArray(emb)).toBe(true);
    expect(emb).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("lanza con texto vacío (no llama al proveedor)", async () => {
    stubFetch(EMBEDDING_DIMENSIONS);
    await expect(generateEmbedding("   ")).rejects.toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("lanza si la dimensión es inesperada", async () => {
    stubFetch(10);
    await expect(generateEmbedding("x")).rejects.toThrow();
  });

  it("lanza si el proveedor responde no-ok", async () => {
    stubFetch(EMBEDDING_DIMENSIONS, false);
    await expect(generateEmbedding("x")).rejects.toThrow();
  });

  it("lanza si falta OPENAI_API_KEY", async () => {
    delete process.env.OPENAI_API_KEY;
    stubFetch(EMBEDDING_DIMENSIONS);
    await expect(generateEmbedding("x")).rejects.toThrow();
  });
});

describe("persistArticleEmbedding — validación y persistencia", () => {
  it("rechaza una dimensión incorrecta", async () => {
    const { admin } = makeFakeAdmin();
    await expect(persistArticleEmbedding(admin, { articleId: "a1", embedding: [1, 2, 3] })).rejects.toThrow();
  });

  it("hace UPSERT por article_id con el vector serializado", async () => {
    const { admin, state } = makeFakeAdmin();
    await persistArticleEmbedding(admin, {
      articleId: "a1",
      embedding: Array(EMBEDDING_DIMENSIONS).fill(0.01),
      model: "m",
      contentHash: "h",
    });
    expect(state.row?.article_id).toBe("a1");
    expect(typeof state.row?.embedding).toBe("string");
    expect((state.row?.embedding as string).startsWith("[")).toBe(true);
    expect(JSON.stringify(state.opts)).toContain("article_id");
  });
});

describe("embedArticle — compose → embed → persist", () => {
  it("genera y persiste el embedding con su content_hash", async () => {
    stubFetch(EMBEDDING_DIMENSIONS);
    const { admin, state } = makeFakeAdmin();
    const result = await embedArticle(admin, {
      article: { id: "art-1", title: "T", summary: "S", document_path: null },
      content: "cuerpo",
      fetchContent: false,
    });
    expect(result.dimensions).toBe(EMBEDDING_DIMENSIONS);
    expect(result.contentHash).toHaveLength(64);
    expect(state.row?.article_id).toBe("art-1");
    expect(state.row?.content_hash).toBe(result.contentHash);
  });
});

describe("computeContentHash — determinismo", () => {
  it("devuelve el mismo hash para el mismo texto y distinto para otro", () => {
    expect(computeContentHash("hola")).toBe(computeContentHash("hola"));
    expect(computeContentHash("hola")).not.toBe(computeContentHash("chau"));
  });
});
