// @readhub/database — acceso a datos sobre Supabase (agnóstico de framework).
// Cliente admin (service_role) + servicios de datos. Cada servicio recibe el
// cliente Supabase como parámetro, por lo que sirve para navegador, servidor,
// middleware o un futuro servidor MCP.
export * from "./admin";
export * from "./auth.service";
export * from "./article.service";
export * from "./comment.service";
export * from "./storage.service";
