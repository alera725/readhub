import { fetchWithTimeout } from "@readhub/shared";
import {
  LLM_DEFAULT_MAX_TOKENS,
  LLM_DEFAULT_TEMPERATURE,
  LLM_DEFAULT_TIMEOUT_MS,
  type LlmProvider,
} from "./provider";

// Implementación de LlmProvider sobre Hugging Face Inference Providers.
//
// Usa el router de HF, que es COMPATIBLE con la API de chat completions de
// OpenAI: POST https://router.huggingface.co/v1/chat/completions con el system
// como primer mensaje de rol "system". El router enruta al proveedor que sirve
// el modelo (Groq, Novita, Together…). Se puede fijar un proveedor concreto
// añadiendo un sufijo al id, p. ej. "meta-llama/Llama-3.3-70B-Instruct:groq".
//
// Todos los detalles del proveedor viven aquí. Server-only: requiere HF_TOKEN.

const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = process.env.HF_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct";

interface OpenAIChatResponse {
  model?: string;
  choices?: {
    message?: { content?: string };
    finish_reason?: string | null;
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function createHuggingFaceProvider(): LlmProvider {
  return {
    name: "huggingface",
    async complete({ system, messages, maxTokens, temperature }) {
      const token = process.env.HF_TOKEN;
      if (!token) {
        throw new Error("createHuggingFaceProvider: falta HF_TOKEN.");
      }

      // El endpoint compatible con OpenAI espera el system dentro de `messages`.
      const chatMessages = [{ role: "system", content: system }, ...messages];

      const response = await fetchWithTimeout(
        HF_ROUTER_URL,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            max_tokens: maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
            temperature: temperature ?? LLM_DEFAULT_TEMPERATURE,
            messages: chatMessages,
          }),
        },
        LLM_DEFAULT_TIMEOUT_MS
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `createHuggingFaceProvider: el router respondió ${response.status}. ${detail}`.trim()
        );
      }

      const data = (await response.json()) as OpenAIChatResponse;
      const choice = data.choices?.[0];
      const text = choice?.message?.content ?? "";

      return {
        text,
        model: data.model ?? DEFAULT_MODEL,
        stopReason: choice?.finish_reason ?? null,
        usage: {
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
        },
      };
    },
  };
}
