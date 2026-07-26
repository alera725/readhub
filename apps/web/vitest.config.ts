import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Configuración de Vitest para la app web (Next.js + React).
// Entorno jsdom para hooks/componentes; el alias `@/*` se resuelve desde
// tsconfig. Los Route Handlers (server) pueden fijar entorno Node por archivo
// con el docblock `// @vitest-environment node`.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "hooks/**/*.{test,spec}.{ts,tsx}",
      "components/**/*.{test,spec}.{ts,tsx}",
      "lib/**/*.{test,spec}.{ts,tsx}",
      "app/**/*.{test,spec}.{ts,tsx}",
    ],
    // Todavía no hay tests (se agregan en la siguiente fase).
    passWithNoTests: true,
    server: {
      deps: {
        // Transpila los paquetes internos del monorepo (TypeScript fuente).
        inline: [/^@readhub\//],
      },
    },
  },
});
