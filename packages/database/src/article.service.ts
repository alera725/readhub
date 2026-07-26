import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@readhub/types";

type Client = SupabaseClient<Database>;
type ArticleRow = Tables<"articles">;

export type PublicArticle =
  Database["public"]["Functions"]["get_public_articles"]["Returns"][number];

// Listado de artículos públicos con email del autor y conteo de
// likes/views ya resueltos en una sola consulta (ver
// supabase/migrations/20260703121800_public_listing_functions.sql).
export async function getPublicArticles(supabase: Client): Promise<PublicArticle[]> {
  const { data, error } = await supabase.rpc("get_public_articles");

  if (error) throw error;
  return data ?? [];
}

export async function getArticleById(
  supabase: Client,
  articleId: string
): Promise<ArticleRow | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export interface ArticleStats {
  authorEmail: string | null;
  likesCount: number;
  viewsCount: number;
}

// Para la vista de un artículo individual (a diferencia del listado, que
// usa get_public_articles en una sola llamada).
export async function getArticleStats(
  supabase: Client,
  articleId: string
): Promise<ArticleStats> {
  const [authorEmailResult, likesResult, viewsResult] = await Promise.all([
    supabase.rpc("get_article_author_email", { target_article_id: articleId }),
    supabase.rpc("get_article_likes_count", { target_article_id: articleId }),
    supabase.rpc("get_article_views_count", { target_article_id: articleId }),
  ]);

  if (authorEmailResult.error) throw authorEmailResult.error;
  if (likesResult.error) throw likesResult.error;
  if (viewsResult.error) throw viewsResult.error;

  return {
    authorEmail: authorEmailResult.data,
    likesCount: likesResult.data ?? 0,
    viewsCount: viewsResult.data ?? 0,
  };
}

export interface CreateArticleInput {
  id?: string;
  author_id: string;
  title: string;
  summary?: string | null;
  document_path?: string | null;
  image_path?: string | null;
  is_public?: boolean;
}

export async function createArticle(
  supabase: Client,
  input: CreateArticleInput
): Promise<ArticleRow> {
  const { data, error } = await supabase
    .from("articles")
    .insert({
      id: input.id,
      author_id: input.author_id,
      title: input.title,
      summary: input.summary ?? null,
      document_path: input.document_path ?? null,
      image_path: input.image_path ?? null,
      is_public: input.is_public ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordArticleView(
  supabase: Client,
  articleId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("views")
    .insert({ article_id: articleId, user_id: userId });

  if (error) throw error;
}

export async function getOwnLike(
  supabase: Client,
  articleId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("article_id", articleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function likeArticle(
  supabase: Client,
  articleId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("likes")
    .insert({ article_id: articleId, user_id: userId });

  if (error) throw error;
}

export async function unlikeArticle(
  supabase: Client,
  articleId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("article_id", articleId)
    .eq("user_id", userId);

  if (error) throw error;
}
