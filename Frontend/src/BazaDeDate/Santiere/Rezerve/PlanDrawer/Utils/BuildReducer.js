// buildReducer.js — pure reducer geometry, no curves

// ── geometry for RENDERING ────────────────────────────────────────────────────
// ── geometry for RENDERING ────────────────────────────────────────────────────
export function computeReducerGeometry(p0, p1, dIn, dOut, anchor) {
  // <--- ADAUGĂ `anchor` AICI
  const dx = p1.x - p0.x,
    dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;

  const ux = dx / len,
    uy = dy / len;
  const nx = -uy,
    ny = ux;

  const edgeIn = Math.max(1.5, dIn / 8);
  const edgeOut = Math.max(1.5, dOut / 8);
  const border = Math.max(1.5, Math.min(edgeIn, edgeOut));

  const rIn = Math.max(0, dIn / 2 + edgeIn - border / 2);
  const rOut = Math.max(0, dOut / 2 + edgeOut - border / 2);

  // În loc să calculăm mijlocul matematic dintre p0 și p1,
  // folosim direct `anchor` (locul unde țevile se întâlnesc pe bune)!
  const mid = anchor || { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

  const P0T = { x: p0.x + nx * rIn, y: p0.y + ny * rIn };
  const P0B = { x: p0.x - nx * rIn, y: p0.y - ny * rIn };
  const MidT_In = { x: mid.x + nx * rIn, y: mid.y + ny * rIn };
  const MidB_In = { x: mid.x - nx * rIn, y: mid.y - ny * rIn };

  const MidT_Out = { x: mid.x + nx * rOut, y: mid.y + ny * rOut };
  const MidB_Out = { x: mid.x - nx * rOut, y: mid.y - ny * rOut };
  const P1T = { x: p1.x + nx * rOut, y: p1.y + ny * rOut };
  const P1B = { x: p1.x - nx * rOut, y: p1.y - ny * rOut };

  return { P0T, P0B, MidT_In, MidB_In, MidT_Out, MidB_Out, P1T, P1B, border };
}

// ── data for STATE ────────────────────────────────────────────────────────────
export function buildReducerData(anchor, vFwd, prevWidth, nextWidth, color, COT_VISUAL_FACTOR, currentDN, prevDN, prevColor) {
  const LEG_IN = prevWidth * COT_VISUAL_FACTOR;
  const LEG_OUT = nextWidth * COT_VISUAL_FACTOR;
  return {
    id: crypto.randomUUID(),
    anchor: { ...anchor }, // <--- ADAUGĂ ASTA CA SĂ ȘTIM UNDE E TREAPTA FIZICĂ
    p0: { x: anchor.x - vFwd.x * LEG_IN, y: anchor.y - vFwd.y * LEG_IN },
    p1: { x: anchor.x + vFwd.x * LEG_OUT, y: anchor.y + vFwd.y * LEG_OUT },
    dIn: prevWidth,
    dOut: nextWidth,
    color: prevColor || color,
    colorStart: prevColor,
    colorEnd: color,
    dnEnd: currentDN,
    dnStart: prevDN,
  };
}
