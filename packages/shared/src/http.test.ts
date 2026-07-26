import { describe, it, expect, afterEach, vi } from "vitest";
import { fetchWithTimeout } from "./http";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("fetchWithTimeout — comportamiento esperado", () => {
  it("devuelve la respuesta cuando el fetch resuelve a tiempo", async () => {
    const response = { ok: true, status: 200 } as Response;
    globalThis.fetch = vi.fn(async () => response) as unknown as typeof fetch;
    const r = await fetchWithTimeout("https://x.test", {}, 1_000);
    expect(r).toBe(response);
  });
});

describe("fetchWithTimeout — manejo de errores y casos límite", () => {
  it("lanza un error de timeout si la operación es abortada", async () => {
    // fetch que solo rechaza cuando el signal se aborta (simula un cuelgue).
    globalThis.fetch = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError"))
        );
      })) as unknown as typeof fetch;

    await expect(fetchWithTimeout("https://x.test", {}, 10)).rejects.toThrow(/tiempo límite/);
  });

  it("propaga los errores que no son de abort", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("fallo de red");
    }) as unknown as typeof fetch;
    await expect(fetchWithTimeout("https://x.test", {}, 1_000)).rejects.toThrow("fallo de red");
  });
});
