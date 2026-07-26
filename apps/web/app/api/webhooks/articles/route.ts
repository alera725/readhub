import { NextResponse } from "next/server";
import { createAdminClient } from "@readhub/database";
import {
  indexArticleChange,
  type ArticleChangeType,
} from "@readhub/rag";

// Receptor del Database Webhook de Supabase sobre la tabla `articles`.
//
// Es el disparador de la indexación automática: Postgres emite un webhook en
// cada INSERT/UPDATE/DELETE (ver supabase/webhooks.sql) y aquí se ejecuta el
// pipeline reutilizando services/. NO es una API REST para el frontend: es un
// endpoint interno máquina-a-máquina, autenticado por secreto compartido.
//
// runtime nodejs: la indexación usa service_role, `node:crypto` y llamadas al
// proveedor de embeddings — nada de esto puede correr en el Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Forma del payload que envía un Database Webhook de Supabase.
interface SupabaseWebhookPayload {
  type: ArticleChangeType;
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

function asArticle(row: Record<string, unknown> | null) {
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    title: typeof row.title === "string" ? row.title : "",
    summary: typeof row.summary === "string" ? row.summary : null,
    document_path:
      typeof row.document_path === "string" ? row.document_path : null,
  };
}

export async function POST(request: Request) {
  // Autenticación: el webhook debe presentar el secreto compartido. Sin él no
  // se procesa nada (este endpoint dispara gasto en el proveedor y escribe con
  // service_role).
  const expectedSecret = process.env.ARTICLE_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("[webhook/articles] falta ARTICLE_WEBHOOK_SECRET en el servidor.");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }
  if (request.headers.get("x-webhook-secret") !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: SupabaseWebhookPayload;
  try {
    payload = (await request.json()) as SupabaseWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (payload.table !== "articles") {
    return NextResponse.json({ skipped: "not the articles table" }, { status: 200 });
  }

  // En DELETE el artículo llega en old_record; en INSERT/UPDATE en record.
  const row = payload.type === "DELETE" ? payload.old_record : payload.record;
  const article = asArticle(row);
  if (!article) {
    return NextResponse.json({ error: "missing article id" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const result = await indexArticleChange(admin, {
      type: payload.type,
      article,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Se responde 5xx a propósito: Supabase reintenta los webhooks ante
    // respuestas no-2xx, y el pipeline es idempotente (UPSERT + hash), así
    // que reintentar es seguro.
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`[webhook/articles] fallo indexando ${article.id}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
