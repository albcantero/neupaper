import { describe, it, expect } from "vitest";
import { tokenize } from "../tokenizer";

describe("tokenizer", () => {
  it("emite solo texto cuando no hay islas", () => {
    const tokens = tokenize("Hola mundo");
    expect(tokens).toEqual([{ type: "text", value: "Hola mundo" }]);
  });

  it("separa texto e isla correctamente", () => {
    const tokens = tokenize("Hola ${ @nombre }, buenas.");
    expect(tokens).toEqual([
      { type: "text",  value: "Hola " },
      { type: "isle",  body: "@nombre" },
      { type: "text",  value: ", buenas." },
    ]);
  });

  it("trimea el body de la isla", () => {
    const tokens = tokenize("${   @x   }");
    expect(tokens).toEqual([{ type: "isle", body: "@x" }]);
  });

  it("no confunde LaTeX $x$ con una isla", () => {
    const tokens = tokenize("$E = mc^2$ y ${ @var }");
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ type: "text", value: "$E = mc^2$ y " });
    expect(tokens[1]).toEqual({ type: "isle", body: "@var" });
  });

  it("emite como texto un ${ sin cerrar", () => {
    const tokens = tokenize("texto ${ sin cierre");
    expect(tokens).toEqual([
      { type: "text", value: "texto " },
      { type: "text", value: "${ sin cierre" },
    ]);
  });

  it("maneja varias islas seguidas", () => {
    const tokens = tokenize("${ a }${ b }${ c }");
    expect(tokens).toEqual([
      { type: "isle", body: "a" },
      { type: "isle", body: "b" },
      { type: "isle", body: "c" },
    ]);
  });

  it("fuente vacía devuelve array vacío", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("isla al inicio del source", () => {
    const tokens = tokenize("${ @x } texto");
    expect(tokens[0]).toEqual({ type: "isle", body: "@x" });
    expect(tokens[1]).toEqual({ type: "text", value: " texto" });
  });

  it("isla al final del source", () => {
    const tokens = tokenize("texto ${ @x }");
    expect(tokens[0]).toEqual({ type: "text", value: "texto " });
    expect(tokens[1]).toEqual({ type: "isle", body: "@x" });
  });
});
