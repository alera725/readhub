import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@readhub/types";

type Client = SupabaseClient<Database>;

export type ArticleComment =
  Database["public"]["Functions"]["get_article_comments"]["Returns"][number];

// Hilo de comentarios de un artículo con el email de cada autor ya
// resuelto (ver supabase/migrations/20260703121800_public_listing_functions.sql).
export async function getArticleComments(
  supabase: Client,
  articleId: string
): Promise<ArticleComment[]> {
  const { data, error } = await supabase.rpc("get_article_comments", {
    target_article_id: articleId,
  });

  if (error) throw error;
  return data ?? [];
}

export interface CreateCommentInput {
  article_id: string;
  user_id: string;
  comment: string;
}

export async function createComment(
  supabase: Client,
  input: CreateCommentInput
): Promise<void> {
  const { error } = await supabase.from("comments").insert({
    article_id: input.article_id,
    user_id: input.user_id,
    comment: input.comment,
  });

  if (error) throw error;
}
