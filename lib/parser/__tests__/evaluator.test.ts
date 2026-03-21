import { describe, it, expect } from "vitest";
import { parse } from "../index";

describe("variables", () => {
  it("sustituye una variable simple", () => {
    expect(parse("Hola ${ @nombre }", { nombre: "Alberto" })).toBe("Hola Alberto");
  });

  it("sustituye una variable anidada", () => {
    expect(parse("${ @cliente.nombre }", { cliente: { nombre: "Ana" } })).toBe("Ana");
  });

  it("variable no definida → cadena vacía", () => {
    expect(parse("${ @inexistente }")).toBe("");
  });

  it("${ set } muta la variable y se usa después", () => {
    const out = parse("${ set @x = 42 }Valor: ${ @x }");
    expect(out).toBe("Valor: 42");
  });
});

describe("for loop", () => {
  it("itera una lista de objetos", () => {
    const out = parse(
      "${ for item in @items }${ item.nombre } ${ end }",
      { items: [{ nombre: "A" }, { nombre: "B" }, { nombre: "C" }] },
    );
    expect(out).toBe("A B C ");
  });

  it("respeta el separator", () => {
    const out = parse(
      "${ for item in @items separator=, }${ item.nombre }${ end }",
      { items: [{ nombre: "X" }, { nombre: "Y" }] },
    );
    expect(out).toBe("X,Y");
  });

  it("lista vacía no emite nada", () => {
    const out = parse("${ for item in @items }x${ end }", { items: [] });
    expect(out).toBe("");
  });

  it("genera filas de tabla Markdown sin líneas en blanco entre ellas", () => {
    const src = [
      "${ for item in @items }",
      "| ${ item.nombre } | ${ item.precio } |",
      "${ end }",
    ].join("\n");
    const out = parse(src, { items: [{ nombre: "A", precio: "10" }, { nombre: "B", precio: "20" }] });
    // No debe haber \n\n entre filas
    expect(out).not.toContain("\n\n");
    expect(out).toContain("| A | 10 |");
    expect(out).toContain("| B | 20 |");
  });
});

describe("if / else if / else", () => {
  it("rama if verdadera", () => {
    const out = parse(
      "${ if @tipo is vip }\nthen VIP\n${ end }",
      { tipo: "vip" },
    );
    expect(out.trim()).toBe("VIP");
  });

  it("rama else cuando la condición no se cumple", () => {
    const out = parse(
      "${ if @tipo is vip }\nthen VIP\n${ else }\nthen Normal\n${ end }",
      { tipo: "normal" },
    );
    expect(out.trim()).toBe("Normal");
  });

  it("else if selecciona la rama correcta", () => {
    const src = [
      "${ if @tipo is vip }",
      "then VIP",
      "${ else if @tipo is premium }",
      "then Premium",
      "${ else }",
      "then Básico",
      "${ end }",
    ].join("\n");

    expect(parse(src, { tipo: "premium" }).trim()).toBe("Premium");
    expect(parse(src, { tipo: "otro" }).trim()).toBe("Básico");
  });

  it("is not invierte la condición", () => {
    const out = parse(
      "${ if @activo is not false }\nthen Activo\n${ end }",
      { activo: "true" },
    );
    expect(out.trim()).toBe("Activo");
  });

  it("if inline con then/else y strings", () => {
    expect(parse('${ if @tipo is vip then "VIP" else "Normal" }', { tipo: "vip" })).toBe("VIP");
    expect(parse('${ if @tipo is vip then "VIP" else "Normal" }', { tipo: "otro" })).toBe("Normal");
  });

  it("if inline solo then (sin else)", () => {
    expect(parse('${ if @tipo is vip then "VIP" }', { tipo: "vip" })).toBe("VIP");
    expect(parse('${ if @tipo is vip then "VIP" }', { tipo: "otro" })).toBe("");
  });

  it("if inline con variables", () => {
    const ctx = { tipo: "vip", saludo: "Hola VIP", despedida: "Adiós" };
    expect(parse("${ if @tipo is vip then @saludo else @despedida }", ctx)).toBe("Hola VIP");
    expect(parse("${ if @tipo is normal then @saludo else @despedida }", ctx)).toBe("Adiós");
  });

  it("if inline con is not", () => {
    expect(parse('${ if @activo is not false then "Sí" else "No" }', { activo: "true" })).toBe("Sí");
  });
});

describe("data block inline", () => {
  it("parsea datos inline y los usa como variables", () => {
    const src = [
      "${ data }",
      "nombre = Carlos",
      "edad = 30",
      "${ end data }",
      "${ @nombre } tiene ${ @edad } años",
    ].join("\n");
    expect(parse(src).trim()).toBe("Carlos tiene 30 años");
  });

  it("parsea lista inline y la itera", () => {
    const src = [
      "${ data }",
      "items props(nombre) = [",
      "  Uno",
      "  Dos",
      "]",
      "${ end data }",
      "${ for i in @items }${ i.nombre } ${ end }",
    ].join("\n");
    expect(parse(src).trim()).toBe("Uno Dos");
  });

  it("parsea lista de objetos con múltiples props", () => {
    const src = [
      "${ data }",
      "clients props(nombre, rango) = [",
      "  Alberto, free",
      "  Yaiza, premium",
      "]",
      "${ end data }",
      "${ @clients.1.nombre } es ${ @clients.1.rango }",
    ].join("\n");
    expect(parse(src).trim()).toBe("Alberto es free");
  });

  it("parsea lista de primitivos", () => {
    const src = [
      "${ data }",
      "tags = [",
      "  web",
      "  design",
      "  seo",
      "]",
      "${ end data }",
      "${ for t in @tags }${ t }${ end }",
    ].join("\n");
    expect(parse(src).trim()).toBe("webdesignseo");
  });
});

describe("ctx no se muta", () => {
  it("set no modifica el objeto original", () => {
    const ctx = { x: "1" };
    parse("${ set @x = 99 }", ctx);
    expect(ctx.x).toBe("1");
  });

  it("data inline no modifica el objeto original", () => {
    const ctx = { nombre: "Original" };
    parse("${ data }\nnombre = Nuevo\n${ end data }", ctx);
    expect(ctx.nombre).toBe("Original");
  });
});

describe("comentarios", () => {
  it("los comentarios no emiten nada", () => {
    expect(parse("antes ${ // esto es un comentario } después")).toBe("antes  después");
  });
});
