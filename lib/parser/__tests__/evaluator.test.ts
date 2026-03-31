import { describe, it, expect } from "vitest";
import { parse } from "../index";

/** Wraps content in ${ document } ... ${ end document } */
const d = (s: string) => `\${ document }\n${s}\n\${ end document }`;
/** Wraps preamble + document content */
const pd = (preamble: string, content: string) => `${preamble}\n\${ document }\n${content}\n\${ end document }`;

describe("variables", () => {
  it("sustituye una variable simple", () => {
    expect(parse(d("Hola ${ @nombre }"), { nombre: "Alberto" }).trim()).toBe("Hola Alberto");
  });

  it("sustituye una variable anidada", () => {
    expect(parse(d("${ @cliente.nombre }"), { cliente: { nombre: "Ana" } }).trim()).toBe("Ana");
  });

  it("variable no definida → cadena vacía", () => {
    expect(parse(d("${ @inexistente }")).trim()).toBe("");
  });

  it("${ set } muta la variable y se usa después", () => {
    const out = parse(d("${ set @x = 42 }Valor: ${ @x }"));
    expect(out).toContain("Valor: 42");
  });
});

describe("for loop", () => {
  it("itera una lista de objetos", () => {
    const out = parse(
      d("${ for item in @items }${ item.nombre } ${ end }"),
      { items: [{ nombre: "A" }, { nombre: "B" }, { nombre: "C" }] },
    );
    expect(out).toContain("A B C");
  });

  it("respeta el separator", () => {
    const out = parse(
      d("${ for item in @items separator=, }${ item.nombre }${ end }"),
      { items: [{ nombre: "X" }, { nombre: "Y" }] },
    );
    expect(out).toContain("X,Y");
  });

  it("lista vacía no emite nada", () => {
    const out = parse(d("${ for item in @items }x${ end }"), { items: [] });
    expect(out.trim()).toBe("");
  });

  it("inline for con then", () => {
    const out = parse(
      d("${ for item in @items then item.nombre }"),
      { items: [{ nombre: "A" }, { nombre: "B" }, { nombre: "C" }] },
    );
    expect(out).toContain("ABC");
  });

  it("inline for con then y separator", () => {
    const out = parse(
      d('${ for item in @items then item.nombre separator=", " }'),
      { items: [{ nombre: "X" }, { nombre: "Y" }] },
    );
    expect(out).toContain("X, Y");
  });

  it("inline for con then y lista vacía", () => {
    const out = parse(
      d("${ for item in @items then item.nombre }"),
      { items: [] },
    );
    expect(out.trim()).toBe("");
  });

  it("genera filas de tabla Markdown sin líneas en blanco entre ellas", () => {
    const src = d([
      "${ for item in @items }",
      "| ${ item.nombre } | ${ item.precio } |",
      "${ end }",
    ].join("\n"));
    const out = parse(src, { items: [{ nombre: "A", precio: "10" }, { nombre: "B", precio: "20" }] });
    expect(out).toContain("| A | 10 |");
    expect(out).toContain("| B | 20 |");
  });
});

describe("if / else if / else", () => {
  it("rama if verdadera", () => {
    const out = parse(d("${ if @tipo is vip }\nVIP\n${ end }"), { tipo: "vip" });
    expect(out).toContain("VIP");
  });

  it("rama else cuando la condición no se cumple", () => {
    const out = parse(d("${ if @tipo is vip }\nVIP\n${ else }\nNormal\n${ end }"), { tipo: "normal" });
    expect(out).toContain("Normal");
  });

  it("else if selecciona la rama correcta", () => {
    const src = d([
      "${ if @tipo is vip }",
      "VIP",
      "${ else if @tipo is premium }",
      "Premium",
      "${ else }",
      "Básico",
      "${ end }",
    ].join("\n"));
    expect(parse(src, { tipo: "premium" })).toContain("Premium");
    expect(parse(src, { tipo: "otro" })).toContain("Básico");
  });

  it("is not invierte la condición", () => {
    const out = parse(d("${ if @activo is not false }\nActivo\n${ end }"), { activo: "true" });
    expect(out).toContain("Activo");
  });

  it("or combina múltiples condiciones", () => {
    const src = d('${ if @tipo is vip or @tipo is premium then "Especial" else "Normal" }');
    expect(parse(src, { tipo: "vip" })).toContain("Especial");
    expect(parse(src, { tipo: "premium" })).toContain("Especial");
    expect(parse(src, { tipo: "free" })).toContain("Normal");
  });

  it("or en bloque", () => {
    const src = d([
      "${ if @x is a or @x is b }",
      "Match",
      "${ else }",
      "No",
      "${ end }",
    ].join("\n"));
    expect(parse(src, { x: "b" })).toContain("Match");
    expect(parse(src, { x: "c" })).toContain("No");
  });

  it("if inline con then/else y strings", () => {
    expect(parse(d('${ if @tipo is vip then "VIP" else "Normal" }'), { tipo: "vip" })).toContain("VIP");
    expect(parse(d('${ if @tipo is vip then "VIP" else "Normal" }'), { tipo: "otro" })).toContain("Normal");
  });

  it("if inline solo then (sin else)", () => {
    expect(parse(d('${ if @tipo is vip then "VIP" }'), { tipo: "vip" })).toContain("VIP");
    expect(parse(d('${ if @tipo is vip then "VIP" }'), { tipo: "otro" }).trim()).toBe("");
  });

  it("if inline con variables", () => {
    const ctx = { tipo: "vip", saludo: "Hola VIP", despedida: "Adiós" };
    expect(parse(d("${ if @tipo is vip then @saludo else @despedida }"), ctx)).toContain("Hola VIP");
    expect(parse(d("${ if @tipo is normal then @saludo else @despedida }"), ctx)).toContain("Adiós");
  });

  it("if inline con is not", () => {
    expect(parse(d('${ if @activo is not false then "Sí" else "No" }'), { activo: "true" })).toContain("Sí");
  });
});

