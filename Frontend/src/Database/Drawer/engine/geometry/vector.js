// Distance between two points.
export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Adds two vectors/points.
export function add(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

// Subtracts b from a.
export function sub(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

// Scales a vector.
export function scale(v, s) {
  return {
    x: v.x * s,
    y: v.y * s,
  };
}

// Perpendicular vector.
export function perp(v) {
  return {
    x: -v.y,
    y: v.x,
  };
}

// Dot product.
export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

// Vector from point a to point b.
export function vectorFromPoints(a, b) {
  return {
    x: b.x - a.x,
    y: b.y - a.y,
  };
}

// Vector length.
export function length(v) {
  return Math.hypot(v.x, v.y);
}

// Normalized vector.
export function normalize(v) {
  const len = length(v);

  if (len < 1e-9) {
    return { x: 0, y: 0 };
  }

  return {
    x: v.x / len,
    y: v.y / len,
  };
}

// True when a direction can be used for route math.
export function isValidDir(dir) {
  return Number.isFinite(dir?.x) && Number.isFinite(dir?.y) && length(dir) > 1e-9;
}

// Vector angle in degrees.
export function vectorToDeg(v) {
  return (Math.atan2(v.y, v.x) * 180) / Math.PI;
}

// Degrees to radians.
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

// Normalizes an angle to 0..360 degrees.
export function normalizeAngleDeg(deg) {
  const n = deg % 360;

  return n < 0 ? n + 360 : n;
}

// Smallest absolute angle difference in degrees.
export function angleDiffAbsDeg(a, b) {
  const diff = Math.abs(normalizeAngleDeg(a) - normalizeAngleDeg(b));

  return Math.min(diff, 360 - diff);
}

// Signed angle delta from one angle to another, in -180..180.
export function signedAngleDiffDeg(fromDeg, toDeg) {
  let diff = normalizeAngleDeg(toDeg) - normalizeAngleDeg(fromDeg);

  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return diff;
}

// Smallest angle between two direction vectors.
export function angleBetweenDeg(a, b) {
  const na = normalize(a);
  const nb = normalize(b);

  if (!isValidDir(na) || !isValidDir(nb)) return 0;

  return (Math.acos(clamp(dot(na, nb), -1, 1)) * 180) / Math.PI;
}

// Point offset from origin by angle and length.
export function pointFromAngle(origin, angleDeg, len) {
  const rad = degToRad(angleDeg);

  return {
    x: origin.x + Math.cos(rad) * len,
    y: origin.y + Math.sin(rad) * len,
  };
}

// Moves a point along a normalized direction.
export function movePoint(point, dir, dist) {
  return add(point, scale(dir, dist));
}

// Pushes target away from anchor until min distance is reached.
export function ensureMinDistanceFromAnchor(anchor, target, minDist) {
  const dir = normalize(vectorFromPoints(anchor, target));

  if (length(dir) < 1e-9) return null;
  if (distance(anchor, target) >= minDist) return { ...target };

  return movePoint(anchor, dir, minDist);
}

// Snaps point angle around origin to a degree step.
export function snapPointToAngleStep(origin, point, stepDeg = 15) {
  if (!origin || !point) return point;

  const v = vectorFromPoints(origin, point);
  const len = length(v);

  if (len < 1e-9 || !Number.isFinite(stepDeg) || stepDeg <= 0) {
    return { ...point };
  }

  const angleRad = Math.atan2(v.y, v.x);
  const angleDeg = (angleRad * 180) / Math.PI;
  const snappedDeg = Math.round(angleDeg / stepDeg) * stepDeg;
  const snappedRad = (snappedDeg * Math.PI) / 180;

  return {
    x: origin.x + Math.cos(snappedRad) * len,
    y: origin.y + Math.sin(snappedRad) * len,
  };
}

// Snaps point angle relative to an existing route direction.
export function snapPointToRelativeAngleStep(origin, point, baseDir = { x: 1, y: 0 }, stepDeg = 15) {
  if (!origin || !point) return point;
  if (!isValidDir(baseDir)) return snapPointToAngleStep(origin, point, stepDeg);

  const v = vectorFromPoints(origin, point);
  const len = length(v);

  if (len < 1e-9 || !Number.isFinite(stepDeg) || stepDeg <= 0) {
    return { ...point };
  }

  const baseDeg = vectorToDeg(baseDir);
  const rawDeg = vectorToDeg(v);
  const snappedDeltaDeg = Math.round(signedAngleDiffDeg(baseDeg, rawDeg) / stepDeg) * stepDeg;
  const snappedRad = degToRad(baseDeg + snappedDeltaDeg);

  return {
    x: origin.x + Math.cos(snappedRad) * len,
    y: origin.y + Math.sin(snappedRad) * len,
  };
}

// Clamps a number between min and max.
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Closest point on segment a-b to point p.
export function closestPointOnSegment(p, a, b) {
  const ab = vectorFromPoints(a, b);
  const lenSq = ab.x * ab.x + ab.y * ab.y;

  if (lenSq < 1e-9) return { ...a };

  const ap = vectorFromPoints(a, p);
  const t = clamp((ap.x * ab.x + ap.y * ab.y) / lenSq, 0, 1);

  return {
    x: a.x + ab.x * t,
    y: a.y + ab.y * t,
  };
}

// Distance from point p to segment a-b.
export function distanceToSegment(p, a, b) {
  return distance(p, closestPointOnSegment(p, a, b));
}
