/**
 * Strips the leading "@" and returns the root key from a dotted path.
 *
 * "@cliente.nombre" → "cliente"
 * "@lineas.1.nombre" → "lineas"
 * "item.prop" → "item"
 */
export function rootFromPath(path: string): string {
  return path.replace(/^@/, "").split(".")[0];
}

/**
 * Strips the leading "@" and splits a dotted path into segments.
 *
 * "@cliente.nombre" → ["cliente", "nombre"]
 * "item" → ["item"]
 */
export function splitPath(path: string): string[] {
  return path.replace(/^@/, "").split(".");
}

/**
 * Returns true if the path references an external variable (starts with @).
 */
export function isExternal(path: string): boolean {
  return path.startsWith("@");
}
