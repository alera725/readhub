import { describe, it, expect, beforeEach } from "vitest";
import type { LlmProvider, LlmCompletionRequest } from "@readhub/ai";
import { ask } from "./chat.service";

const CORPUS = [
  { id: "A", title: "PostgreSQL", summary: "Bases de datos.", vec: [1, 0, 0] },
  { id: "B", title: "RLS", summary: "Políticas en Postgres.", vec: [0.95, 0.05, 0] },
  { id: "C", title: "Astronomía", summary: "Galaxias.", vec: [0, 1, 0] },
];

function cosine(a: number[], b: number[]): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na) * Math.sqrt(nb));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeSupabase: any = {
  rpc(_name: string, args: { query_embedding: string; match_count: number; similarity_threshold: number }) {
    const q = JSON.parse(args.query_embedding) as number[];
    const rows = CORPUS.map((c) => ({ article_id: c.id, title: c.title, summary: c.summary, author_id: "u1", similarity: cosine(q, c.vec) }))
      .filter((r) => r.similarity >= args.similarity_threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, args.match_count);
    return Promise.resolve({ data: rows, error: null });
  },
};

async function embedPostgres(text: string): Promise<number[]> {
  const t = text.toLowerCase();
  if (t.includes("postgres") || t.includes("rls")) return [1, 0, 0];
  return [0.01, 0.01, 1]; // ajeno al corpus
}

let lastRequest: LlmCompletionRequest | null = null;
let providerCalls = 0;
const fakeProvider: LlmProvider = {
  name: "fake",
  async complete(req) {
    lastRequest = req;
    providerCalls++;
    return { text: "Según el contexto [Fuente 1].", model: "fake-1", stopReason: "end_turn", usage: { inputTokens: 100, outputTokens: 20 } };
  },
};

beforeEach(() => {
  lastRequest = null;
  providerCalls = 0;
});

describe("ask — flujo RAG completo", () => {
  it("recupera, construye contexto y genera respuesta con fuentes", async () => {
    const r = await ask(fakeSupabase, "¿qué es postgres?", { similarityThreshold: 0.2, minSimilarity: 0.25 }, { embed: embedPostgres, provider: fakeProvider });
    expect(r.answer.length).toBeGreaterThan(0);
    expect(r.hasContext).toBe(true);
    expect(providerCalls).toBe(1);
    const ids = r.sources.map((s) => s.articleId);
    expect(ids).toContain("A");
    expect(ids).not.toContain("C");
    expect(r.sources.every((s, i) => s.rank === i + 1)).toBe(true);
  });

  it("envía un prompt fundamentado (system con guardrail + contexto, sin lo descartado)", async () => {
    await ask(fakeSupabase, "¿qué es postgres?", { minSimilarity: 0.25 }, { embed: embedPostgres, provider: fakeProvider });
    expect(lastRequest!.system).toMatch(/ÚNICA y EXCLUSIVAMENTE/);
    expect(lastRequest!.messages[0].content).toContain("=== CONTEXTO ===");
    expect(lastRequest!.messages[0].content).toContain("PostgreSQL");
    expect(lastRequest!.messages[0].content).not.toContain("Astronomía");
  });

  it("expone metadatos del proceso", async () => {
    const r = await ask(fakeSupabase, "¿qué es postgres?", {}, { embed: embedPostgres, provider: fakeProvider });
    expect(r.metadata.llmModel).toBe("fake-1");
    expect(typeof r.metadata.embeddingModel).toBe("string");
    expect(r.metadata.usedCount).toBe(r.sources.length);
    expect(r.metadata.retrievedCount).toBeGreaterThanOrEqual(r.metadata.usedCount);
  });
});

describe("ask — sin contexto y entradas inválidas", () => {
  it("sin información relevante: responde explícito y NO llama al LLM", async () => {
    const r = await ask(fakeSupabase, "consulta totalmente ajena", { minSimilarity: 0.25 }, { embed: embedPostgres, provider: fakeProvider });
    expect(r.hasContext).toBe(false);
    expect(r.sources).toHaveLength(0);
    expect(providerCalls).toBe(0);
    expect(r.metadata.llmModel).toBeNull();
    expect(r.answer).toMatch(/No encontré información relevante/);
  });

  it("usa el mensaje 'sin contexto' configurable", async () => {
    const r = await ask(fakeSupabase, "otra ajena", { minSimilarity: 0.25, noContextMessage: "PERSONALIZADO" }, { embed: embedPostgres, provider: fakeProvider });
    expect(r.answer).toBe("PERSONALIZADO");
  });

  it("lanza si la consulta está vacía", async () => {
    await expect(ask(fakeSupabase, "  ", {}, { embed: embedPostgres, provider: fakeProvider })).rejects.toThrow();
  });
});
