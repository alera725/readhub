"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useArticle } from "@/hooks/useArticles";
import { useComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { ArticleContent } from "@/components/articles/article-content";
import { DocumentViewer } from "@/components/articles/document-viewer";
import { LikeButton } from "@/components/articles/like-button";
import { CommentForm } from "@/components/comments/comment-form";
import { CommentList } from "@/components/comments/comment-list";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const { id } = use(params);

  const { article, stats, imageUrl, documentUrl, loading, error } =
    useArticle(id);
  const {
    comments,
    loading: commentsLoading,
    isSubmitting: isSubmittingComment,
    addComment,
  } = useComments(id);
  const { liked, likesCount, isToggling, toggleLike } = useLikes(id);

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      className="w-fit gap-1.5"
      nativeButton={false}
      render={<Link href="/" />}
    >
      <ArrowLeft className="size-4" />
      Volver al inicio
    </Button>
  );

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {backButton}
        <LoadingState message="Cargando artículo..." />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {backButton}
        <ErrorState
          title="No se pudo cargar el artículo"
          description={error ?? "El artículo no existe o no está disponible."}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {backButton}

      <ArticleContent
        title={article.title}
        summary={article.summary}
        coverImageUrl={imageUrl}
        authorName={stats?.authorEmail ?? "Autor desconocido"}
        publishedAt={article.created_at}
        viewsCount={stats?.viewsCount ?? 0}
        likesCount={likesCount}
        commentsCount={comments.length}
        className="mx-0 w-full max-w-none"
      >
        {documentUrl ? (
          <DocumentViewer documentUrl={documentUrl} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Este artículo no tiene un documento adjunto.
          </p>
        )}
      </ArticleContent>

      <LikeButton
        liked={liked}
        likesCount={likesCount}
        onToggle={toggleLike}
        disabled={isToggling}
        className="self-start"
      />

      <Separator />

      <div className="flex flex-col gap-6">
        <h2 className="text-xl">Comentarios</h2>

        <CommentForm onSubmit={addComment} isSubmitting={isSubmittingComment} />

        {commentsLoading ? (
          <LoadingState message="Cargando comentarios..." />
        ) : (
          <CommentList
            comments={comments.map((comment) => ({
              id: comment.id,
              authorName: comment.author_email ?? "Autor desconocido",
              createdAt: comment.created_at,
              content: comment.comment,
            }))}
          />
        )}
      </div>
    </div>
  );
}
