// Refleja la tabla `articles`.
export interface Article {
  id: string;
  author_id: string;
  title: string;
  summary: string | null;
  document_path: string | null;
  image_path: string | null;
  created_at: string;
  is_public: boolean;
}

// Refleja la tabla `views` (un evento por visualización, sin contador).
export interface ArticleView {
  id: string;
  article_id: string;
  user_id: string | null;
  viewed_at: string;
}

// Refleja la tabla `likes`.
export interface ArticleLike {
  id: string;
  article_id: string;
  user_id: string;
  created_at: string;
}

// Refleja la tabla `favorites`.
export interface ArticleFavorite {
  id: string;
  article_id: string;
  user_id: string;
  created_at: string;
}
