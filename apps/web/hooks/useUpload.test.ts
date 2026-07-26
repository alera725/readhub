import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Se mockean los límites externos (Supabase y los services de datos); las
// constantes de validación (@readhub/shared) se usan reales.
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn(() => ({})) }));
vi.mock("@readhub/database", () => ({
  getCurrentUser: vi.fn(),
  createArticle: vi.fn(),
  uploadArticleDocument: vi.fn(),
  uploadArticleImage: vi.fn(),
}));

import { useUpload } from "./useUpload";
import {
  getCurrentUser,
  createArticle,
  uploadArticleDocument,
  uploadArticleImage,
} from "@readhub/database";

const validDoc = () => new File(["x"], "doc.txt", { type: "text/plain" });
const validImg = () => new File(["x"], "cover.png", { type: "image/png" });

async function publish(hook: ReturnType<typeof renderHook<ReturnType<typeof useUpload>, unknown>>, input: Parameters<ReturnType<typeof useUpload>["publish"]>[0]) {
  let ok = false;
  await act(async () => {
    ok = await hook.result.current.publish(input);
  });
  return ok;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1" } as never);
  vi.mocked(uploadArticleDocument).mockResolvedValue("u1/art/document.txt");
  vi.mocked(uploadArticleImage).mockResolvedValue("u1/art/cover.png");
  vi.mocked(createArticle).mockResolvedValue({ id: "art" } as never);
});

describe("useUpload — validación (entradas inválidas)", () => {
  it("título vacío: no publica y marca el error", async () => {
    const hook = renderHook(() => useUpload());
    const ok = await publish(hook, { title: "  ", document: validDoc(), image: validImg() });
    expect(ok).toBe(false);
    expect(hook.result.current.fieldErrors.title).toBeTruthy();
    expect(createArticle).not.toHaveBeenCalled();
  });

  it("documento faltante o con formato inválido", async () => {
    const hook = renderHook(() => useUpload());
    let ok = await publish(hook, { title: "T", document: null, image: validImg() });
    expect(ok).toBe(false);
    expect(hook.result.current.fieldErrors.document).toBeTruthy();

    ok = await publish(hook, { title: "T", document: new File(["x"], "a.zip", { type: "application/zip" }), image: validImg() });
    expect(ok).toBe(false);
    expect(hook.result.current.fieldErrors.document).toBeTruthy();
  });

  it("imagen faltante o con formato inválido", async () => {
    const hook = renderHook(() => useUpload());
    const ok = await publish(hook, { title: "T", document: validDoc(), image: new File(["x"], "a.txt", { type: "text/plain" }) });
    expect(ok).toBe(false);
    expect(hook.result.current.fieldErrors.image).toBeTruthy();
  });
});

describe("useUpload — comportamiento esperado y manejo de errores", () => {
  it("con entradas válidas publica y llama a los services", async () => {
    const hook = renderHook(() => useUpload());
    const ok = await publish(hook, { title: "Título válido", document: validDoc(), image: validImg() });
    expect(ok).toBe(true);
    expect(uploadArticleDocument).toHaveBeenCalledOnce();
    expect(uploadArticleImage).toHaveBeenCalledOnce();
    expect(createArticle).toHaveBeenCalledOnce();
    expect(hook.result.current.fieldErrors).toEqual({});
  });

  it("sin sesión: no publica y expone el error", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    const hook = renderHook(() => useUpload());
    const ok = await publish(hook, { title: "T", document: validDoc(), image: validImg() });
    expect(ok).toBe(false);
    expect(hook.result.current.error).toBeTruthy();
    expect(createArticle).not.toHaveBeenCalled();
  });

  it("si el service falla, publish devuelve false y setea error", async () => {
    vi.mocked(createArticle).mockRejectedValue(new Error("insert falló"));
    const hook = renderHook(() => useUpload());
    const ok = await publish(hook, { title: "T", document: validDoc(), image: validImg() });
    expect(ok).toBe(false);
    expect(hook.result.current.error).toBeTruthy();
  });
});
