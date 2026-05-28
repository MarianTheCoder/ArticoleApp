import { createId } from "../ids.js";
import { isSamePortRef } from "./ports.js";

// Creates one explicit port-to-port connection.
export function createConnection({ a, b }) {
  if (!a?.itemId || !a?.portId) return null;
  if (!b?.itemId || !b?.portId) return null;
  if (isSamePortRef(a, b)) return null;

  return {
    id: createId("conn"),
    a: {
      itemId: a.itemId,
      portId: a.portId,
    },
    b: {
      itemId: b.itemId,
      portId: b.portId,
    },
  };
}
