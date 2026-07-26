"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { useUpload } from "@/hooks/useUpload";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
} from "@readhub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FormField } from "@/components/forms/form-field";
import { FileDropInput } from "@/components/forms/file-drop-input";
import { Spinner } from "@/components/ui/spinner";

// Tras publicar, se muestra la confirmación brevemente antes de redirigir
// a la página principal, donde el nuevo artículo ya aparece en el listado
// (Flujo 6).
const SUCCESS_REDIRECT_DELAY_MS = 1200;

// El atributo accept del selector nativo: se combinan las extensiones
// visibles con los MIME types validados en useUpload (single source of
// truth en lib/constants).
const DOCUMENT_ACCEPT = [".txt", ".pdf", ".docx", ...ALLOWED_DOCUMENT_MIME_TYPES].join(",");
const IMAGE_ACCEPT = ALLOWED_IMAGE_MIME_TYPES.join(",");

export default function UploadPage() {
  const router = useRouter();
  const { publish, isSubmitting, error, fieldErrors } = useUpload();

  const [title, setTitle] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!published) return;

    const timeout = setTimeout(() => {
      router.push("/");
      // Invalida la Router Cache para que el listado del Home vuelva a
      // consultarse y muestre el artículo recién publicado.
      router.refresh();
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [published, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const success = await publish({ title, document, image });
    if (success) {
      setPublished(true);
    }
  }

  function handleCancel() {
    router.push("/");
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Publicar artículo</CardTitle>
          <CardDescription>
            Comparte un artículo con la comunidad de ReadHub.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-5">
            {error ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>No se pudo publicar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {published ? (
              <Alert>
                <CheckCircle2 />
                <AlertTitle>¡Artículo publicado!</AlertTitle>
                <AlertDescription>
                  Redirigiendo a la página principal...
                </AlertDescription>
              </Alert>
            ) : null}

            {!published ? (
              <>
                <FormField
                  label="Título"
                  htmlFor="title"
                  required
                  error={fieldErrors.title}
                >
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.title)}
                  />
                </FormField>

                <FileDropInput
                  label="Documento"
                  accept={DOCUMENT_ACCEPT}
                  hint="Formatos permitidos: TXT, DOCX o PDF."
                  file={document}
                  onFileSelect={setDocument}
                  disabled={isSubmitting}
                  error={fieldErrors.document}
                />

                <FileDropInput
                  label="Imagen de portada"
                  accept={IMAGE_ACCEPT}
                  hint="Formatos permitidos: JPG, PNG, WEBP o GIF."
                  file={image}
                  onFileSelect={setImage}
                  disabled={isSubmitting}
                  error={fieldErrors.image}
                />
              </>
            ) : null}
          </CardContent>

          {!published ? (
            <CardFooter className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="gap-1.5" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : null}
                Publicar
              </Button>
            </CardFooter>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
