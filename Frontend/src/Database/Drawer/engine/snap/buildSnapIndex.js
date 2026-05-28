import { selectOpenPorts } from "../graph/selectors.js";

// Builds a simple snap index from open ports.
export function buildSnapIndex(state) {
  return {
    openPorts: selectOpenPorts(state).filter((entry) => Number.isFinite(entry.point.x) && Number.isFinite(entry.point.y)),
  };
}
