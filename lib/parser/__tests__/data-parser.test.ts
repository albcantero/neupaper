import { describe, it, expect } from "vitest";
import { parseData } from "../data-parser";

describe("key = value", () => {
  it("parsea un par clave-valor simple", () => {
    const result = parseData("nombre = Alberto");
    expect(result).toEqual({ nombre: "Alberto" });
  });

  it("parsea múltiples pares", () => {
    const result = parseData("nombre = Alberto\nedad = 30");
    expect(result).toEqual({ nombre: "Alberto", edad: "30" });
  });

  it("valor vacío", () => {
    const result = parseData("nombre = ");
    expect(result).toEqual({ nombre: "" });
  });

  it("valor con espacios", () => {
    const result = parseData("nombre = Juan Carlos");
    expect(result).toEqual({ nombre: "Juan Carlos" });
  });

  it("valor con = dentro", () => {
    const result = parseData("formula = E = mc2");
    expect(result).toEqual({ formula: "E = mc2" });
  });

  it("ignora líneas vacías", () => {
    const result = parseData("\n\nnombre = Alberto\n\n");
    expect(result).toEqual({ nombre: "Alberto" });
  });
});

describe("nested keys (dot notation)", () => {
  it("parsea clave anidada", () => {
    const result = parseData("cliente.nombre = Ana");
    expect(result).toEqual({ cliente: { nombre: "Ana" } });
  });

  it("parsea múltiples claves anidadas en el mismo objeto", () => {
    const result = parseData("cliente.nombre = Ana\ncliente.email = ana@test.com");
    expect(result).toEqual({ cliente: { nombre: "Ana", email: "ana@test.com" } });
  });

  it("parsea claves profundamente anidadas", () => {
    const result = parseData("a.b.c = deep");
    expect(result).toEqual({ a: { b: { c: "deep" } } });
  });
});

describe("lists with props", () => {
  it("parsea lista de objetos", () => {
    const result = parseData("items props(nombre, precio) = [\n  Logo, 500\n  Web, 1200\n]");
    expect(result.items).toEqual([
      { nombre: "Logo", precio: "500" },
      { nombre: "Web", precio: "1200" },
    ]);
  });

  it("lista vacía", () => {
    const result = parseData("items props(nombre) = [\n]");
    expect(result.items).toEqual([]);
  });

  it("valores con comillas preservan comas", () => {
    const result = parseData('items props(nombre, precio) = [\n  "Smith, Jr.", 500\n]');
    expect(result.items).toEqual([
      { nombre: "Smith, Jr.", precio: "500" },
    ]);
  });

  it("más valores que props rellenan con vacío", () => {
    const result = parseData("items props(a, b, c) = [\n  uno, dos\n]");
    expect(result.items).toEqual([
      { a: "uno", b: "dos", c: "" },
    ]);
  });

  it("más props que valores los rellena con vacío", () => {
    const result = parseData("items props(a, b) = [\n  solo\n]");
    expect(result.items).toEqual([
      { a: "solo", b: "" },
    ]);
  });
});

describe("primitive lists", () => {
  it("parsea lista de primitivos", () => {
    const result = parseData("tags = [\n  web\n  design\n  seo\n]");
    expect(result.tags).toEqual(["web", "design", "seo"]);
  });

  it("lista de primitivos vacía", () => {
    const result = parseData("tags = [\n]");
    expect(result.tags).toEqual([]);
  });
});

describe("mixed content", () => {
  it("parsea datos mixtos (kv + listas)", () => {
    const raw = [
      "titulo = Factura",
      "cliente.nombre = Acme",
      "items props(nombre, precio) = [",
      "  Logo, 500",
      "  Web, 1200",
      "]",
      "nota = Gracias",
    ].join("\n");
    const result = parseData(raw);
    expect(result.titulo).toBe("Factura");
    expect(result.cliente).toEqual({ nombre: "Acme" });
    expect(result.items).toEqual([
      { nombre: "Logo", precio: "500" },
      { nombre: "Web", precio: "1200" },
    ]);
    expect(result.nota).toBe("Gracias");
  });
});

describe("edge cases", () => {
  it("input vacío devuelve objeto vacío", () => {
    expect(parseData("")).toEqual({});
  });

  it("solo whitespace devuelve objeto vacío", () => {
    expect(parseData("   \n  \n  ")).toEqual({});
  });

  it("línea sin = se ignora", () => {
    const result = parseData("esto no tiene igual\nnombre = OK");
    expect(result).toEqual({ nombre: "OK" });
  });

  it("sobrescribe clave duplicada con la última", () => {
    const result = parseData("x = primero\nx = segundo");
    expect(result.x).toBe("segundo");
  });
});
