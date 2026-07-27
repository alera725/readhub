import { type Page, type Locator, expect } from "@playwright/test";

// Page Object del detalle de un artículo: like y comentarios (Flujos 7-8).
export class ArticlePage {
  readonly page: Page;
  readonly likeButton: Locator;
  readonly commentInput: Locator;
  readonly commentSubmit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.likeButton = page.getByRole("button", { name: /me gusta/i });
    this.commentInput = page.getByLabel("Nuevo comentario");
    this.commentSubmit = page.getByRole("button", { name: "Comentar" });
  }

  // Navega directo al artículo desde el listado del Home por su título
  // (más robusto que asumir una URL/id conocidos de antemano).
  async openFromHome(title: string): Promise<void> {
    await this.page.goto("/");
    await this.page.getByRole("link", { name: title }).click();
    await this.page.waitForURL(/\/article\//);
  }

  async toggleLike(): Promise<void> {
    await this.likeButton.click();
  }

  async expectLiked(count: number): Promise<void> {
    await expect(this.likeButton).toHaveAttribute("aria-pressed", "true");
    await expect(this.likeButton).toContainText(String(count));
  }

  async submitComment(content: string): Promise<void> {
    await this.commentInput.fill(content);
    await this.commentSubmit.click();
  }

  async expectCommentVisible(content: string): Promise<void> {
    await expect(this.page.getByText(content)).toBeVisible();
  }
}
