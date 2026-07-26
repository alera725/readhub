import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getReadHubServices } from "./context.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

// Identidad del servidor (name/version) que se anuncia en el handshake MCP.
export const SERVER_INFO = {
  name: "readhub-mcp",
  version: "0.1.0",
} as const;

// Inicializa el servidor MCP de ReadHub y cablea sus puntos de extensión.
// Los servicios compartidos del monorepo se resuelven y quedan disponibles para
// las futuras Tools/Resources/Prompts, sin duplicar lógica. En esta fase los
// registros están vacíos (no se registra ninguna capacidad) y no se accede a
// Supabase.
export function createServer(): McpServer {
  const server = new McpServer(SERVER_INFO);

  const services = getReadHubServices();
  registerTools(server, services);
  registerResources(server, services);
  registerPrompts(server, services);

  return server;
}
