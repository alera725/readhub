import { describe, it, expect } from "vitest";
import { cn, getInitials, formatDate, formatDateTime } from "./index";

describe("cn — combinación de clases", () => {
  it("une clases y resuelve conflictos de Tailwind (gana la última)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("ignora valores falsy", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});

describe("getInitials", () => {
  it("toma las iniciales de las dos primeras palabras", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
  });
  it("funciona con un solo nombre", () => {
    expect(getInitials("juan")).toBe("J");
  });
  it("caso límite: cadena vacía", () => {
    expect(getInitials("")).toBe("");
  });
});

describe("formatDate / formatDateTime", () => {
  it("formatea una fecha larga en español", () => {
    const s = formatDate(new Date(2026, 5, 8)); // 8 de junio de 2026 (hora local)
    expect(s).toContain("junio");
    expect(s).toContain("2026");
  });
  it("acepta también una fecha en string", () => {
    expect(formatDate("2026-06-08")).toContain("2026");
  });
  it("formatDateTime incluye la hora", () => {
    const s = formatDateTime(new Date(2026, 5, 8, 21, 3));
    expect(s).toContain("2026");
    expect(s).toMatch(/\d{1,2}:\d{2}/);
  });
});
