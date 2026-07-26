import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@readhub/types";

type Client = SupabaseClient<Database>;

// Bucket privado; visibilidad resuelta por las políticas de storage.objects
// (ver supabase/migrations/20260703121600_storage_media_bucket.sql).
const BUCKET = "media";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export interface UploadArticleFileInput {
  userId: string;
  articleId: string;
  file: File;
}

// Convención de rutas: {auth.uid()}/{article_id}/document.<ext> y
// {auth.uid()}/{article_id}/cover.<ext> — coincide con las políticas de
// storage.objects (primer segmento = dueño, segundo = artículo).
async function uploadArticleFile(
  supabase: Client,
  { userId, articleId, file }: UploadArticleFileInput,
  baseName: "document" | "cover"
): Promise<string> {
  const extension = getExtension(file.name);
  const path = `${userId}/${articleId}/${baseName}${extension ? `.${extension}` : ""}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) throw error;
  return path;
}

export function uploadArticleDocument(
  supabase: Client,
  input: UploadArticleFileInput
): Promise<string> {
  return uploadArticleFile(supabase, input, "document");
}

export function uploadArticleImage(
  supabase: Client,
  input: UploadArticleFileInput
): Promise<string> {
  return uploadArticleFile(supabase, input, "cover");
}

// URL firmada y temporal (no hay bucket público): funciona tanto para
// archivos propios como para archivos de artículos públicos ajenos, según
// la política "media: select own or public article".
export async function getSignedFileUrl(
  supabase: Client,
  path: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function deleteArticleFile(
  supabase: Client,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) throw error;
}
