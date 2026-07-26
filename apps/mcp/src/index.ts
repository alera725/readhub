#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

// Punto de entrada del servidor MCP de ReadHub.
// Crea el servidor y lo conecta al transporte STDIO. No implementa lógica de
// negocio ni accede a Supabase todavía.
async function main(): Promise<void> {
  const server = createServer();

  // Transporte STDIO: el protocolo MCP viaja por stdin/stdout (JSON-RPC).
  // IMPORTANTE: nada debe escribirse en stdout salvo el propio protocolo;
  // los logs van a stderr para no corromper el canal.
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[readhub-mcp] servidor iniciado sobre STDIO");
}

main().catch((error) => {
  console.error("[readhub-mcp] error fatal al iniciar:", error);
  process.exit(1);
});
