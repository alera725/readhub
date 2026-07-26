import { createHuggingFaceProvider } from "./huggingface";
import { createClaudeProvider } from "./claude";
import type { LlmProvider } from "./provider";

export type { LlmProvider, LlmCompletionRequest, LlmCompletionResult, LlmMessage } from "./provider";

// Selector del proveedor de IA por variable de entorno. Cambiar de proveedor
// no requiere tocar código: basta AI_PROVIDER. Por defecto, Hugging Face.
export function getDefaultProvider(): LlmProvider {
  const provider = (process.env.AI_PROVIDER ?? "huggingface").toLowerCase();

  switch (provider) {
    case "anthropic":
    case "claude":
      return createClaudeProvider();
    case "huggingface":
    case "hf":
    default:
      return createHuggingFaceProvider();
  }
}