describe("data block inline", () => {
  it("parsea datos inline y los usa como variables", () => {
    const src = pd(
      "${ data }\nnombre = Carlos\nedad = 30\n${ end data }",
      "${ @nombre } tiene ${ @edad } años",
    );
    expect(parse(src)).toContain("Carlos tiene 30 años");
  });

  it("parsea lista inline y la itera", () => {
    const src = pd(
      "${ data }\nitems props(nombre) = [\n  Uno\n  Dos\n]\n${ end data }",
      "${ for i in @items }${ i.nombre } ${ end }",
    );
    expect(parse(src)).toContain("Uno Dos");
  });

  it("parsea lista de objetos con múltiples props", () => {
    const src = pd(
      "${ data }\nclients props(nombre, rango) = [\n  Alberto, free\n  Yaiza, premium\n]\n${ end data }",
      "${ @clients.1.nombre } es ${ @clients.1.rango }",
    );
    expect(parse(src)).toContain("Alberto es free");
  });

  it("parsea valores con comillas en listas", () => {
    const src = pd(
      '${ data }\nclients props(nombre, precio) = [\n  "Smith, Jr.", 500\n  Ana, 300\n]\n${ end data }',
      "${ @clients.1.nombre } - ${ @clients.1.precio }",
    );
    expect(parse(src)).toContain("Smith, Jr. - 500");
  });

  it("valores sin comillas se toman completos hasta la coma", () => {
    const src = pd(
      "${ data }\nitems props(nombre, precio) = [\n  Logo design, 500\n  Web, 1200\n]\n${ end data }",
      "${ @items.1.nombre }",
    );
    expect(parse(src)).toContain("Logo design");
  });

  it("parsea lista de primitivos", () => {
    const src = pd(
      "${ data }\ntags = [\n  web\n  design\n  seo\n]\n${ end data }",
      "${ for t in @tags }${ t }${ end }",
    );
    expect(parse(src)).toContain("webdesignseo");
  });
});

describe("ctx no se muta", () => {
  it("set no modifica el objeto original", () => {
    const ctx = { x: "1" };
    parse(d("${ set @x = 99 }"), ctx);
    expect(ctx.x).toBe("1");
  });

  it("data inline no modifica el objeto original", () => {
    const ctx = { nombre: "Original" };
    parse("${ data }\nnombre = Nuevo\n${ end data }", ctx);
    expect(ctx.nombre).toBe("Original");
  });
});

describe("document — delimita contenido renderizable", () => {
  it("solo renderiza lo que está dentro de document", () => {
    const src = [
      "Esto no se ve",
      "${ data }",
      "nombre = Alberto",
      "${ end data }",
      "${ document }",
      "Hola ${ @nombre }",
      "${ end document }",
      "Esto tampoco se ve",
    ].join("\n");
    const out = parse(src);
    expect(out).toContain("Hola Alberto");
    expect(out).not.toContain("Esto no se ve");
    expect(out).not.toContain("Esto tampoco se ve");
  });

  it("sin document, no renderiza nada", () => {
    const src = "Hola ${ @nombre }";
    const out = parse(src, { nombre: "Ana" });
    expect(out).toBe("");
  });

  it("data y load fuera de document se procesan pero no se emiten", () => {
    const dataFiles = { "test.data": "x = 42" };
    const src = pd("${ load test.data }", "Valor: ${ @x }");
    const out = parse(src, {}, {}, dataFiles);
    expect(out).toContain("Valor: 42");
    expect(out).not.toContain("load");
  });
});

describe("load — archivos .data externos", () => {
  it("carga un archivo .data y usa sus variables", () => {
    const dataFiles = { "clients.data": "nombre = Acme Corp\nemail = acme@test.com" };
    const src = pd("${ load clients.data }", "${ @nombre } - ${ @email }");
    expect(parse(src, {}, {}, dataFiles)).toContain("Acme Corp - acme@test.com");
  });

  it("carga un archivo .data con listas", () => {
    const dataFiles = { "items.data": "items props(nombre, precio) = [\n  Logo, 500\n  Web, 1200\n]" };
    const src = pd("${ load items.data }", "${ for item in @items }${ item.nombre } ${ end }");
    expect(parse(src, {}, {}, dataFiles)).toContain("Logo Web");
  });

  it("archivo .data inexistente no rompe", () => {
    const src = pd("${ load noexiste.data }", "Hola");
    expect(parse(src, {}, {}, {})).toContain("Hola");
  });
});

