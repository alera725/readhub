import { test, expect } from "./utils/test";
import { testUser } from "./data/users";

// Flujo principal de autenticación de ReadHub, simulando a un usuario real.
test.describe("Autenticación", () => {
  test("login con credenciales válidas, dashboard y logout", async ({
    page,
    loginPage,
    dashboardPage,
  }) => {
    // 1. Abrir la aplicación: una ruta protegida redirige al Login.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await loginPage.expectVisible();

    // 2-4. Ingresar credenciales válidas y autenticarse.
    await loginPage.login(testUser);

    // 5-6. Redirección al Dashboard e info del usuario cargada.
    await dashboardPage.expectLoaded(testUser.email);

    // 7. Navegación principal disponible.
    await dashboardPage.expectNavigationAvailable();

    // 8-9. Cerrar sesión y comprobar el regreso al Login.
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/login/);
    await loginPage.expectVisible();
  });
});
