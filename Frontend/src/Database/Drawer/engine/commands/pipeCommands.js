import { createId } from "../ids.js";
import { distance, dot, isValidDir, movePoint, normalize, vectorFromPoints, vectorToDeg } from "../geometry/vector.js";
import { dnToRealPipeWidthPx, pxToMeters } from "../geometry/units.js";
import { createConnection } from "../graph/connections.js";
import { getWorldPortsForItem } from "../graph/ports.js";
import { createElbowAfterPoint, getAllowedElbowAngleDeg, STRAIGHT_DOT_TOL } from "./elbowCommands.js";
import { createReducerAfterPoint, needsReducer } from "./reducerCommands.js";

// Minimum real pipe length in image pixels.
const MIN_PIPE_LENGTH_PX = 1;

// Converts a port angle to a direction vector.
function dirFromDeg(deg) {
  if (!Number.isFinite(deg)) return null;

  const rad = (deg * Math.PI) / 180;

  return normalize({ x: Math.cos(rad), y: Math.sin(rad) });
}

// Creates full tool metadata.
function getToolProps(tool, metersPerPx) {
  return {
    dn: tool.dn,
    color: tool.color,
    systemTypeId: tool.systemTypeId,
    widthPx: dnToRealPipeWidthPx(tool.dn, metersPerPx),
  };
}

// Creates output metadata from a draft.
function getDraftOutput(draft) {
  return {
    dn: draft.currentDn ?? draft.outputDn ?? draft.dn,
    color: draft.currentColor ?? draft.outputColor ?? draft.color,
    systemTypeId: draft.currentSystemTypeId ?? draft.outputSystemTypeId ?? draft.systemTypeId,
    widthPx: draft.currentWidthPx ?? draft.outputWidthPx ?? draft.widthPx,
  };
}

// Creates a temporary route draft from the current output point.
export function createPipeDraft({
  start,
  end = start,
  tool,
  metersPerPx,
  startPortRef = null,
  startPortSnapshot = null,
  previousDir = null,
  previousItemId = null,
  previousPortId = null,
  outputTool = null,
}) {
  const output = outputTool || startPortSnapshot || getToolProps(tool, metersPerPx);
  const outputWidthPx = output.widthPx ?? dnToRealPipeWidthPx(output.dn, metersPerPx);
  const dir = previousDir || dirFromDeg(startPortSnapshot?.dirDeg);

  return {
    type: "pipeDraft",
    startPoint: { ...start },
    endPoint: { ...end },
    startRaw: { ...start },
    endRaw: { ...end },
    start: { ...start },
    end: { ...end },
    startPortRef,
    startPortSnapshot,
    endPortRef: null,
    endPortSnapshot: null,
    previousItemId: previousItemId ?? startPortRef?.itemId ?? null,
    previousPortId: previousPortId ?? startPortRef?.portId ?? null,
    previousDir: dir,
    currentDn: output.dn,
    currentColor: output.color,
    currentSystemTypeId: output.systemTypeId,
    currentWidthPx: outputWidthPx,
    outputDn: output.dn,
    outputColor: output.color,
    outputSystemTypeId: output.systemTypeId,
    outputWidthPx,
    dn: tool.dn,
    color: tool.color,
    systemTypeId: tool.systemTypeId,
    widthPx: dnToRealPipeWidthPx(tool.dn, metersPerPx),
  };
}

// Updates a draft raw end point.
export function updatePipeDraftEnd(draft, end, { endPortRef = null, endPortSnapshot = null } = {}) {
  if (!draft) return null;

  return {
    ...draft,
    endPoint: { ...end },
    endRaw: { ...end },
    end: { ...end },
    endPortRef,
    endPortSnapshot,
  };
}

// Checks if draft raw route is long enough.
export function isPipeDraftLongEnough(draft) {
  if (!draft?.startPoint || !draft?.endRaw) return false;

  return distance(draft.startPoint, draft.endRaw) >= MIN_PIPE_LENGTH_PX;
}

