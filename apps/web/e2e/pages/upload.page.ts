import { type Page, type Locator, expect } from "@playwright/test";

// 1x1 PNG transparente — suficiente para pasar la validación de tipo del
// formulario y quedar almacenado como una imagen real y válida.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export interface PublishInput {
  title: string;
  documentText?: string;
}

// Page Object de la pantalla de publicación (Flujo 6). El input real de
// cada FileDropInput queda oculto (`sr-only`) sin `<label for>` asociado,
// así que se referencian por orden de aparición en el formulario
// (Documento primero, Imagen después) en vez de por rol/label.
export class UploadPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly documentInput: Locator;
  readonly imageInput: Locator;
  readonly submitButton: Locator;
  readonly successAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByLabel("Título");
    this.documentInput = page.locator('input[type="file"]').nth(0);
    this.imageInput = page.locator('input[type="file"]').nth(1);
    this.submitButton = page.getByRole("button", { name: "Publicar" });
    this.successAlert = page.getByText("¡Artículo publicado!");
  }

  async goto(): Promise<void> {
    await this.page.goto("/upload");
  }

  // Completa el formulario con un documento .txt y una imagen válidos, y
  // publica. No espera la redirección: el caller decide qué esperar después.
  async publish({ title, documentText = "Contenido de prueba E2E." }: PublishInput): Promise<void> {
    await this.titleInput.fill(title);
    await this.documentInput.setInputFiles({
      name: "articulo-e2e.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(documentText, "utf-8"),
    });
    await this.imageInput.setInputFiles({
      name: "portada-e2e.png",
      mimeType: "image/png",
      buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
    });
    await this.submitButton.click();
  }

  async expectPublished(): Promise<void> {
    await expect(this.successAlert).toBeVisible();
  }
}
