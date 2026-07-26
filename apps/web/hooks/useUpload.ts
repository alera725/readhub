"use client";

import { useCallback, useState } from "react";

import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
} from "@readhub/shared";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@readhub/database";
import { createArticle } from "@readhub/database";
import {
  uploadArticleDocument,
  uploadArticleImage,
} from "@readhub/database";

export interface UploadArticleInput {
  title: string;
  document: File | null;
  image: File | null;
}

export interface UploadFieldErrors {
  title?: string;
  document?: string;
  image?: string;
}

interface UseUploadResult {
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: UploadFieldErrors;
  publish: (input: UploadArticleInput) => Promise<boolean>;
}

// Flujo 6: validaciones antes de publicar. Si falla alguna, el formulario
// (fuera del alcance de este hook) debe permanecer abierto mostrando estos
// mensajes.
function validate(input: UploadArticleInput): UploadFieldErrors {
  const errors: UploadFieldErrors = {};

  if (!input.title.trim()) {
    errors.title = "El título no puede estar vacío.";
  }

  if (!input.document) {
    errors.document = "Debes seleccionar un documento.";
  } else if (
    !ALLOWED_DOCUMENT_MIME_TYPES.includes(
      input.document.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]
    )
  ) {
    errors.document = "El documento debe tener formato TXT, DOCX o PDF.";
  }

  if (!input.image) {
    errors.image = "Debes seleccionar una imagen de portada.";
  } else if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      input.image.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
    )
  ) {
    errors.image = "La imagen debe ser un archivo válido (JPG, PNG, WEBP o GIF).";
  }

  return errors;
}

export function useUpload(): UseUploadResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UploadFieldErrors>({});

  const publish = useCallback(
    async (input: UploadArticleInput): Promise<boolean> => {
      setError(null);

      const errors = validate(input);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        return false;
      }

      setIsSubmitting(true);

      try {
        const supabase = createClient();
        const currentUser = await getCurrentUser(supabase);
        if (!currentUser) {
          throw new Error("Debes iniciar sesión para publicar un artículo.");
        }

        // Se genera el id del artículo antes de subir los archivos: la
        // convención de rutas de Storage es {uid}/{article_id}/... y las
        // políticas de storage.objects deben poder resolver el article_id
        // desde la ruta (para SELECT público) incluso antes de que exista
        // la fila en articles — el INSERT de Storage solo exige que el
        // primer segmento de carpeta sea el propio usuario.
        const articleId = crypto.randomUUID();

        const [documentPath, imagePath] = await Promise.all([
          uploadArticleDocument(supabase, {
            userId: currentUser.id,
            articleId,
            file: input.document as File,
          }),
          uploadArticleImage(supabase, {
            userId: currentUser.id,
            articleId,
            file: input.image as File,
          }),
        ]);

        await createArticle(supabase, {
          id: articleId,
          author_id: currentUser.id,
          title: input.title.trim(),
          document_path: documentPath,
          image_path: imagePath,
          is_public: true,
        });

        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo publicar el artículo."
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { isSubmitting, error, fieldErrors, publish };
}
