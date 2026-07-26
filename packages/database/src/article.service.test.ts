import { describe, it, expect, vi } from "vitest";
import {
  getPublicArticles,
  getArticleById,
  createArticle,
} from "./article.service";

// Construye un cliente Supabase falso con resultados terminales prefijados.
function mockSupabase(opts: {
  rpc?: { data: unknown; error: unknown };
  maybeSingle?: { data: unknown; error: unknown };
  single?: { data: unknown; error: unknown };
  captureInsert?: (row: Record<string, unknown>) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    insert: (row: Record<string, unknown>) => {
      opts.captureInsert?.(row);
      return builder;
    },
    maybeSingle: () => Promise.resolve(opts.maybeSingle),
    single: () => Promise.resolve(opts.single),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { rpc: () => Promise.resolve(opts.rpc), from: () => builder } as any;
}

describe("getPublicArticles", () => {
  it("devuelve los datos del RPC", async () => {
    const data = [{ id: "a1", title: "T" }];
    const r = await getPublicArticles(mockSupabase({ rpc: { data, error: null } }));
    expect(r).toEqual(data);
  });

  it("propaga el error del RPC", async () => {
    await expect(
      getPublicArticles(mockSupabase({ rpc: { data: null, error: new Error("rpc") } }))
    ).rejects.toThrow("rpc");
  });
});

describe("getArticleById", () => {
  it("devuelve el artículo cuando existe", async () => {
    const article = { id: "a1", title: "T" };
    const r = await getArticleById(mockSupabase({ maybeSingle: { data: article, error: null } }), "a1");
    expect(r).toEqual(article);
  });

  it("devuelve null cuando no existe", async () => {
    const r = await getArticleById(mockSupabase({ maybeSingle: { data: null, error: null } }), "x");
    expect(r).toBeNull();
  });

  it("propaga el error", async () => {
    await expect(
      getArticleById(mockSupabase({ maybeSingle: { data: null, error: new Error("db") } }), "x")
    ).rejects.toThrow("db");
  });
});

describe("createArticle — mapeo de parámetros y defaults", () => {
  it("aplica los valores por defecto (is_public=true, summary=null)", async () => {
    const capture = vi.fn();
    const created = { id: "new", title: "Nuevo" };
    const supabase = mockSupabase({
      single: { data: created, error: null },
      captureInsert: capture,
    });
    const r = await createArticle(supabase, { author_id: "u1", title: "Nuevo" });
    expect(r).toEqual(created);
    const row = capture.mock.calls[0][0];
    expect(row).toMatchObject({
      author_id: "u1",
      title: "Nuevo",
      summary: null,
      document_path: null,
      image_path: null,
      is_public: true,
    });
  });

  it("propaga el error de inserción", async () => {
    await expect(
      createArticle(mockSupabase({ single: { data: null, error: new Error("insert") } }), {
        author_id: "u1",
        title: "T",
      })
    ).rejects.toThrow("insert");
  });
});
