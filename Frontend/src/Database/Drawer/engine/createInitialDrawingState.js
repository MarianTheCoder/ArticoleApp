// Creates the canonical CAD drawing state.
export function createInitialDrawingState({ plan } = {}) {
  return {
    // Drawing schema version.
    version: 1,

    // Plan metadata used by this drawing.
    plan: {
      id: plan?.id ?? null,
      widthPx: Number(plan?.width_px || 0),
      heightPx: Number(plan?.height_px || 0),
      metersPerPx: Number(plan?.meters_per_px || 0),
    },

    // Drawing items by id: pipe, elbow, reducer, tee, wye.
    itemsById: {},

    // Stable item order.
    itemIds: [],

    // Explicit port-to-port graph connections.
    connectionsById: {},

    // Stable connection order.
    connectionIds: [],

    // Temporary active drawing object.
    activeDraft: null,

    // Current selected item/port.
    selected: null,

    // Debug info shown in HUD.
    debug: {
      lastClick: null,
    },
  };
}
