import type { DataObject, DataValue } from "./evaluator";

/**
 * Parses the .data / inline ${ data } format into a DataObject.
 *
 * Supported syntax:
 *   key = value
 *   parent.child = value
 *
 *   key props(p1, p2) = [      → list of objects
 *     Alberto, free
 *     Yaiza, premium
 *   ]
 *
 *   key = [                    → list of primitives
 *     web
 *     design
 *   ]
 *
 * Access is 1-indexed: @key.1.p1
 */
/**
 * Splits a comma-separated line respecting quoted strings.
 * Unquoted values take only the first word.
 * "Smith, Jr.", 500  →  ["Smith, Jr.", "500"]
 * Alberto, free      →  ["Alberto", "free"]
 * hello world, 5     →  ["hello", "5"]  (unquoted: first word only)
 */
function smartSplit(line: string): string[] {
  const values: string[] = [];
  let i = 0;

  while (i < line.length) {
    // Skip whitespace
    while (i < line.length && line[i] === " ") i++;
    if (i >= line.length) break;

    if (line[i] === '"') {
      // Quoted value — read until closing quote
      i++; // skip opening "
      const start = i;
      while (i < line.length && line[i] !== '"') i++;
      values.push(line.slice(start, i));
      i++; // skip closing "
      // Skip to next comma
      while (i < line.length && line[i] !== ",") i++;
      i++; // skip comma
    } else {
      // Unquoted — read until comma, take first word only
      const start = i;
      while (i < line.length && line[i] !== ",") i++;
      const raw = line.slice(start, i).trim();
      values.push(raw);
      i++; // skip comma
    }
  }

  return values;
}

export function parseData(raw: string): DataObject {
  const result: DataObject = {};
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // key props(p1, p2) = [   or   key = [
    const listMatch = line.match(/^([\w.]+)(?:\s+props\(([^)]+)\))?\s*=\s*\[$/);
    if (listMatch) {
      const key = listMatch[1];
      const props = listMatch[2]
        ? listMatch[2].split(",").map((p) => p.trim())
        : null;
      const arr: DataValue[] = [];
      i++;
      while (i < lines.length && lines[i] !== "]") {
        const itemLine = lines[i];
        if (props) {
          // Object item: zip values with prop names
          const values = smartSplit(itemLine);
          const obj: DataObject = {};
          for (let p = 0; p < props.length; p++) {
            obj[props[p]] = values[p] ?? "";
          }
          arr.push(obj);
        } else {
          // Primitive item
          arr.push(itemLine);
        }
        i++;
      }
      setNestedKey(result, key, arr);
      i++; // skip "]"
      continue;
    }

    // key = value  or  parent.child = value
    const kvMatch = line.match(/^([\w.]+)\s*=\s*(.*)$/);
    if (kvMatch) {
      setNestedKey(result, kvMatch[1], kvMatch[2].trim());
    }

    i++;
  }

  return result;
}

function setNestedKey(obj: DataObject, path: string, value: DataValue): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cur) || typeof cur[parts[i]] !== "object") {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]] as DataObject;
  }
  cur[parts[parts.length - 1]] = value;
}
