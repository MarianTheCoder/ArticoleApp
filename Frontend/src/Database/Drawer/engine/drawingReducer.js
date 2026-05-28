// Reducer for canonical CAD drawing state.
export function drawingReducer(state, action) {
  switch (action.type) {
    // Replace full drawing state.
    case "RESET_DRAWING": {
      return action.payload?.state ?? state;
    }

    // Store last clicked image coordinate.
    case "DEBUG_LAST_CLICK": {
      return {
        ...state,
        debug: {
          ...state.debug,
          lastClick: action.payload.point,
        },
      };
    }

    // Add one drawing item.
    case "ADD_ITEM": {
      const item = action.payload?.item;

      if (!item?.id) return state;
      if (state.itemsById[item.id]) return state;

      return {
        ...state,
        itemsById: {
          ...state.itemsById,
          [item.id]: item,
        },
        itemIds: [...state.itemIds, item.id],
      };
    }

    // Update one drawing item.
    case "UPDATE_ITEM": {
      const itemId = action.payload?.itemId ?? action.payload?.item?.id;
      const patch = action.payload?.patch ?? action.payload?.item;

      if (!itemId || !patch) return state;
      if (!state.itemsById[itemId]) return state;

      return {
        ...state,
        itemsById: {
          ...state.itemsById,
          [itemId]: {
            ...state.itemsById[itemId],
            ...patch,
          },
        },
      };
    }

    // Delete one item and its graph connections.
    case "DELETE_ITEM": {
      const itemId = action.payload?.itemId;

      if (!itemId || !state.itemsById[itemId]) return state;

      const nextItemsById = { ...state.itemsById };
      delete nextItemsById[itemId];

      const nextConnectionsById = {};
      const nextConnectionIds = [];

      for (const connectionId of state.connectionIds) {
        const connection = state.connectionsById[connectionId];
        const touchesItem = connection?.a?.itemId === itemId || connection?.b?.itemId === itemId;

        if (!touchesItem) {
          nextConnectionsById[connectionId] = connection;
          nextConnectionIds.push(connectionId);
        }
      }

      return {
        ...state,
        itemsById: nextItemsById,
        itemIds: state.itemIds.filter((id) => id !== itemId),
        connectionsById: nextConnectionsById,
        connectionIds: nextConnectionIds,
        selected: state.selected?.itemId === itemId ? null : state.selected,
      };
    }

    // Add one graph connection.
    case "ADD_CONNECTION": {
      const connection = action.payload?.connection;

      if (!connection?.id) return state;
      if (state.connectionsById[connection.id]) return state;

      return {
        ...state,
        connectionsById: {
          ...state.connectionsById,
          [connection.id]: connection,
        },
        connectionIds: [...state.connectionIds, connection.id],
      };
    }

    // Delete one graph connection.
    case "DELETE_CONNECTION": {
      const connectionId = action.payload?.connectionId;

      if (!connectionId || !state.connectionsById[connectionId]) return state;

      const nextConnectionsById = { ...state.connectionsById };
      delete nextConnectionsById[connectionId];

      return {
        ...state,
        connectionsById: nextConnectionsById,
        connectionIds: state.connectionIds.filter((id) => id !== connectionId),
      };
    }

    // Update selected item/port.
    case "SET_SELECTED": {
      return {
        ...state,
        selected: action.payload?.selected ?? null,
      };
    }

    // Set active draft geometry.
    case "SET_ACTIVE_DRAFT": {
      return {
        ...state,
        activeDraft: action.payload?.draft ?? null,
      };
    }

    // Clear active draft geometry.
    case "CLEAR_ACTIVE_DRAFT": {
      return {
        ...state,
        activeDraft: null,
      };
    }

    default:
      return state;
  }
}
