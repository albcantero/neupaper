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
          const values = itemLine.split(",").map((v) => v.trim());
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
