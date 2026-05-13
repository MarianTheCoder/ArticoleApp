// BuildTJoint.js

// Funcție utilitară pentru găsirea intersecției a două drepte 2D
function intersectLines(p1, d1, p2, d2) {
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-9) return p1; // Fallback dacă sunt paralele
  const dx = p2.x - p1.x,
    dy = p2.y - p1.y;
  const t = (dx * d2.y - dy * d2.x) / cross;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

export function computeTJointGeometry(anchor, vMain, vBranch, dMain, dBranch, factor = 1) {
  // 1. Calculăm marginea exact ca în PipeSegments.jsx
  const edgeMain = Math.max(1.5, dMain / 8);
  const edgeBranch = Math.max(1.5, dBranch / 8);

  const rM = dMain / 2 + edgeMain / 2;
  const rB = dBranch / 2 + edgeBranch / 2;

  // Calculăm direcțiile perpendiculare (normalele)
  const cross = vMain.x * vBranch.y - vMain.y * vBranch.x;
  const side = cross >= 0 ? 1 : -1;

  const nMain = { x: -vMain.y * side, y: vMain.x * side };
  const nBranch = { x: -vBranch.y * side, y: vBranch.x * side };

  const mainTop = { x: anchor.x + nMain.x * rM, y: anchor.y + nMain.y * rM };
  const branchRight = { x: anchor.x - nBranch.x * rB, y: anchor.y - nBranch.y * rB };
  const branchLeft = { x: anchor.x + nBranch.x * rB, y: anchor.y + nBranch.y * rB };

  // Intersecțiile geometrice care taie țeava (P4 și P7)
  const P4 = intersectLines(mainTop, vMain, branchRight, vBranch);
  const P7 = intersectLines(mainTop, vMain, branchLeft, vBranch);

  // =========================================================================
  // MAGIA NOUĂ: Calculăm extinderea INDEPENDENTĂ pentru fiecare capăt
  // =========================================================================

  // Proiectăm punctele de tăietură pe axa țevii principale
  const proj4M = (P4.x - anchor.x) * vMain.x + (P4.y - anchor.y) * vMain.y;
  const proj7M = (P7.x - anchor.x) * vMain.x + (P7.y - anchor.y) * vMain.y;

  // Aflăm exact de unde începe și unde se termină tăietura ramificației
  const minM = Math.min(proj4M, proj7M, 0); // Includem 0 ca mufa să acopere măcar centrul
  const maxM = Math.max(proj4M, proj7M, 0);

  const padMain = dMain * factor; // Cât material lăsăm extra peste tăietură

  // Distanța reală a capetelor mufei (stânga / dreapta)
  const distStart = minM - padMain;
  const distEnd = maxM + padMain;

  const mainStart = { x: anchor.x + vMain.x * distStart, y: anchor.y + vMain.y * distStart };
  const mainEnd = { x: anchor.x + vMain.x * distEnd, y: anchor.y + vMain.y * distEnd };

  // Facem același lucru pentru brațul ramificației (care crește doar în față)
  const proj4B = (P4.x - anchor.x) * vBranch.x + (P4.y - anchor.y) * vBranch.y;
  const proj7B = (P7.x - anchor.x) * vBranch.x + (P7.y - anchor.y) * vBranch.y;

  const maxB = Math.max(proj4B, proj7B, 0);
  const distBranch = maxB + dBranch * factor;

  const branchEnd = { x: anchor.x + vBranch.x * distBranch, y: anchor.y + vBranch.y * distBranch };

  // =========================================================================

  // Construim cele 8 puncte (P4 și P7 sunt direct intersecțiile)
  const P1 = { x: mainStart.x - nMain.x * rM, y: mainStart.y - nMain.y * rM };
  const P2 = { x: mainEnd.x - nMain.x * rM, y: mainEnd.y - nMain.y * rM };
  const P3 = { x: mainEnd.x + nMain.x * rM, y: mainEnd.y + nMain.y * rM };
  const P5 = { x: branchEnd.x - nBranch.x * rB, y: branchEnd.y - nBranch.y * rB };
  const P6 = { x: branchEnd.x + nBranch.x * rB, y: branchEnd.y + nBranch.y * rB };
  const P8 = { x: mainStart.x + nMain.x * rM, y: mainStart.y + nMain.y * rM };

  return { points: [P1, P2, P3, P4, P5, P6, P7, P8], border: edgeMain, connStart: mainStart, connEnd: mainEnd, connBranch: branchEnd };
}
