import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit } from "./rate-limit";

// El estado (`buckets`) es un singleton del módulo; se usan claves distintas por
// test para no contaminar entre casos.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit — comportamiento esperado", () => {
  it("permite hasta el límite y bloquea el siguiente", () => {
    const key = "user-allow";
    let last;
    for (let i = 0; i < 5; i++) last = rateLimit(key, 5, 60_000);
    expect(last!.success).toBe(true);
    expect(last!.remaining).toBe(0);

    const blocked = rateLimit(key, 5, 60_000);
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("aísla el conteo por clave", () => {
    for (let i = 0; i < 5; i++) rateLimit("user-a", 5, 60_000);
    const other = rateLimit("user-b", 5, 60_000);
    expect(other.success).toBe(true);
  });
});

describe("rateLimit — casos límite", () => {
  it("reinicia la ventana al vencer el tiempo", () => {
    const key = "user-reset";
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 1_000);
    expect(rateLimit(key, 5, 1_000).success).toBe(false);

    vi.advanceTimersByTime(1_100); // vence la ventana
    expect(rateLimit(key, 5, 1_000).success).toBe(true);
  });
});
