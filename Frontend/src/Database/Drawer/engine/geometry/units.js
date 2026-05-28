// Parses meters_per_px from DB/user value.
export function parseMetersPerPx(value) {
  const n = Number(String(value ?? "").replace(",", "."));

  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Converts DN millimeters to real pipe width in image pixels.
export function dnToRealPipeWidthPx(dn, metersPerPx) {
  const dnMm = Number(String(dn ?? "").replace(",", "."));

  if (!Number.isFinite(dnMm) || dnMm <= 0) return 0;
  if (!Number.isFinite(metersPerPx) || metersPerPx <= 0) return 0;

  const dnMeters = dnMm / 1000;

  return dnMeters / metersPerPx;
}

// Converts image-pixel distance to meters.
export function pxToMeters(px, metersPerPx) {
  if (!Number.isFinite(px)) return 0;
  if (!Number.isFinite(metersPerPx) || metersPerPx <= 0) return 0;

  return px * metersPerPx;
}

// Formats meters for UI.
export function formatMeters(meters) {
  if (!Number.isFinite(meters)) return "—";

  if (meters < 1) {
    return `${Math.round(meters * 100)} cm`;
  }

  return `${meters.toFixed(2)} m`;
}

// Formats pixels for UI.
export function formatPx(px) {
  if (!Number.isFinite(px)) return "—";

  return `${px.toFixed(2)} px`;
}
