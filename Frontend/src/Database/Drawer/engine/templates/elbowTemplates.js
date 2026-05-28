// Supported procedural elbow templates.
export const ELBOW_TEMPLATES = {
  elbow_15: { id: "elbow_15", type: "elbow", angleDeg: 15 },
  elbow_30: { id: "elbow_30", type: "elbow", angleDeg: 30 },
  elbow_45: { id: "elbow_45", type: "elbow", angleDeg: 45 },
  elbow_60: { id: "elbow_60", type: "elbow", angleDeg: 60 },
  elbow_75: { id: "elbow_75", type: "elbow", angleDeg: 75 },
  elbow_90: { id: "elbow_90", type: "elbow", angleDeg: 90 },
};

// Picks the nearest current elbow template.
export function getNearestElbowTemplate(angleDeg) {
  const templates = Object.values(ELBOW_TEMPLATES);

  return templates.reduce((best, template) => {
    const d = Math.abs(template.angleDeg - angleDeg);
    const bestD = Math.abs(best.angleDeg - angleDeg);

    return d < bestD ? template : best;
  }, templates[0]);
}
