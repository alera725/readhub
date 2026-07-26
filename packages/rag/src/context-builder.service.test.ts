import { describe, it, expect } from "vitest";
import { buildContext, type ContextDocument } from "./context-builder.service";

function doc(
  id: string,
  title: string,
  similarity: number,
  summary: string | null = "resumen",
  content?: string
): ContextDocument {
  return { articleId: id, title, summary, authorId: "a1", similarity, content };
}

const CORPUS: ContextDocument[] = [
  doc("id-1", "PostgreSQL para principiantes", 0.91, "Bases de datos y SQL."),
  doc("id-2", "Row Level Security explicado", 0.82, "Políticas RLS en Postgres."),
  doc("id-3", "Next.js App Router", 0.77, "Rutas y server components."),
  doc("id-4", "Ruido irrelevante", 0.12, "Sin relación con la consulta."),
];

describe("buildContext — comportamiento esperado", () => {
  it("ordena por relevancia y numera las fuentes 1..N", () => {
    const r = buildContext("postgres", [...CORPUS].reverse());
    expect(r.sources[0]?.articleId).toBe("id-1");
    expect(r.sources.every((s, i) => s.rank === i + 1)).toBe(true);
    const sims = r.sources.map((s) => s.similarity);
    expect(sims.every((s, i) => i === 0 || sims[i - 1] >= s)).toBe(true);
  });

  it("expone cada fuente con rank, id, título y similitud, y las etiqueta en el contexto", () => {
    const r = buildContext("postgres", CORPUS);
    const s = r.sources[0];
    expect(s).toMatchObject({ rank: 1, articleId: "id-1" });
    expect(typeof s.similarity).toBe("number");
    expect(r.contextText).toContain("[Fuente 1]");
    expect(r.contextText).toContain("PostgreSQL para principiantes");
    expect(r.contextText).toContain("id-1");
  });

  it("arma un prompt consistente (system + contexto + pregunta) y determinista", () => {
    const a = buildContext("¿qué es postgres?", CORPUS);
    const b = buildContext("¿qué es postgres?", CORPUS);
    expect(a.prompt).toContain("asistente de ReadHub");
    expect(a.prompt).toContain("=== CONTEXTO ===");
    expect(a.prompt).toContain("¿qué es postgres?");
    expect(a.systemInstructions.length).toBeGreaterThan(0);
    expect(a.prompt).toBe(b.prompt);
  });
});

describe("buildContext — selección (entradas y casos límite)", () => {
  it("descarta lo que no supera el piso de similitud", () => {
    const r = buildContext("postgres", CORPUS);
    expect(r.sources.some((s) => s.articleId === "id-4")).toBe(false);
    expect(r.droppedDocuments).toBeGreaterThanOrEqual(1);
  });

  it("respeta el tope de documentos", () => {
    const r = buildContext("postgres", CORPUS, { maxDocuments: 2, minSimilarity: 0.2 });
    expect(r.sources).toHaveLength(2);
    expect(r.sources.map((s) => s.articleId)).toEqual(["id-1", "id-2"]);
  });

  it("deduplica documentos casi idénticos", () => {
    const dups: ContextDocument[] = [
      doc("id-a", "Guía de RLS", 0.9, "Cómo proteger filas con políticas RLS en Postgres."),
      doc("id-b", "Guía de RLS", 0.88, "Cómo proteger filas con políticas RLS en Postgres."),
      doc("id-c", "Otro tema", 0.7, "Contenido totalmente diferente sobre diseño."),
    ];
    const r = buildContext("rls", dups, { minSimilarity: 0.2 });
    const ids = r.sources.map((s) => s.articleId);
    expect(ids).toContain("id-a");
    expect(ids).toContain("id-c");
    expect(ids).not.toContain("id-b");
  });
});

describe("buildContext — límite de tamaño y manejo de casos vacíos", () => {
  it("trunca respetando el presupuesto de caracteres", () => {
    const big = "palabra ".repeat(500);
    const r = buildContext("tema", [doc("id-x", "Doc grande", 0.9, null, big)], {
      maxContextChars: 300,
      minSimilarity: 0.2,
    });
    expect(r.truncated).toBe(true);
    expect(r.contextChars).toBeLessThanOrEqual(300);
    expect(r.contextText).toContain("…");
  });

  it("sin documentos relevantes: sources vacío y placeholder, pero prompt consistente", () => {
    const r = buildContext("algo", [doc("id-z", "x", 0.05, "y")], { minSimilarity: 0.25 });
    expect(r.sources).toHaveLength(0);
    expect(r.contextText).toContain("No se recuperaron");
    expect(r.prompt).toContain("=== PREGUNTA DEL USUARIO ===");
  });
});

describe("buildContext — entradas inválidas", () => {
  it("lanza si la consulta está vacía", () => {
    expect(() => buildContext("   ", CORPUS)).toThrow();
  });
});
