// fetch con timeout (AbortController). Acota el tiempo de las llamadas a
// proveedores externos (OpenAI, Hugging Face): ante un cuelgue del proveedor, la
// operación falla de forma controlada en vez de bloquear la request de forma
// indefinida. No altera el camino normal: con timeouts holgados, las llamadas
// que responden a tiempo se comportan igual que antes.
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`La solicitud excedió el tiempo límite (${timeoutMs} ms).`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
