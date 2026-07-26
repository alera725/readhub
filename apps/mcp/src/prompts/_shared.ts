import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import type { ReadHubServices } from "../context.js";

// Construye el resultado de un Prompt/Skill a partir de un único mensaje de
// usuario. La Skill devuelve el mensaje predefinido; el modelo del cliente MCP
// es quien lo ejecuta (la Skill no llama al LLM).
export function userText(text: string): GetPromptResult {
  return {
    messages: [{ role: "user", content: { type: "text", text } }],
  };
}

// Trae un artículo y lo formatea como bloque de texto para incrustarlo en una
// Skill. Reutiliza database.getArticleById (la MISMA consulta que la Tool
// get_article): no se duplica lógica.
export async function articleBlock(
  services: ReadHubServices,
  id: string
): Promise<string> {
  const article = await services.database.getArticleById(
    services.getSupabase(),
    id
  );
  if (!article) {
    return `«No se encontró ningún artículo con el ID ${id}.»`;
  }
  return [
    `Título: ${article.title}`,
    `Resumen: ${article.summary ?? "(sin resumen)"}`,
    `ID: ${article.id}`,
    article.document_path
      ? `Documento (en Storage): ${article.document_path}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
