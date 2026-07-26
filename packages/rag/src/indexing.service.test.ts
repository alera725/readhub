import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { indexArticleChange } from "./indexing.service";
import { EMBEDDING_DIMENSIONS } from "./embedding.service";

const realFetch = globalThis.fetch;

// Cliente admin falso con estado en memoria para article_embeddings.
// Soporta: select().eq().maybeSingle(), upsert(), delete().eq().
function makeStatefulAdmin() {
  const store = new Map<string, { article_id: string; content_hash: string | null }>();
  const admin = {
    from(_table: string) {
      let op: "select" | "delete" | null = null;
      let eqVal: unknown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select() { op = "select"; return builder; },
        delete() { op = "delete"; return builder; },
        eq(_col: string, val: unknown) {
          eqVal = val;
          if (op === "delete") {
            store.delete(String(val));
            return Promise.resolve({ error: null });
          }
          return builder;
        },
        maybeSingle() {
          const row = store.get(String(eqVal));
          return Promise.resolve({ data: row ? { content_hash: row.content_hash } : null, error: null });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upsert(row: any) {
          store.set(row.article_id, { article_id: row.article_id, content_hash: row.content_hash ?? null });
          return Promise.resolve({ error: null });
        },
      };
      return builder;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { admin, store };
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: [{ embedding: Array(EMBEDDING_DIMENSIONS).fill(0.01) }] }),
    text: async () => "",
  })) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

const article = { id: "art-1", title: "PostgreSQL", summary: "Bases de datos.", document_path: null };

describe("indexArticleChange — comportamiento esperado", () => {
  it("INSERT/UPDATE de un artículo nuevo lo indexa y persiste", async () => {
    const { admin, store } = makeStatefulAdmin();
    const r = await indexArticleChange(admin, { type: "UPDATE", article });
    expect(r.action).toBe("indexed");
    expect(r.dimensions).toBe(EMBEDDING_DIMENSIONS);
    expect(store.has("art-1")).toBe(true);
  });

  it("corto-circuito: si el content_hash no cambió, omite la reindexación", async () => {
    const { admin } = makeStatefulAdmin();
    const first = await indexArticleChange(admin, { type: "UPDATE", article });
    expect(first.action).toBe("indexed");
    // Reiniciar el contador de llamadas al proveedor para verificar el skip.
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockClear();
    const second = await indexArticleChange(admin, { type: "UPDATE", article });
    expect(second.action).toBe("skipped");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("DELETE elimina el embedding del artículo", async () => {
    const { admin, store } = makeStatefulAdmin();
    await indexArticleChange(admin, { type: "UPDATE", article });
    expect(store.has("art-1")).toBe(true);
    const r = await indexArticleChange(admin, { type: "DELETE", article });
    expect(r.action).toBe("deleted");
    expect(store.has("art-1")).toBe(false);
  });
});

describe("indexArticleChange — casos límite", () => {
  it("omite un artículo sin texto vectorizable", async () => {
    const { admin } = makeStatefulAdmin();
    const r = await indexArticleChange(admin, {
      type: "INSERT",
      article: { id: "vacio", title: "", summary: null, document_path: null },
    });
    expect(r.action).toBe("skipped");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
