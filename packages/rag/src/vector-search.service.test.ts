import { describe, it, expect } from "vitest";
import { searchArticles } from "./vector-search.service";

// Corpus conceptual de 3 ejes: [cocina, astronomía, finanzas].
const CORPUS = [
  { id: "A", title: "Recetas de pasta", summary: "cocina", vec: [1, 0, 0] },
  { id: "B", title: "Galaxias", summary: "astronomía", vec: [0, 1, 0] },
  { id: "C", title: "Invertir en bolsa", summary: "finanzas", vec: [0, 0, 1] },
  { id: "D", title: "Cocina saludable", summary: "cocina", vec: [0.9, 0, 0.1] },
];

function cosine(a: number[], b: number[]): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na) * Math.sqrt(nb));
}

// Cliente Supabase falso: reproduce la semántica SQL de match_articles.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeSupabase: any = {
  rpc(name: string, args: { query_embedding: string; match_count: number; similarity_threshold: number }) {
    if (name !== "match_articles") throw new Error("rpc inesperada: " + name);
    const q = JSON.parse(args.query_embedding) as number[];
    const rows = CORPUS.map((c) => ({
      article_id: c.id,
      title: c.title,
      summary: c.summary,
      author_id: "u1",
      similarity: cosine(q, c.vec),
    }))
      .filter((r) => r.similarity >= args.similarity_threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, args.match_count);
    return Promise.resolve({ data: rows, error: null });
  },
};

async function embedCocina(): Promise<number[]> {
  return [1, 0, 0];
}

describe("searchArticles — comportamiento esperado", () => {
  it("recupera los documentos relevantes ordenados por similitud", async () => {
    const r = await searchArticles(fakeSupabase, "recetas de cocina", { similarityThreshold: 0.2 }, { embed: embedCocina });
    expect(["A", "D"]).toContain(r.results[0].articleId);
    expect(r.results[0].similarity).toBeGreaterThan(0.9);
    const sims = r.results.map((x) => x.similarity);
    expect(sims.every((s, i) => i === 0 || sims[i - 1] >= s)).toBe(true);
  });

  it("descarta los no relacionados por umbral", async () => {
    const r = await searchArticles(fakeSupabase, "cocina", { similarityThreshold: 0.2 }, { embed: embedCocina });
    const ids = r.results.map((x) => x.articleId);
    expect(ids).not.toContain("B");
    expect(ids).not.toContain("C");
  });

  it("respeta topK y reporta metadata (topK, umbral, modelo)", async () => {
    const r = await searchArticles(fakeSupabase, "cocina", { topK: 1, similarityThreshold: 0.2 }, { embed: embedCocina });
    expect(r.results).toHaveLength(1);
    expect(r.topK).toBe(1);
    expect(r.similarityThreshold).toBe(0.2);
    expect(typeof r.model).toBe("string");
    expect(r.model.length).toBeGreaterThan(0);
  });
});

describe("searchArticles — entradas inválidas y casos límite", () => {
  it("lanza si la consulta está vacía", async () => {
    await expect(searchArticles(fakeSupabase, "   ", {}, { embed: embedCocina })).rejects.toThrow();
  });

  it("normaliza topK inválido a >= 1", async () => {
    const r = await searchArticles(fakeSupabase, "cocina", { topK: -5 }, { embed: embedCocina });
    expect(r.topK).toBeGreaterThanOrEqual(1);
  });

  it("acota el umbral fuera de rango a <= 1", async () => {
    const r = await searchArticles(fakeSupabase, "cocina", { similarityThreshold: 9 }, { embed: embedCocina });
    expect(r.similarityThreshold).toBeLessThanOrEqual(1);
  });

  it("propaga el error del RPC de Supabase", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failing: any = { rpc: () => Promise.resolve({ data: null, error: new Error("rpc falló") }) };
    await expect(searchArticles(failing, "cocina", {}, { embed: embedCocina })).rejects.toThrow("rpc falló");
  });
});
