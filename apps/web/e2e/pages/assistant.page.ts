import { type Page, type Locator, expect } from "@playwright/test";

// Page Object del Asistente RAG (Flujo 9). El ciclo pregunta→respuesta puede
// tardar varios segundos (embedding + búsqueda + LLM real), por eso `ask`
// usa un timeout generoso al esperar que el input vuelva a habilitarse.
export class AssistantPage {
  readonly page: Page;
  readonly questionInput: Locator;
  readonly sendButton: Locator;
  readonly errorAlert: Locator;
  readonly sourcesLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.questionInput = page.getByLabel("Escribe tu pregunta");
    this.sendButton = page.getByRole("button", { name: "Enviar pregunta" });
    // Acotado por texto: Next.js también renderiza su propio
    // `role="alert"` ambiental (route announcer de accesibilidad), que un
    // selector genérico por rol matchearía de más.
    this.errorAlert = page
      .getByRole("alert")
      .filter({ hasText: "No se pudo responder" });
    this.sourcesLabel = page.getByText(/^Fuentes \(\d+\)$/);
  }

  async goto(): Promise<void> {
    await this.page.goto("/assistant");
  }

  async ask(query: string): Promise<void> {
    await this.questionInput.fill(query);
    await this.sendButton.click();
  }

  // Espera el ciclo completo (embedding + búsqueda + LLM real: puede tardar
  // varios segundos) hasta que aparezcan las fuentes, y confirma que no hubo
  // error en el camino.
  async expectAnsweredWithSources(): Promise<void> {
    await expect(this.sourcesLabel).toBeVisible({ timeout: 45_000 });
    await expect(this.errorAlert).toBeHidden();
  }
}
