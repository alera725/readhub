// Abstracción del proveedor de IA (RAG, fase 8).
//
// El resto de la app NO conoce a Claude: depende solo de esta interfaz. Así el
// proveedor se puede sustituir (OpenAI, Gemini, un modelo local…) implementando
// LlmProvider, sin tocar chat.service ni nada aguas arriba.

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmCompletionRequest {
  system: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface LlmUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmCompletionResult {
  text: string;
  model: string;
  stopReason?: string | null;
  usage?: LlmUsage;
}

export interface LlmProvider {
  readonly name: string;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

// Defaults compartidos por todas las implementaciones (evita duplicarlos en
// cada proveedor). Temperatura baja: respuestas fundamentadas, no creativas.
export const LLM_DEFAULT_MAX_TOKENS = 1024;
export const LLM_DEFAULT_TEMPERATURE = 0.2;
export const LLM_DEFAULT_TIMEOUT_MS = 30_000;
