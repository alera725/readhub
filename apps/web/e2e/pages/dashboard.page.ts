import { type Page, type Locator, expect } from "@playwright/test";

// Page Object del Dashboard (post-login): navbar, info del usuario, navegación
// principal y cierre de sesión.
export class DashboardPage {
  readonly page: Page;
  readonly navbar: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navbar = page.getByRole("banner"); // el <header> del layout
    this.logoutButton = this.navbar.getByRole("button", { name: "Cerrar sesión" });
  }

  // Confirma que se llegó al dashboard y que la info del usuario está cargada.
  async expectLoaded(userEmail: string): Promise<void> {
    await this.page.waitForURL((url) => url.pathname === "/");
    await expect(this.navbar).toBeVisible();
    await expect(this.navbar.getByText(userEmail)).toBeVisible();
  }

  // Ítem de navegación por su nombre accesible. Es robusto al rol: los ítems
  // del navbar son componentes base-ui renderizados como enlaces, que exponen
  // rol "button" o "link" según la variante.
  navItem(name: string): Locator {
    return this.navbar
      .getByRole("button", { name })
      .or(this.navbar.getByRole("link", { name }));
  }

  // Verifica que la navegación principal esté disponible.
  async expectNavigationAvailable(): Promise<void> {
    await expect(this.navItem("Inicio")).toBeVisible();
    await expect(this.navItem("Cargar artículo")).toBeVisible();
    await expect(this.navItem("Asistente")).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