// Recalculates pipe visual geometry, ports, and length.
export function updatePipeGeometry(pipe, { a = pipe.a, b = pipe.b, rawA = pipe.rawA ?? a, rawB = pipe.rawB ?? b } = {}, metersPerPx) {
  const dir = normalize(vectorFromPoints(a, b));
  const angleDeg = vectorToDeg(dir);
  const lengthPx = distance(a, b);

  return {
    ...pipe,
    a: { ...a },
    b: { ...b },
    rawA: { ...rawA },
    rawB: { ...rawB },
    lengthPx,
    lengthM: pxToMeters(lengthPx, metersPerPx),
    ports: {
      a: {
        ...(pipe.ports?.a || {}),
        id: "a",
        role: "end",
        x: a.x,
        y: a.y,
        dirDeg: angleDeg + 180,
        dn: pipe.dn,
        color: pipe.color,
        systemTypeId: pipe.systemTypeId,
        widthPx: pipe.widthPx,
      },
      b: {
        ...(pipe.ports?.b || {}),
        id: "b",
        role: "end",
        x: b.x,
        y: b.y,
        dirDeg: angleDeg,
        dn: pipe.dn,
        color: pipe.color,
        systemTypeId: pipe.systemTypeId,
        widthPx: pipe.widthPx,
      },
    },
  };
}

// Extends pipe visual/raw end.
export function extendPipeEnd(pipe, newEnd, metersPerPx) {
  return updatePipeGeometry(pipe, { b: newEnd, rawB: newEnd }, metersPerPx);
}

// Creates a real pipe item with visual and raw endpoints.
export function createPipeItem({ a, b, rawA = a, rawB = b, dn, color, systemTypeId, metersPerPx }) {
  const id = createId("pipe");
  const widthPx = dnToRealPipeWidthPx(dn, metersPerPx);
  const base = {
    id,
    type: "pipe",
    a: { ...a },
    b: { ...b },
    rawA: { ...rawA },
    rawB: { ...rawB },
    dn,
    color,
    systemTypeId,
    widthPx,
    lengthPx: 0,
    lengthM: 0,
    z: 10,
    ports: {},
  };

  return updatePipeGeometry(base, { a, b, rawA, rawB }, metersPerPx);
}

// Adds an action when value exists.
function pushAction(actions, action) {
  if (action) actions.push(action);
}

// Human label for history log entries.
function labelForActions(actions) {
  const addedTypes = actions.map((action) => action.payload?.item?.type).filter(Boolean);

  if (addedTypes.includes("elbow") && addedTypes.includes("reducer")) return "Add elbow + reducer";
  if (addedTypes.includes("elbow")) return "Add elbow";
  if (addedTypes.includes("reducer")) return "Add reducer";
  if (addedTypes.includes("pipe")) return "Draw pipe";
  if (actions.some((action) => action.type === "UPDATE_ITEM")) return "Update pipe";

  return "Drawing operation";
}

// Wraps internal reducer actions into one user operation.
function createTransaction(actions, { label = null, history = true } = {}) {
  return {
    label: label || labelForActions(actions),
    history,
    actions,
  };
}

// Empty non-history transaction.
function emptyTransaction() {
  return createTransaction([], { label: "No-op", history: false });
}

// Resolves an item including pending command changes.
function resolveItem(state, pendingItemsById, itemId) {
  return pendingItemsById[itemId] || state.itemsById?.[itemId] || null;
}

// Reads one item port point.
function getItemPortPoint(item, portId) {
  return getWorldPortsForItem(item).find((entry) => entry.portId === portId)?.point ?? null;
}

// Dev check for explicit port-to-port connections.
function checkConnectionPorts(state, pendingItemsById, a, b) {
  const itemA = resolveItem(state, pendingItemsById, a?.itemId);
  const itemB = resolveItem(state, pendingItemsById, b?.itemId);
  const pointA = itemA ? getItemPortPoint(itemA, a.portId) : null;
  const pointB = itemB ? getItemPortPoint(itemB, b.portId) : null;

  if (!pointA || !pointB) return;

  const d = distance(pointA, pointB);

  if (d > 0.001) {
    console.error("PlanDrawer connection port mismatch", { a, b, pointA, pointB, distancePx: d });
  }
}

