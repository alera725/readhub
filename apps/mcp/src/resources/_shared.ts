import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

// Da forma a los contenidos de un Resource como JSON, de manera consistente.
// No contiene lógica de negocio.
export function jsonContents(uri: URL, data: unknown): ReadResourceResult {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
