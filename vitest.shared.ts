import { defineConfig } from "vitest/config";

// Base compartida para las pruebas unitarias de los paquetes y servicios del
// monorepo (entorno Node). Cada workspace la reutiliza desde su propio
// vitest.config.ts. Los globs de `include` son relativos al workspace donde se
// ejecuta Vitest, por lo que la misma base sirve para todos.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    // Todavía no hay tests (se agregan en la siguiente fase): no fallar por eso.
    passWithNoTests: true,
    server: {
      deps: {
        // Transpila los paquetes internos del monorepo (TypeScript fuente).
        inline: [/^@readhub\//],
      },
    },
  },
});
