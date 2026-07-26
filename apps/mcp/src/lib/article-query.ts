// Texto de consulta derivado de un artículo (título + resumen), usado para la
// búsqueda semántica. Centralizado aquí para no duplicarlo entre Tools y Skills.
export function articleQueryText(article: {
  title: string;
  summary: string | null;
}): string {
  return `${article.title}. ${article.summary ?? ""}`.trim();
}