// Creates an ADD_CONNECTION action when connection is valid.
function connectionAction(state, pendingItemsById, a, b) {
  const connection = createConnection({ a, b });

  if (!connection) return null;

  checkConnectionPorts(state, pendingItemsById, a, b);

  return { type: "ADD_CONNECTION", payload: { connection } };
}

// Tracks a newly added item for connection checks.
function addItem(actions, pendingItemsById, item) {
  if (!item) return;

  pendingItemsById[item.id] = item;
  pushAction(actions, { type: "ADD_ITEM", payload: { item } });
}

// Tracks an updated item for connection checks.
function updateItem(actions, pendingItemsById, itemId, item) {
  if (!itemId || !item) return;

  pendingItemsById[itemId] = item;
  pushAction(actions, { type: "UPDATE_ITEM", payload: { itemId, patch: item } });
}

// Creates the next continuous draft from a committed output port.
function createNextDraft({ startPoint, previewEndPoint = startPoint, tool, metersPerPx, previousItemId, previousPortId, previousDir }) {
  return createPipeDraft({
    start: startPoint,
    end: previewEndPoint,
    tool,
    metersPerPx,
    previousItemId,
    previousPortId,
    previousDir,
    outputTool: tool,
  });
}

// Adds a connection from draft output to the next input port.
function connectPreviousTo(actions, state, pendingItemsById, draft, nextItemId, nextPortId) {
  if (!draft.previousItemId || !draft.previousPortId) return;

  pushAction(
    actions,
    connectionAction(
      state,
      pendingItemsById,
      { itemId: draft.previousItemId, portId: draft.previousPortId },
      { itemId: nextItemId, portId: nextPortId },
    ),
  );
}

// Connects a pipe end to a snapped target port.
function connectEndTo(actions, state, pendingItemsById, endPortRef, itemId, portId) {
  if (!endPortRef) return;

  pushAction(actions, connectionAction(state, pendingItemsById, { itemId, portId }, endPortRef));
}

// Creates a pipe only when there is real straight distance.
function createPipeIfLong({ actions, state, pendingItemsById, start, end, tool, metersPerPx, previousRef = null, endPortRef = null }) {
  if (distance(start, end) < MIN_PIPE_LENGTH_PX) return null;

  const pipe = createPipeItem({
    a: start,
    b: end,
    rawA: start,
    rawB: end,
    dn: tool.dn,
    color: tool.color,
    systemTypeId: tool.systemTypeId,
    metersPerPx,
  });

  addItem(actions, pendingItemsById, pipe);

  if (previousRef) {
    pushAction(actions, connectionAction(state, pendingItemsById, previousRef, { itemId: pipe.id, portId: "a" }));
  }

  connectEndTo(actions, state, pendingItemsById, endPortRef, pipe.id, "b");

  return pipe;
}

// Projects a target onto a forward route direction from a new start.
function projectForwardPoint(start, target, dir) {
  const forwardDistance = dot(vectorFromPoints(start, target), dir);

  if (forwardDistance <= MIN_PIPE_LENGTH_PX) return null;

  return movePoint(start, dir, forwardDistance);
}

// Starts a new active draft from an item output.
function setNextDraft(actions, { startPoint, previewEndPoint = startPoint, tool, metersPerPx, previousItemId, previousPortId, previousDir, shouldStop }) {
  pushAction(actions, {
    type: shouldStop ? "CLEAR_ACTIVE_DRAFT" : "SET_ACTIVE_DRAFT",
    payload: shouldStop
      ? undefined
      : {
          draft: createNextDraft({
            startPoint,
            previewEndPoint,
            tool,
            metersPerPx,
            previousItemId,
            previousPortId,
            previousDir,
          }),
        },
  });
}

