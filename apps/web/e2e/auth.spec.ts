import { test, expect } from "./utils/test";
import { testUser } from "./data/users";

// Flujo principal de autenticación de ReadHub, simulando a un usuario real.
test.describe("Autenticación", () => {
  test("login con credenciales válidas, dashboard y logout", async ({
    page,
    loginPage,
    dashboardPage,
  }) => {
    // DIAGNÓSTICO TEMPORAL: instrumenta window.fetch para ver los argumentos
    // exactos en el momento del fallo "Failed to execute 'fetch' on 'Window':
    // Invalid value", reproducible solo en GitHub Actions. Se revierte apenas
    // se identifique la causa.
    page.on("console", (msg) => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    });
    await page.addInitScript(() => {
      const orig = window.fetch;
      window.fetch = function (...args: Parameters<typeof fetch>) {
        try {
          const [input, init] = args;
          const headerEntries = init?.headers
            ? Object.entries(init.headers as Record<string, unknown>).map(
                ([k, v]) => `${k}=${typeof v}:${JSON.stringify(v)}`
              )
            : [];
          console.log(
            `[fetch-debug] url=${String(input)} method=${init?.method ?? "GET"} signal=${typeof init?.signal} headers=[${headerEntries.join(", ")}]`
          );
        } catch (e) {
          console.log(`[fetch-debug] logging failed: ${String(e)}`);
        }
        return orig.apply(this, args);
      };
    });

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
