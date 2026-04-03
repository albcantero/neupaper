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

describe("linter — inline if no genera falso positivo", () => {
  it("if inline con then/else no reporta bloque sin cerrar", () => {
    const d = lint('${ if @tipo is vip then "VIP" else "Normal" }');
    expect(d.filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("if inline solo then (sin else) no reporta bloque sin cerrar", () => {
    const d = lint('${ if @tipo is vip then "VIP" }');
    expect(d.filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("if bloque SIN then sí necesita ${ end }", () => {
    const d = lint("${ if @x is vip }\nthen Hola");
    expect(d.some((d) => d.severity === "error" && d.message.includes("if"))).toBe(true);
  });
});

describe("linter — create/end <X>", () => {
  it("create + end <X> correcto no da error", () => {
    const src = '${ create <Saludo> props(nombre) }\n${ get nombre }\n${ end <Saludo> }';
    expect(lint(src).filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("end <X> sin create da error", () => {
    const d = lint("${ end <Saludo> }");
    expect(d.some((d) => d.severity === "error" && d.message.includes("create"))).toBe(true);
  });

  it("get con prop no declarada da warning", () => {
    const src = '${ create <Saludo> props(nombre) }\n${ get cargo }\n${ end <Saludo> }';
    const warnings = lint(src).filter((d) => d.severity === "warning");
    expect(warnings.some((d) => d.message.includes("cargo"))).toBe(true);
  });

  it("get fuera de componente da warning", () => {
    const d = lint("${ get nombre }");
    expect(d.some((d) => d.severity === "warning" && d.message.includes("fuera"))).toBe(true);
  });
});

describe("linter — open/close", () => {
  it("open + close correcto no da error", () => {
    const src = "${ open <Table> }\ncontenido\n${ close <Table> }";
    expect(lint(src).filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("close sin open da error", () => {
    const d = lint("${ close <Table> }");
    expect(d.some((d) => d.severity === "error" && d.message.includes("open"))).toBe(true);
  });
});

describe("linter — document (silently ignored)", () => {
  it("document + end document correcto no da error", () => {
    const src = "${ document }\ncontenido\n${ end document }";
    expect(lint(src).filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("end document sin document da error", () => {
    const d = lint("${ end document }");
    expect(d.some((d) => d.severity === "error" && d.message.includes("document"))).toBe(true);
  });

  it("document without end document does NOT produce error", () => {
    const src = "${ document }\ncontenido";
    expect(lint(src).filter((d) => d.severity === "error")).toHaveLength(0);
  });

  it("content without document wrapper produces no error", () => {
    const src = "# Title\n${ @variable }\n${ for item in @list }${ item }${ end }";
    // Only warnings (undefined vars), no structural errors
    expect(lint(src).filter((d) => d.severity === "error")).toHaveLength(0);
  });
});

describe("linter — import y componentes", () => {
  it("componente sin import da error", () => {
    const d = lint("${ <Saludo nombre=Juan> }");
    expect(d.some((d) => d.severity === "error" && d.message.includes("import"))).toBe(true);
  });

  it("componente con import no da error", () => {
    const src = "${ import <Saludo> }\n${ <Saludo nombre=Juan> }";
    expect(lint(src).filter((d) => d.severity === "error")).toHaveLength(0);
  });
});

describe("linter — load collisions", () => {
  it("dos loads con misma variable da warning", () => {
    const dataFiles = {
      "a.data": "nombre = X",
      "b.data": "nombre = Y",
    };
    const src = "${ load a.data }\n${ load b.data }";
    const warnings = lint(src, dataFiles).filter((d) => d.severity === "warning");
    expect(warnings.some((d) => d.message.includes("nombre") && d.message.includes("sobreescribe"))).toBe(true);
  });

  it("dos loads sin colisión no da warning", () => {
    const dataFiles = {
      "a.data": "nombre = X",
      "b.data": "email = Y",
    };
    const src = "${ load a.data }\n${ load b.data }";
    expect(lint(src, dataFiles).filter((d) => d.severity === "warning")).toHaveLength(0);
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
