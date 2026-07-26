// @readhub/rag — pipeline de Recuperación Aumentada por Generación.
// Reutiliza @readhub/ai (LLM), @readhub/shared y @readhub/types. Los servicios
// reciben el cliente Supabase como parámetro; consumibles por la app web y por
// un futuro servidor MCP sin duplicar lógica.
export * from "./embedding.service";
export * from "./indexing.service";
export * from "./vector-search.service";
export * from "./context-builder.service";
export * from "./chat.service";
