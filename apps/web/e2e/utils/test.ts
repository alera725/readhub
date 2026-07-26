import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

// Extiende el `test` base con fixtures que inyectan los Page Objects.
// Así las specs quedan enfocadas en la lógica del flujo, reutilizando los POM.
type Pages = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

// El segundo argumento del fixture (el "use" de Playwright) se renombra a
// `provide` para evitar un falso positivo de la regla react-hooks/rules-of-hooks
// de ESLint, que confunde `use(...)` con el hook `use` de React. Es solo el
// nombre del callback; no cambia el comportamiento.
export const test = base.extend<Pages>({
  loginPage: async ({ page }, provide) => {
    await provide(new LoginPage(page));
  },
  dashboardPage: async ({ page }, provide) => {
    await provide(new DashboardPage(page));
  },
});

export { expect } from "@playwright/test";