describe("import — declarativo", () => {
  it("import no emite nada y no rompe", () => {
    const out = parse(pd("${ import <Saludo> }", "contenido"));
    expect(out).toContain("contenido");
    expect(out).not.toContain("import");
  });
});

describe("comentarios", () => {
  it("los comentarios no emiten nada", () => {
    const out = parse(d("antes ${ // esto es un comentario } después"));
    expect(out).toContain("antes");
    expect(out).toContain("después");
    expect(out).not.toContain("comentario");
  });
});

describe("componentes", () => {
  const components = {
    Greeting: '${ create <Greeting> props(nombre, cargo) }\nHola **${ get nombre }**, ${ get cargo }.\n${ end <Greeting> }',
    Center: '${ create <Center> }\n<div style="text-align:center">\n${ get children }\n</div>\n${ end <Center> }',
    UserList: '${ create <UserList> props(list) }\n${ for item in ${ get list } }\n- ${ item.nombre }\n${ end }\n${ end <UserList> }',
  };

  it("resuelve componente simple con props", () => {
    const out = parse(pd("${ import <Greeting> }", "${ <Greeting nombre=Juan cargo=Director> }"), {}, components);
    expect(out).toContain("Hola **Juan**");
    expect(out).toContain("Director");
  });

  it("resuelve componente sin props", () => {
    const noPropsComponents = {
      Divider: '${ create <Divider> }\n<hr class="fancy">\n${ end <Divider> }',
    };
    const out = parse(pd("${ import <Divider> }", "${ <Divider> }"), {}, noPropsComponents);
    expect(out).toContain('<hr class="fancy">');
  });

  it("resuelve componente con referencia @ en props", () => {
    const ctx = { cliente: { nombre: "Ana", cargo: "CEO" } };
    const out = parse(pd("${ import <Greeting> }", "${ <Greeting nombre=@cliente.nombre cargo=@cliente.cargo> }"), ctx, components);
    expect(out).toContain("Ana");
    expect(out).toContain("CEO");
  });

  it("resuelve componente con lista via ${ get }", () => {
    const ctx = { users: [{ nombre: "A" }, { nombre: "B" }] };
    const out = parse(pd("${ import <UserList> }", "${ <UserList list=@users> }"), ctx, components);
    expect(out).toContain("- A");
    expect(out).toContain("- B");
  });

  it("open/close pasa children al componente", () => {
    const out = parse(
      pd("${ import <Center> }", "${ open <Center> }\nHello **world**\n${ close <Center> }"),
      {},
      components,
    );
    expect(out).toContain('text-align:center');
    expect(out).toContain("Hello **world**");
  });

  it("open/close evalúa Markdown Isles dentro de children", () => {
    const ctx = { items: [{ nombre: "X" }, { nombre: "Y" }] };
    const out = parse(
      pd("${ import <Center> }", "${ open <Center> }\n${ for item in @items }${ item.nombre } ${ end }\n${ close <Center> }"),
      ctx,
      components,
    );
    expect(out).toContain("X Y");
    expect(out).toContain('text-align:center');
  });

  it("componente sin import no se resuelve y se elimina del output", () => {
    const out = parse(d("${ <Greeting nombre=Juan> }"), {}, components);
    expect(out).not.toContain("<Greeting");
    expect(out).not.toContain("Hola");
  });

  it("prop no declarada en get devuelve vacío", () => {
    const out = parse(pd("${ import <Greeting> }", "${ <Greeting nombre=Juan> }"), {}, components);
    expect(out).toContain("Juan");
    expect(out).toContain(", .");  // cargo is empty
  });

  it("componentes anidados se resuelven", () => {
    const nested = {
      Badge: '${ create <Badge> props(text) }\n<span class="badge">${ get text }</span>\n${ end <Badge> }',
      Header: '${ create <Header> props(title) }\n# ${ get title }\n<Badge text=Draft>\n${ end <Header> }',
    };
    const out = parse(pd("${ import <Header> }\n${ import <Badge> }", "${ <Header title=Hello> }"), {}, nested);
    expect(out).toContain("# Hello");
    expect(out).toContain('<span class="badge">Draft</span>');
  });

  it("open/close con contenido que tiene % no rompe", () => {
    const out = parse(
      pd("${ import <Center> }", "${ open <Center> }\n100% complete\n${ close <Center> }"),
      {},
      components,
    );
    expect(out).toContain("100% complete");
  });

  it("recursión infinita entre componentes se limita", () => {
    const circular = {
      A: '${ create <A> }\n<B>\n${ end <A> }',
      B: '${ create <B> }\n<A>\n${ end <B> }',
    };
    const out = parse(pd("${ import <A> }\n${ import <B> }", "${ <A> }"), {}, circular);
    expect(typeof out).toBe("string");
  });
});
