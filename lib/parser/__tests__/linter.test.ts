import { describe, it, expect } from "vitest";
import { lint } from "../linter";

describe("linter — bloques sin cerrar", () => {
  it("sin errores en fuente limpia", () => {
    expect(lint("# Título\nTexto normal")).toHaveLength(0);
  });

  it("detecta ${ for } sin ${ end }", () => {
    const errors = lint("${ for item in @lista }\n${ item.nombre }").filter((d) => d.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/for/);
  });

  it("detecta ${ if } sin ${ end }", () => {
    const d = lint("${ if @x is vip }\nthen Hola");
    expect(d.some((d) => d.severity === "error" && d.message.includes("if"))).toBe(true);
  });

  it("detecta ${ end } sin bloque que cerrar", () => {
    const d = lint("${ end }");
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe("error");
    expect(d[0].message).toMatch(/sin bloque/);
  });

  it("detecta ${ else } sin ${ if } previo", () => {
    const d = lint("${ else }");
    expect(d.some((d) => d.message.includes("else"))).toBe(true);
  });

  it("for anidado correcto no da error", () => {
    const src = [
      "${ for a in @lista }",
      "  ${ for b in @sublista }",
      "  ${ end }",
      "${ end }",
    ].join("\n");
    expect(lint(src).filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("detecta ${ sin } de cierre", () => {
    const d = lint("texto ${ sin cierre");
    expect(d.some((d) => d.severity === "error")).toBe(true);
  });
});

describe("linter — corchetes en data", () => {
  it("lista bien cerrada no da error", () => {
    const src = [
      "${ data }",
      "items props(nombre) = [",
      "  A",
      "]",
      "${ end data }",
    ].join("\n");
    expect(lint(src).filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("detecta [ sin ]", () => {
    const src = [
      "${ data }",
      "items = [",
      "  A",
      "${ end data }",
    ].join("\n");
    const errors = lint(src).filter((d) => d.severity === "error");
    expect(errors.some((d) => d.message.includes("["))).toBe(true);
  });

  it("detecta ] sin [", () => {
    const src = [
      "${ data }",
      "items = A",
      "]",
      "${ end data }",
    ].join("\n");
    const errors = lint(src).filter((d) => d.severity === "error");
    expect(errors.some((d) => d.message.includes("]"))).toBe(true);
  });
});

describe("linter — variables no definidas", () => {
  it("variable definida en data no da warning", () => {
    const src = [
      "${ data }",
      "nombre = Carlos",
      "${ end data }",
      "${ @nombre }",
    ].join("\n");
    expect(lint(src).filter((d) => d.severity === "warning")).toHaveLength(0);
  });

  it("variable no definida da warning", () => {
    const d = lint("${ @inexistente }");
    expect(d.some((d) => d.severity === "warning" && d.message.includes("inexistente"))).toBe(true);
  });

  it("variable de bucle local no da warning dentro del for", () => {
    const src = [
      "${ data }",
      "items props(nombre) = [",
      "  A",
      "]",
      "${ end data }",
      "${ for item in @items }${ item.nombre }${ end }",
    ].join("\n");
    expect(lint(src).filter((d) => d.severity === "warning")).toHaveLength(0);
  });
});
