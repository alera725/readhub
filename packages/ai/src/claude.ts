import { fetchWithTimeout } from "@readhub/shared";
import {
  LLM_DEFAULT_MAX_TOKENS,
  LLM_DEFAULT_TEMPERATURE,
  LLM_DEFAULT_TIMEOUT_MS,
  type LlmProvider,
} from "./provider";

// Implementación de LlmProvider sobre la API de Mensajes de Anthropic (Claude).
//
// Se usa `fetch` directo (sin SDK) para mantener mínimas las dependencias y
// coherencia con embedding.service. TODOS los detalles del proveedor viven
// aquí: endpoint, cabeceras, forma del payload y del response. Server-only:
// requiere ANTHROPIC_API_KEY (sin prefijo NEXT_PUBLIC_).

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

interface AnthropicResponse {
  model?: string;
  stop_reason?: string | null;
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function createClaudeProvider(): LlmProvider {
  return {
    name: "anthropic",
    async complete({ system, messages, maxTokens, temperature }) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("createClaudeProvider: falta ANTHROPIC_API_KEY.");
      }

      const response = await fetchWithTimeout(
        ANTHROPIC_URL,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": ANTHROPIC_VERSION,
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            max_tokens: maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
            temperature: temperature ?? LLM_DEFAULT_TEMPERATURE,
            system,
            messages,
          }),
        },
        LLM_DEFAULT_TIMEOUT_MS
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`createClaudeProvider: Claude respondió ${response.status}. ${detail}`.trim());
      }

      const data = (await response.json()) as AnthropicResponse;
      const text = Array.isArray(data.content)
        ? data.content
            .filter((block) => block.type === "text" && typeof block.text === "string")
            .map((block) => block.text)
            .join("")
        : "";

      return {
        text,
        model: data.model ?? DEFAULT_MODEL,
        stopReason: data.stop_reason ?? null,
        usage: {
          inputTokens: data.usage?.input_tokens,
          outputTokens: data.usage?.output_tokens,
        },
      };
    },
  };
}
