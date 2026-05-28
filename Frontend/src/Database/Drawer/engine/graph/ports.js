// Creates a stable key for a port reference.
export function portRefKey(ref) {
  if (!ref?.itemId || !ref?.portId) return "";

  return `${ref.itemId}:${ref.portId}`;
}

// Checks if two port references point to the same port.
export function isSamePortRef(a, b) {
  return Boolean(a?.itemId && a?.portId && a.itemId === b?.itemId && a.portId === b?.portId);
}

// Lists drawing items in render/state order.
export function selectItemsArray(state) {
  return (state?.itemIds || []).map((id) => state.itemsById?.[id]).filter(Boolean);
}

// Returns the world point for one item port.
function getPortPoint(item, port) {
  if (item.type === "elbow" && (port.id === "in" || port.id === "a") && item.trimBefore) return item.trimBefore;
  if (item.type === "elbow" && (port.id === "out" || port.id === "b") && item.trimAfter) return item.trimAfter;
  if (item.type === "reducer" && (port.id === "in" || port.id === "a") && item.p0) return item.p0;
  if (item.type === "reducer" && (port.id === "out" || port.id === "b") && item.p1) return item.p1;

  return {
    x: port.x,
    y: port.y,
  };
}

// Returns world-space ports for one item.
export function getWorldPortsForItem(item) {
  if (!item?.id || !item.ports) return [];

  return Object.values(item.ports)
    .filter((port) => port?.id)
    .map((port) => {
      const point = getPortPoint(item, port);

      return {
        itemId: item.id,
        portId: port.id,
        port: {
          ...port,
          x: point.x,
          y: point.y,
        },
        point,
      };
    });
}

// Lists every port on one item with its item reference.
export function listItemPorts(item) {
  return getWorldPortsForItem(item);
}

// Builds a set containing connected port keys.
export function getConnectedPortKeys(drawingState) {
  const keys = new Set();

  for (const connectionId of drawingState?.connectionIds || []) {
    const connection = drawingState.connectionsById?.[connectionId];

    if (connection?.a) keys.add(portRefKey(connection.a));
    if (connection?.b) keys.add(portRefKey(connection.b));
  }

  return keys;
}

// Checks if a port is already connected.
export function isPortConnected(state, portRef) {
  return getConnectedPortKeys(state).has(portRefKey(portRef));
}

// Selects every world-space port.
export function selectWorldPorts(state) {
  return selectItemsArray(state).flatMap(getWorldPortsForItem);
}

// Lists ports that are not connected yet.
export function selectOpenPorts(state) {
  const connectedKeys = getConnectedPortKeys(state);

  return selectWorldPorts(state).filter((entry) => !connectedKeys.has(portRefKey(entry)));
}

// Backward-compatible open port helper.
export function listOpenPorts(state) {
  return selectOpenPorts(state);
}
