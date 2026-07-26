/**
 * Backfill de embeddings (operación de un solo uso).
 *
 * Recorre los artículos existentes y genera/persiste su embedding reutilizando
 * embeddingService.embedArticle — NO añade lógica nueva. Sirve para poblar la
 * base vectorial de artículos publicados antes de existir la infraestructura
 * RAG (o cuando la auto-indexación por webhook no está activa).
 *
 * Uso (carga las variables de .env.local sin dependencias extra):
 *   npx tsx --env-file=.env.local scripts/backfill-embeddings.ts
 *
 * Requiere: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, OPENAI_API_KEY.
 */
import { createAdminClient } from "@readhub/database";
import { embedArticle } from "@readhub/rag";

async function main() {
  const admin = createAdminClient();

  const { data: articles, error } = await admin
    .from("articles")
    .select("id, title, summary, document_path");

  if (error) throw error;
  if (!articles || articles.length === 0) {
    console.log("No hay artículos para indexar.");
    return;
  }

  console.log(`Indexando ${articles.length} artículo(s)…\n`);
  let indexed = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of articles) {
    const label = `${article.id}  ${(article.title ?? "").slice(0, 40)}`;
    try {
      let result;
      try {
        // Intento con contenido (extrae el .txt de Storage si existe).
        result = await embedArticle(admin, { article });
      } catch {
        // Fallback: documento inexistente/no extraíble → título + resumen.
        result = await embedArticle(admin, { article, fetchContent: false });
      }
      indexed++;
      console.log(`  ✓ ${label}  (${result.dimensions}d, usedContent=${result.usedContent})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Un artículo sin texto vectorizable no es un error del proceso.
      if (message.includes("no tiene texto vectorizable")) {
        skipped++;
        console.log(`  – ${label}  (sin texto vectorizable, omitido)`);
      } else {
        failed++;
        console.error(`  ✗ ${label}  → ${message}`);
      }
    }
  }

  const { count } = await admin
    .from("article_embeddings")
    .select("*", { count: "exact", head: true });

  console.log(
    `\nResumen: ${indexed} indexados, ${skipped} omitidos, ${failed} fallidos.` +
      `\nEmbeddings en la base: ${count ?? "?"}.`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Backfill abortado:", err instanceof Error ? err.message : err);
  process.exit(1);
});
