import { defineConfig, devices } from "@playwright/test";

// Configuración E2E de ReadHub (app web Next.js).
// - Local: reutiliza un dev server si ya está corriendo; si no, lo levanta.
// - CI/CD: se detecta con la env `CI` (reintentos, 1 worker, sin `test.only`).
// - Permite apuntar a un entorno desplegado con PLAYWRIGHT_BASE_URL.

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // En CI: falla si quedó un test.only y reintenta los flaky.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  // Reportes: HTML (navegable) + list en consola.
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],
  outputDir: "test-results",

  use: {
    baseURL,
    // Screenshots y videos SOLO ante fallos; traza en el primer reintento.
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Firefox/WebKit/mobile se pueden habilitar cuando se necesiten.
  ],

  // Arranca la app web para las pruebas. Local reutiliza un server existente;
  // en CI siempre lo levanta fresco. (Para un server tipo producción en CI,
  // se puede cambiar a "npm run build && npm run start".)
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
