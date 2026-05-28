import { distance } from "../geometry/vector.js";
import { portRefKey } from "../graph/ports.js";

// Checks optional pipe compatibility fields for snapping.
function matchesPort(candidate, match) {
  if (!match) return true;

  if (match.dn != null && candidate.port?.dn !== match.dn) return false;
  if (match.color != null && candidate.port?.color !== match.color) return false;
  if (match.systemTypeId != null && candidate.port?.systemTypeId !== match.systemTypeId) return false;

  return true;
}

// Returns nearest open-port snap or free point.
export function querySnap(index, point, tolerancePx, { excludeRefs = [], match = null } = {}) {
  if (!point) return { kind: "free", point, target: null };

  const excluded = new Set(excludeRefs.map(portRefKey).filter(Boolean));
  let best = null;

  for (const entry of index?.openPorts || []) {
    if (excluded.has(portRefKey(entry))) continue;
    if (!matchesPort(entry, match)) continue;

    const d = distance(point, entry.point);

    if (d <= tolerancePx && (!best || d < best.distancePx)) {
      best = {
        kind: "openPort",
        point: entry.point,
        target: {
          itemId: entry.itemId,
          portId: entry.portId,
        },
        port: entry.port,
        distancePx: d,
      };
    }
  }

  return best || { kind: "free", point, target: null };
}

// Backward-compatible nearest-port query.
export function queryNearestPortSnap({ snapIndex, point, radiusPx, excludeRefs = [], match = null }) {
  const snap = querySnap(snapIndex, point, radiusPx, { excludeRefs, match });

  if (snap.kind !== "openPort") return null;

  return {
    type: "port",
    itemId: snap.target.itemId,
    portId: snap.target.portId,
    port: snap.port,
    point: snap.point,
    radiusPx,
    distancePx: snap.distancePx,
  };
}
