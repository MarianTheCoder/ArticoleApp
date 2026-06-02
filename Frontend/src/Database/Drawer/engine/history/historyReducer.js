import { createInitialDrawingState } from "../createInitialDrawingState.js";
import { drawingReducer } from "../drawingReducer.js";
import { createId } from "../ids.js";

// Keep history bounded until we switch to diffs.
export const MAX_HISTORY = 100;

// Creates the wrapped drawing/history state.
export function createInitialHistoryState({ plan } = {}) {
  return {
    past: [],
    present: createInitialDrawingState({ plan }),
    future: [],
    log: [],
  };
}

// Applies drawing reducer actions in order.
function applyActions(present, actions) {
  return actions.reduce((state, action) => drawingReducer(state, action), present);
}

// Returns ids of connections removed by deleting an item.
function selectConnectionIdsTouchingItem(state, itemId) {
  return (state.connectionIds || []).filter((connectionId) => {
    const connection = state.connectionsById?.[connectionId];

    return connection?.a?.itemId === itemId || connection?.b?.itemId === itemId;
  });
}

// Creates a compact readable log entry for a transaction.
function createLogEntry(label, actions, beforeState) {
  const entry = {
    id: createId("op"),
    label: label || "Drawing operation",
    at: new Date().toISOString(),
    addedItemIds: [],
    updatedItemIds: [],
    deletedItemIds: [],
    addedConnectionIds: [],
    deletedConnectionIds: [],
  };

  for (const action of actions) {
    if (action.type === "ADD_ITEM" && action.payload?.item?.id) {
      entry.addedItemIds.push(action.payload.item.id);
    }

    if (action.type === "UPDATE_ITEM") {
      const itemId = action.payload?.itemId ?? action.payload?.item?.id;
      if (itemId) entry.updatedItemIds.push(itemId);
    }

    if (action.type === "DELETE_ITEM" && action.payload?.itemId) {
      entry.deletedItemIds.push(action.payload.itemId);
      entry.deletedConnectionIds.push(...selectConnectionIdsTouchingItem(beforeState, action.payload.itemId));
    }

    if (action.type === "ADD_CONNECTION" && action.payload?.connection?.id) {
      entry.addedConnectionIds.push(action.payload.connection.id);
    }

    if (action.type === "DELETE_CONNECTION" && action.payload?.connectionId) {
      entry.deletedConnectionIds.push(action.payload.connectionId);
    }
  }

  return entry;
}

// History wrapper around the canonical drawing reducer.
export function historyReducer(state, action) {
  switch (action.type) {
    case "APPLY_TRANSACTION": {
      const tx = action.payload || {};
      const actions = Array.isArray(tx.actions) ? tx.actions.filter(Boolean) : [];

      if (actions.length === 0) return state;

      const nextPresent = applyActions(state.present, actions);

      if (tx.history === false) {
        return {
          ...state,
          present: nextPresent,
        };
      }

      const nextPast = [...state.past, state.present].slice(-MAX_HISTORY);

      return {
        past: nextPast,
        present: nextPresent,
        future: [],
        log: [createLogEntry(tx.label, actions, state.present), ...state.log].slice(0, MAX_HISTORY),
      };
    }

    case "UNDO": {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];

      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;

      const next = state.future[0];

      return {
        ...state,
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: next,
        future: state.future.slice(1),
      };
    }

    case "CLEAR_HISTORY": {
      return {
        past: [],
        present: state.present,
        future: [],
        log: [],
      };
    }

    case "RESET_HISTORY_FOR_PLAN": {
      return createInitialHistoryState({ plan: action.payload?.plan });
    }

    default:
      return state;
  }
}
