import { type Page, type Locator, expect } from "@playwright/test";
import type { TestUser } from "../data/users";

// Page Object de la pantalla de Login: encapsula selectores y acciones.
// Usa selectores accesibles (label/rol), no de implementación.
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Correo electrónico");
    this.passwordInput = page.getByLabel("Contraseña");
    this.submitButton = page.getByRole("button", { name: "Iniciar sesión" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async expectVisible(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
    await expect(this.emailInput).toBeVisible();
  }

  async login(user: TestUser): Promise<void> {
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.submitButton.click();
  }
}
