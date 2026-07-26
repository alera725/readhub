import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Helpers compartidos por las Tools para dar forma a los resultados MCP de
// manera consistente. No contienen lógica de negocio.

// Resultado exitoso: los datos se devuelven como texto JSON (formato compatible
// con cualquier cliente MCP).
export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

// Resultado de texto plano.
export function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

// Error de la Tool: se devuelve en el resultado (isError) en vez de lanzar, según
// las buenas prácticas del SDK, para que el cliente/modelo pueda reaccionar.
export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

// Envuelve el handler de una Tool: ejecuta la lógica y traduce cualquier
// excepción (p. ej. falta de configuración de Supabase/IA) en un errorResult.
export async function runTool(
  fn: () => Promise<CallToolResult>
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (error) {
    return errorResult(
      error instanceof Error ? error.message : "Error desconocido en la Tool."
    );
  }
}