// Starts or commits a pipe draft and returns reducer actions.
export function commitPipeDraftCommand({ state, draft, clickPoint, portRef = null, portSnapshot = null, tool, metersPerPx }) {
  if (!clickPoint) return emptyTransaction();

  const currentTool = getToolProps(tool, metersPerPx);

  if (!draft) {
    return createTransaction(
      [
        {
          type: "SET_ACTIVE_DRAFT",
          payload: {
            draft: createPipeDraft({
              start: clickPoint,
              tool,
              metersPerPx,
              startPortRef: portRef,
              startPortSnapshot: portSnapshot,
            }),
          },
        },
      ],
      { label: "Start draft", history: false },
    );
  }

  const finalDraft = updatePipeDraftEnd(draft, clickPoint, { endPortRef: portRef, endPortSnapshot: portSnapshot });
  const startPoint = finalDraft.startPoint || finalDraft.startRaw;
  const targetPoint = finalDraft.endRaw;
  const newDir = normalize(vectorFromPoints(startPoint, targetPoint));

  if (!isValidDir(newDir)) return emptyTransaction();

  const actions = [];
  const pendingItemsById = {};
  const previousOutput = getDraftOutput(finalDraft);
  const previousItem = finalDraft.previousItemId ? state.itemsById[finalDraft.previousItemId] : null;
  const hasPreviousOutput = Boolean(finalDraft.previousItemId && finalDraft.previousPortId);
  const sameDirection = finalDraft.previousDir && dot(finalDraft.previousDir, newDir) >= STRAIGHT_DOT_TOL;
  const reverseDirection = finalDraft.previousDir && dot(finalDraft.previousDir, newDir) <= -STRAIGHT_DOT_TOL;
  const outputSpecChanged = Boolean(hasPreviousOutput && needsReducer(previousOutput, currentTool));
  const needsElbow = Boolean(hasPreviousOutput && finalDraft.previousDir && !sameDirection);

  if (reverseDirection) return emptyTransaction();

  let endPortRef = finalDraft.endPortRef;
  if (endPortRef && needsReducer(finalDraft.endPortSnapshot, currentTool)) endPortRef = null;

  if (needsElbow) {
    const elbowAngleDeg = getAllowedElbowAngleDeg(finalDraft.previousDir, newDir);
    if (elbowAngleDeg == null) {
      const pipe = createPipeIfLong({
        actions,
        state,
        pendingItemsById,
        start: startPoint,
        end: targetPoint,
        tool: currentTool,
        metersPerPx,
        previousRef: { itemId: finalDraft.previousItemId, portId: finalDraft.previousPortId },
        endPortRef,
      });

      if (!pipe) return emptyTransaction();

      setNextDraft(actions, {
        startPoint: pipe.b,
        previewEndPoint: targetPoint,
        tool: currentTool,
        metersPerPx,
        previousItemId: pipe.id,
        previousPortId: "b",
        previousDir: newDir,
        shouldStop: Boolean(endPortRef),
      });

      return createTransaction(actions);
    }

    const elbow = createElbowAfterPoint({
      startPoint,
      incomingDir: finalDraft.previousDir,
      outgoingDir: newDir,
      dn: previousOutput.dn,
      color: previousOutput.color,
      systemTypeId: previousOutput.systemTypeId,
      widthPx: previousOutput.widthPx,
      incomingWidthPx: previousOutput.widthPx,
      outgoingWidthPx: previousOutput.widthPx,
      angleDeg: elbowAngleDeg,
    });

    if (!elbow) return emptyTransaction();
    if (distance(elbow.trimBefore, startPoint) > 0.001) return emptyTransaction();

    addItem(actions, pendingItemsById, elbow);
    connectPreviousTo(actions, state, pendingItemsById, finalDraft, elbow.id, "in");

    if (!outputSpecChanged) {
      setNextDraft(actions, {
        startPoint: elbow.trimAfter,
        previewEndPoint: targetPoint,
        tool: currentTool,
        metersPerPx,
        previousItemId: elbow.id,
        previousPortId: "out",
        previousDir: newDir,
        shouldStop: false,
      });

      return createTransaction(actions);
    }

    const reducer = createReducerAfterPoint({
      startPoint: elbow.trimAfter,
      dir: newDir,
      fromPort: previousOutput,
      tool: currentTool,
      metersPerPx,
    });

    if (!reducer) return emptyTransaction();
    if (distance(reducer.p0, elbow.trimAfter) > 0.001) return emptyTransaction();

    addItem(actions, pendingItemsById, reducer);
    pushAction(actions, connectionAction(state, pendingItemsById, { itemId: elbow.id, portId: "out" }, { itemId: reducer.id, portId: "in" }));

    const reducerDir = reducer.dir || newDir;
    const pipeEndAfterReducer = projectForwardPoint(reducer.b, targetPoint, reducerDir);
    const pipe = pipeEndAfterReducer
      ? createPipeIfLong({
          actions,
          state,
          pendingItemsById,
          start: reducer.b,
          end: pipeEndAfterReducer,
          tool: currentTool,
          metersPerPx,
          previousRef: { itemId: reducer.id, portId: "out" },
          endPortRef: endPortRef && distance(pipeEndAfterReducer, targetPoint) <= 0.001 ? endPortRef : null,
        })
      : null;
    const nextItem = pipe || reducer;
    const nextPortId = pipe ? "b" : "out";
    const nextStart = pipe ? pipe.b : reducer.b;
    const shouldStop = Boolean(endPortRef && pipe);

    setNextDraft(actions, {
      startPoint: nextStart,
      previewEndPoint: targetPoint,
      tool: currentTool,
      metersPerPx,
      previousItemId: nextItem.id,
      previousPortId: nextPortId,
      previousDir: reducerDir,
      shouldStop,
    });

    return createTransaction(actions);
  }

  if (outputSpecChanged) {
    const reducer = createReducerAfterPoint({
      startPoint,
      dir: newDir,
      fromPort: previousOutput,
      tool: currentTool,
      metersPerPx,
    });

    if (!reducer) return emptyTransaction();
    if (distance(reducer.p0, startPoint) > 0.001) return emptyTransaction();

    addItem(actions, pendingItemsById, reducer);
    connectPreviousTo(actions, state, pendingItemsById, finalDraft, reducer.id, "in");

    const hasPipeAfterReducer = dot(vectorFromPoints(reducer.b, targetPoint), newDir) > MIN_PIPE_LENGTH_PX;
    const pipe = hasPipeAfterReducer
      ? createPipeIfLong({
          actions,
          state,
          pendingItemsById,
          start: reducer.b,
          end: targetPoint,
          tool: currentTool,
          metersPerPx,
          previousRef: { itemId: reducer.id, portId: "out" },
          endPortRef,
        })
      : null;
    const nextItem = pipe || reducer;
    const nextPortId = pipe ? "b" : "out";
    const nextStart = pipe ? pipe.b : reducer.b;
    const shouldStop = Boolean(endPortRef && pipe);

    setNextDraft(actions, {
      startPoint: nextStart,
      previewEndPoint: targetPoint,
      tool: currentTool,
      metersPerPx,
      previousItemId: nextItem.id,
      previousPortId: nextPortId,
      previousDir: newDir,
      shouldStop,
    });

    return createTransaction(actions);
  }

  if (previousItem?.type === "pipe" && finalDraft.previousPortId === "b" && sameDirection) {
    const extendedPipe = extendPipeEnd(previousItem, targetPoint, metersPerPx);

    updateItem(actions, pendingItemsById, previousItem.id, extendedPipe);
    connectEndTo(actions, state, pendingItemsById, endPortRef, previousItem.id, "b");
    setNextDraft(actions, {
      startPoint: targetPoint,
      previewEndPoint: targetPoint,
      tool: currentTool,
      metersPerPx,
      previousItemId: previousItem.id,
      previousPortId: "b",
      previousDir: newDir,
      shouldStop: Boolean(endPortRef),
    });

    return createTransaction(actions);
  }

  const previousRef = hasPreviousOutput ? { itemId: finalDraft.previousItemId, portId: finalDraft.previousPortId } : null;
  const pipe = createPipeIfLong({
    actions,
    state,
    pendingItemsById,
    start: startPoint,
    end: targetPoint,
    tool: currentTool,
    metersPerPx,
    previousRef,
    endPortRef,
  });

  if (!pipe) return emptyTransaction();

  setNextDraft(actions, {
    startPoint: pipe.b,
    previewEndPoint: targetPoint,
    tool: currentTool,
    metersPerPx,
    previousItemId: pipe.id,
    previousPortId: "b",
    previousDir: newDir,
    shouldStop: Boolean(endPortRef),
  });

  return createTransaction(actions);
}
