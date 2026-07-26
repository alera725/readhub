import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paquetes internos del monorepo que exportan TypeScript fuente (sin build
  // step): Next los transpila al construir la app. Incluye @readhub/ai aunque
  // sea dependencia transitiva (vía @readhub/rag), porque igual entra al bundle.
  transpilePackages: [
    "@readhub/types",
    "@readhub/shared",
    "@readhub/ai",
    "@readhub/database",
    "@readhub/rag",
  ],
};

export default nextConfig;
