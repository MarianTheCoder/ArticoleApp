// Minimal, dependency-free helpers. Import anywhere.

export function toApiUrl(path, baseURL) {
    if (!path) return "";
    return new URL(path, baseURL).href;
}

export const hasValidRoute = (p) => coerceRouteArray(p?.route_json).length > 0;

export function hexToRgba(hex, alpha = 0.3) {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Keep your existing date format behavior in one place.
export function fmtDateTime(isoOrSql) {
    if (!isoOrSql) return "";
    const d = new Date(isoOrSql);
    if (Number.isNaN(d.getTime())) return "";
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// OSD/Konva coordinate helpers (plain functions).
export function vpPointFromPointer(stage, viewer, OpenSeadragonRef) {
    const pos = stage?.getPointerPosition();
    if (!pos || !viewer) return null;
    const OSD = OpenSeadragonRef || window.OpenSeadragon;
    return viewer.viewport.pointFromPixel(new OSD.Point(pos.x, pos.y), true);
}

export function pixelToImagePoint(stage, viewer, OpenSeadragonRef) {
    const vp = vpPointFromPointer(stage, viewer, OpenSeadragonRef);
    if (!vp) return null;
    const img = viewer.viewport.viewportToImageCoordinates(vp);
    return { x: img.x, y: img.y };
}

export function imageToScreen(viewer, { x, y }) {
    if (!viewer) return null;
    const vp = viewer.viewport.imageToViewportCoordinates(x, y);
    const px = viewer.viewport.pixelFromPoint(vp, true);
    return { x: px.x, y: px.y };
}


export function downloadDataURL(dataUrl, filename) {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

export function firstPointOfRoute(segList, currentSegPoints) {
    // segList: [{ points:[x,y,...] }, ...]
    if (Array.isArray(segList) && segList.length > 0) {
        const p = segList[0]?.points || [];
        if (p.length >= 2) return { x: p[0], y: p[1] };
    }
    if (Array.isArray(currentSegPoints) && currentSegPoints.length >= 2) {
        return { x: currentSegPoints[0], y: currentSegPoints[1] };
    }
    return null;
}

// === ROUTE HELPERS (pct -> px) ===
export function coerceRouteArray(route_json) {
    if (!route_json) return [];
    let arr = route_json;
    try { arr = typeof route_json === "string" ? JSON.parse(route_json) : route_json; } catch { return []; }
    if (!Array.isArray(arr)) return [];
    // keep only valid segments
    return arr.filter(seg =>
        Array.isArray(seg?.points_pct) &&
        seg.points_pct.length >= 4 &&
        Number(seg?.width) > 0
    );
}

export function segPctToPx(seg, plan) {
    const ptsPct = seg.points_pct;
    const ptsPx = [];
    for (let i = 0; i < ptsPct.length; i += 2) {
        ptsPx.push(ptsPct[i] * (plan?.width_px || 1));
        ptsPx.push(ptsPct[i + 1] * (plan?.height_px || 1));
    }
    const width = Math.max(1, Number(seg.width) || 4);
    const color = typeof seg.color === "string" ? seg.color : "#3B82F6";
    return { points: ptsPx, width, color };
}

// ---- Units & formatting ------------------------------------------------
export function pxToMeters(px, metersPerPx) {
    if (!metersPerPx) return null;
    return metersPerPx * px;
}

export function formatMeters(m) {
    if (m == null) return "—";
    if (m < 1) return `${(m * 100).toFixed(2)} cm`;
    if (m < 1000) return `${m.toFixed(2)} m`;
    return `${(m / 1000).toFixed(3)} km`;
}

// ---- Geometry / polylines ----------------------------------------------
export function polylineLengthPx(pts) {
    let len = 0;
    for (let i = 2; i < pts.length; i += 2) {
        const dx = pts[i] - pts[i - 2];
        const dy = pts[i + 1] - pts[i - 1];
        len += Math.hypot(dx, dy);
    }
    return len;
}

export function closestPointOnSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay;
    const apx = px - ax, apy = py - ay;
    const ab2 = abx * abx + aby * aby;
    let t = ab2 ? (apx * abx + apy * aby) / ab2 : 0;
    t = Math.max(0, Math.min(1, t));
    return { x: ax + t * abx, y: ay + t * aby, t };
}

export function draftEdgesFromSegPoints(segPoints) {
    const edges = [];
    if (!Array.isArray(segPoints) || segPoints.length < 4) return edges;
    for (let i = 2; i < segPoints.length; i += 2) {
        const ax = segPoints[i - 2], ay = segPoints[i - 1];
        const bx = segPoints[i], by = segPoints[i + 1];
        edges.push([ax, ay, bx, by]);
    }
    return edges;
}

export function snapToAngleStep(anchor, cand, stepDeg = 45) {
    const dx = cand.x - anchor.x, dy = cand.y - anchor.y;
    if (dx === 0 && dy === 0) return cand;
    const r = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const step = (stepDeg * Math.PI) / 180;
    const angSnap = Math.round(ang / step) * step;
    return { x: anchor.x + r * Math.cos(angSnap), y: anchor.y + r * Math.sin(angSnap) };
}

export function pointsPxToPct(points, widthPx, heightPx) {
    if (!widthPx || !heightPx) return [];
    const out = [];
    for (let i = 0; i < points.length; i += 2) {
        out.push(points[i] / widthPx, points[i + 1] / heightPx);
    }
    return out;
}

export function totalPolylineLengthPx(segments) {
    let len = 0;
    for (const s of segments || []) len += polylineLengthPx(s.points || []);
    return len;
}

// ---- Route building / serialization ------------------------------------
export function collectFinalSegments(routeDraft, segPoints, segColor, segWidth) {
    const base = Array.isArray(routeDraft?.segments) ? routeDraft.segments : [];
    const extra = (Array.isArray(segPoints) && segPoints.length >= 4)
        ? [{ points: segPoints.slice(), color: segColor, width: segWidth }]
        : [];
    return base.concat(extra);
}


// ---- Snapping (RBush-assisted) -----------------------------------------
/**
 * Build RBush items from committed segments.
 * Each item carries {seg, i} where i is the index of the segment endpoint (bx,by).
 */
export function buildSnapIndexItems(segments) {
    const items = [];
    for (const s of (segments || [])) {
        const pts = s.points || [];
        for (let i = 2; i < pts.length; i += 2) {
            const ax = pts[i - 2], ay = pts[i - 1];
            const bx = pts[i], by = pts[i + 1];
            items.push({
                minX: Math.min(ax, bx), minY: Math.min(ay, by),
                maxX: Math.max(ax, bx), maxY: Math.max(ay, by),
                seg: s, i
            });
        }
    }
    return items;
}

export function findSnapPointInIndex(imgX, imgY, index, searchRadiusPx, snapTolPx) {
    if (!index) return null;
    let best = null, bestDist = Infinity;
    const r = searchRadiusPx;
    const hits = index.search({ minX: imgX - r, minY: imgY - r, maxX: imgX + r, maxY: imgY + r });
    for (const h of hits) {
        const pts = h.seg.points, i = h.i;
        const ax = pts[i - 2], ay = pts[i - 1];
        const bx = pts[i], by = pts[i + 1];
        const cp = closestPointOnSegment(imgX, imgY, ax, ay, bx, by);
        const d = Math.hypot(cp.x - imgX, cp.y - imgY);
        if (d < bestDist) { bestDist = d; best = cp; }
    }
    return (best && bestDist <= snapTolPx) ? best : null;
}

/**
 * Combines RBush (committed) hits + current draft edges.
 * `avoid` is a point near which we ignore snaps (e.g., last anchor).
 */
export function findSnapPointCombined(imgX, imgY, index, segPoints, avoid, snapSearchPx = 30, snapTolPx = 12) {
    let best = null, bestDist = Infinity;

    const byIndex = findSnapPointInIndex(imgX, imgY, index, snapSearchPx, snapTolPx);
    if (byIndex) {
        best = byIndex;
        bestDist = Math.hypot(byIndex.x - imgX, byIndex.y - imgY);
    }

    const edges = draftEdgesFromSegPoints(segPoints);
    for (const [ax, ay, bx, by] of edges) {
        const cp = closestPointOnSegment(imgX, imgY, ax, ay, bx, by);
        const d = Math.hypot(cp.x - imgX, cp.y - imgY);
        if (d < bestDist) { bestDist = d; best = cp; }
    }

    if (best && avoid) {
        const da = Math.hypot(best.x - avoid.x, best.y - avoid.y);
        if (da < 1e-3) return null;
    }
    return (best && bestDist <= snapTolPx) ? best : null;
}

// planUtils.js
export function exportVisibleCompositePNG(viewer, stage, pixelRatio = 2) {
    if (!viewer || !viewer.drawer || !viewer.drawer.canvas || !stage) return null;

    // Canvasul intern al OSD (viewportul curent)
    const osdCanvas = viewer.drawer.canvas;

    // Dimensiunea reală în pixeli a canvasurilor
    const baseW = osdCanvas.width;
    const baseH = osdCanvas.height;

    // Pregătim un offscreen canvas pe care compunem baza OSD + overlay Konva
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(baseW * (pixelRatio / window.devicePixelRatio)));
    out.height = Math.max(1, Math.round(baseH * (pixelRatio / window.devicePixelRatio)));
    const ctx = out.getContext('2d');

    // 1) Desenăm mai întâi baza (OSD)
    // Notă CORS: trebuie ca tile-urile să aibă CORS corect (Access-Control-Allow-Origin),
    // altfel canvasul OSD va fi "tainted" și toDataURL va eșua.
    ctx.drawImage(osdCanvas, 0, 0, baseW, baseH, 0, 0, out.width, out.height);

    // 2) Exportăm stratul Konva la aceeași scară ca OSD canvas
    // Konva Stage are width/height în CSS px; osdCanvas.width e în device px.
    const stageCssW = stage.width();
    const scaleForKonva = baseW / Math.max(1, stageCssW); // raport device px / css px

    const stageOverlayCanvas = stage.toCanvas({ pixelRatio: scaleForKonva });
    ctx.drawImage(stageOverlayCanvas, 0, 0, stageOverlayCanvas.width, stageOverlayCanvas.height,
        0, 0, out.width, out.height);

    return out.toDataURL('image/png');
}

export function snapFromRBush(x, y, idx, searchPx, tolPx) {
    if (!idx) return null;

    const hits = idx.search({
        minX: x - searchPx, minY: y - searchPx,
        maxX: x + searchPx, maxY: y + searchPx,
    });
    if (!hits || !hits.length) return null;

    let best = null;
    let bestD = Infinity;

    for (const h of hits) {
        const ax = h.seg.points[h.i - 2], ay = h.seg.points[h.i - 1];
        const bx = h.seg.points[h.i], by = h.seg.points[h.i + 1];

        // closestPointOnSegment(p, a, b) you already have imported from planUtils
        const cp = closestPointOnSegment({ x, y }, { x: ax, y: ay }, { x: bx, y: by });
        const d = Math.hypot(cp.x - x, cp.y - y);
        if (d < bestD) { bestD = d; best = cp; }
    }

    return bestD <= tolPx ? best : null;
}

// ---- Vector utilities ------------------------------------------------
// 
// 
// 

// normalize vector
export function norm(v) {
    const len = Math.hypot(v.x, v.y);
    if (len < 1e-6) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}

// snap relativ la direcția ultimei linii
export function snapToAngleStepRelative(anchor, target, baseDir, stepDeg = 15) {
    const dx = target.x - anchor.x;
    const dy = target.y - anchor.y;
    if (dx === 0 && dy === 0) return target;

    const r = Math.hypot(dx, dy);
    const stepRad = (stepDeg * Math.PI) / 180;

    // unghiul direcției de bază (ultima linie)
    const angBase = Math.atan2(baseDir.y, baseDir.x);
    // unghiul direcției către target
    const angTarget = Math.atan2(dy, dx);

    let rel = angTarget - angBase;
    // normalizare în (-π, π]
    if (rel <= -Math.PI) rel += 2 * Math.PI;
    if (rel > Math.PI) rel -= 2 * Math.PI;

    const snappedRel = Math.round(rel / stepRad) * stepRad;
    const angFinal = angBase + snappedRel;

    return {
        x: anchor.x + r * Math.cos(angFinal),
        y: anchor.y + r * Math.sin(angFinal),
    };
}
//verfifica distanta dintre 2 puncte daca este minLen si daca nu , modifica pozitia punctelor.
// daca punctele sun coliniare nu modificam pozitia punctului p2
export const ensureMinimumLen = (p0, p1, p2, minLen) => {
    if (p0) {
        const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
        if (Math.abs(cross) < 1e-6) {
            // punctele sunt coliniare, nu modificăm
            return p2;
        }
    }
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len >= minLen) return p2;

    const scale = minLen / (len || 1);
    return {
        x: p1.x + dx * scale,
        y: p1.y + dy * scale,
    };
}
// calculează punctele unui cot (elbow) între 2 segmente care se întâlnesc într-un colț



export function isColiniarAndSameDir(p0, p1, p2) {
    const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

    const cross = v1.x * v2.y - v1.y * v2.x;
    const dot = v1.x * v2.x + v1.y * v2.y;

    // Verificăm coliniaritatea (produs vectorial aproape de 0)
    if (Math.abs(cross) > 1e-6) return false;

    // Verificăm dacă direcțiile sunt aceleași (produs scalar pozitiv)
    if (dot <= 0) return false;

    return true;
}


// calculam DN in px din DN
export const dnToPx = (dnText, M_PER_PX, pipeWidth) => {
    if (!M_PER_PX) {
        return pipeWidth; // no scale available, keep old value
    }
    // user writes "32" => 32 mm
    const raw = String(dnText).trim().replace(",", ".");
    const dnMm = parseFloat(raw);
    if (!dnMm || Number.isNaN(dnMm)) return pipeWidth;

    const diameterMeters = dnMm / 1000; // 32 -> 0.032 m

    // M_PER_PX = m/px  =>  px = m / (m/px)
    const diameterPx = diameterMeters / M_PER_PX;

    return diameterPx;
};

// FUNCTII COMPLEXE ------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------

export function computeElbowFromCorner(
    pPrev,
    pCurr,
    pNext,
    stepDeg,
    pipeWidth,
    pipe_color,
    cotLen
) {
    // vectorii intrare/ieșire
    const vIn = { x: pCurr.x - pPrev.x, y: pCurr.y - pPrev.y };
    const vOut = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    // lungimi
    const lenIn = Math.hypot(vIn.x, vIn.y);
    const lenOut = Math.hypot(vOut.x, vOut.y);
    if (lenIn < 1e-3 || lenOut < 1e-3) return null;

    // normalizați (doar direcția)
    const nIn = { x: vIn.x / lenIn, y: vIn.y / lenIn };
    const nOut = { x: vOut.x / lenOut, y: vOut.y / lenOut };

    // unghiul dintre direcții
    const dot = nIn.x * nOut.x + nIn.y * nOut.y;
    const cosTheta = Math.max(-1, Math.min(1, dot));
    let thetaRad = Math.acos(cosTheta);
    let thetaDeg = (thetaRad * 180) / Math.PI;
    thetaDeg = Math.abs(thetaDeg);

    // vrem doar multipli de stepDeg până la max 90°
    const stepsSnap = Math.round(thetaDeg / stepDeg);
    const snappedDeg = stepsSnap * stepDeg;
    const diff = Math.abs(thetaDeg - snappedDeg);
    const TOL = 0.5; // toleranță

    if (snappedDeg < stepDeg || snappedDeg > 90 || diff > TOL) {
        return null;
    }

    // recalculăm thetaRad după snapped
    thetaRad = (snappedDeg * Math.PI) / 180;

    // cât se întinde cotul pe fiecare segment (lungimea tăiată din teavă pe fiecare parte)
    const LEG = pipeWidth * cotLen;

    // punctele de început și sfârșit (fix la distanța LEG de colț)
    const start = {
        x: pCurr.x - nIn.x * LEG,
        y: pCurr.y - nIn.y * LEG,
    };
    const end = {
        x: pCurr.x + nOut.x * LEG,
        y: pCurr.y + nOut.y * LEG,
    };

    // rază virtuală pentru geometria arcului
    const R = LEG;

    // „handle length” pentru Bézier
    const handle = (4 / 3) * R * Math.tan(thetaRad / 4);

    const cp1 = {
        x: start.x + nIn.x * handle,
        y: start.y + nIn.y * handle,
    };
    const cp2 = {
        x: end.x - nOut.x * handle,
        y: end.y - nOut.y * handle,
    };

    // ---- RIBBON OUTLINE (pt 1 singur Shape cu fill+stroke) ----

    // border subțire, la fel ca la pipe / reducer
    const edgeWidth = Math.max(1.5, pipeWidth / 8);
    const borderWidth = edgeWidth;

    // raza exterioară a țevii: width/2 + edgeWidth
    const outerRadius = pipeWidth / 2 + edgeWidth;

    // raza pe care o desenăm în path, ca să aliniez marginea exterioară a stroke-ului
    const rPath = outerRadius - borderWidth / 2;

    // Bézier helpers pentru centrul cotului
    const bezierPoint = (t) => {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;

        return {
            x:
                mt2 * mt * start.x +
                3 * mt2 * t * cp1.x +
                3 * mt * t2 * cp2.x +
                t2 * t * end.x,
            y:
                mt2 * mt * start.y +
                3 * mt2 * t * cp1.y +
                3 * mt * t2 * cp2.y +
                t2 * t * end.y,
        };
    };

    const bezierTangent = (t) => {
        const mt = 1 - t;
        return {
            x:
                3 * mt * mt * (cp1.x - start.x) +
                6 * mt * t * (cp2.x - cp1.x) +
                3 * t * t * (end.x - cp2.x),
            y:
                3 * mt * mt * (cp1.y - start.y) +
                6 * mt * t * (cp2.y - cp1.y) +
                3 * t * t * (end.y - cp2.y),
        };
    };

    // rezoluție outline dinamică, în funcție de DN
    const stepsOutline = Math.max(25, Math.round(pipeWidth / 3));
    const outlineTop = [];
    const outlineBottom = [];

    for (let i = 0; i <= stepsOutline; i++) {
        const t = i / stepsOutline;
        const C = bezierPoint(t);
        const T = bezierTangent(t);
        const lenT = Math.hypot(T.x, T.y) || 1;
        const tx = T.x / lenT;
        const ty = T.y / lenT;

        // normală la tangentă
        const nx = -ty;
        const ny = tx;

        outlineTop.push({
            x: C.x + nx * rPath,
            y: C.y + ny * rPath,
        });
        outlineBottom.push({
            x: C.x - nx * rPath,
            y: C.y - ny * rPath,
        });
    }

    return {
        start,
        end,
        cp1,
        cp2,
        color: pipe_color,
        width: pipeWidth,
        LEG,               // cât tai din fiecare segment
        outlineTop,        // pt Shape: sus
        outlineBottom,     // pt Shape: jos
    };
}

// helper – builds a reducer on a straight line
// reducer centered on the joint, occupying LEG on each side (like elbow)
function buildReducerForColinear(lastSeg, img, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR) {
    const anchor = lastSeg.end; // joint point

    // forward direction (toward click)
    const vFwd = {
        x: img.x - anchor.x,
        y: img.y - anchor.y,
    };
    const lenFwd = Math.hypot(vFwd.x, vFwd.y);
    if (lenFwd < 1e-3) return null;

    const ux = vFwd.x / lenFwd;
    const uy = vFwd.y / lenFwd;

    const dPrev = lastSeg.width; // IN diameter (same meaning as seg.width)
    const dNext = PIPE_WIDTH;                  // OUT diameter


    // si LEG_out e cat de mult merge 
    const LEG_IN = (dPrev * COT_VISUAL_FACTOR); // into big side
    const LEG_OUT = (dNext * COT_VISUAL_FACTOR); // into small side

    // p0 = big side, going BACK along axis
    const p0 = {
        x: anchor.x - ux * LEG_IN,
        y: anchor.y - uy * LEG_IN,
    };

    // p1 = small side, going FORWARD along axis
    const p1 = {
        x: anchor.x + ux * LEG_OUT,
        y: anchor.y + uy * LEG_OUT,
    };

    return {
        id: Date.now(),
        p0,
        p1,
        dIn: dPrev,
        dOut: dNext,
        color: PIPE_COLOR,
    };
}

export const computePipeSegmentsForClick = (prevSegs, imgRaw, shift, STEP_DEG, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, MIN_SEGMENT_LEN) => {
    // 1) dacă nu avem încă nimic: primul click setează un segment "seed"
    // punem punct care are start si end acelaiși coordonate
    if (prevSegs.length === 0) {
        return {
            nextSegs: [{
                start: { x: imgRaw.x, y: imgRaw.y },
                end: { x: imgRaw.x, y: imgRaw.y },
                color: PIPE_COLOR,
                width: PIPE_WIDTH,
            }],
            newElbow: null,
            newReducer: null
        };
    }

    const lastSeg = prevSegs[prevSegs.length - 1]; // ultimul segment existent
    const anchor = lastSeg.end; // ultimul capăt de țeavă, de aici pleacă noul segment

    // POZIȚIA BRUTĂ A MOUSE-ULUI
    let img = imgRaw;

    // 2) SNAP (global / relativ) – doar dacă e apăsat SHIFT
    if (shift) {
        let snapped;
        // direcția ultimei linii
        const baseDir = norm({
            x: lastSeg.end.x - lastSeg.start.x,
            y: lastSeg.end.y - lastSeg.start.y,
        });
        // dacă nu avem direcție (punct repetat) facem snap global 
        // daca avem , facem snap pe acel punct (merge si pentru punctul de inceput)
        if (baseDir.x === 0 && baseDir.y === 0) {
            snapped = snapToAngleStep(anchor, imgRaw, STEP_DEG);
        } else {
            snapped = snapToAngleStepRelative(anchor, imgRaw, baseDir, STEP_DEG);
        }

        img = snapped;
    }
    //verificam daca segmentul precedent si cel nou sunt coliniare si in aceasi directie
    const isColiniar = isColiniarAndSameDir(lastSeg.start, lastSeg.end, img);

    const nextSegs = [...prevSegs];
    // =====================================================
    // 3) COLINEAR CASE 
    // =====================================================
    if (isColiniar) {
        const sameColor = PIPE_COLOR === lastSeg.color;
        const sameWidth = PIPE_WIDTH === lastSeg.width;

        if (sameColor && sameWidth) {
            nextSegs[nextSegs.length - 1] = {
                ...lastSeg,
                end: { x: img.x, y: img.y },
            };
            return { nextSegs, newElbow: null, newReducer: null };
        }

        const dPrev = lastSeg.width;
        const dNext = PIPE_WIDTH;

        const minimumLen = 2 * dNext * COT_VISUAL_FACTOR;

        img = ensureMinimumLen(null, anchor, img, minimumLen);

        const reducer = buildReducerForColinear(
            lastSeg,
            img,
            PIPE_WIDTH,
            PIPE_COLOR,
            COT_VISUAL_FACTOR
        );

        const { p0, p1 } = reducer;

        nextSegs[nextSegs.length - 1] = {
            ...lastSeg,
            end: { x: p0.x, y: p0.y },
        };

        const newSeg = {
            start: { x: p1.x, y: p1.y },
            end: { x: img.x, y: img.y },
            color: PIPE_COLOR,
            width: PIPE_WIDTH,
        };
        nextSegs.push(newSeg);

        return {
            nextSegs,
            newElbow: null,
            newReducer: reducer,
        };
    }

    // =====================================================
    // 4) NON-COLINEAR CASE – SAME AS BEFORE (for now)
    //    Here you already have logic for elbows.
    //    Later we’ll inject "elbow then reducer" per your matrix.
    // =====================================================

    // nu e coliniar → segment nou cu lungime minimă

    const dPrev = lastSeg.width;
    const dNext = PIPE_WIDTH;

    const minimumLen = 2 * dPrev * COT_VISUAL_FACTOR;

    img = ensureMinimumLen(null, anchor, img, minimumLen);
    nextSegs.push({
        start: { ...anchor },
        end: { x: img.x, y: img.y },
        color: PIPE_COLOR,
        width: dPrev,
    });

    // ELBOW
    if (nextSegs.length >= 2) {
        const s2 = nextSegs[nextSegs.length - 1];
        const s1 = nextSegs[nextSegs.length - 2];

        const elbowGeom = computeElbowFromCorner(
            s1.start,
            s1.end,
            s2.end,
            STEP_DEG,
            PIPE_WIDTH,
            PIPE_COLOR,
            COT_VISUAL_FACTOR
        );

        if (!elbowGeom) {
            return {
                nextSegs,
                newElbow: null,
                newReducer: null,
            };
        }

        // tăiem capetele segmentelor pt. cot
        s1.end = { ...elbowGeom.start };
        s2.start = { ...elbowGeom.end };

        return {
            nextSegs,
            newElbow: {
                id: nextSegs.length,
                ...elbowGeom,
            },
            newReducer: null,
        };
    }

    return {
        nextSegs,
        newElbow: null,
        newReducer: null,
    };
}

// PlanUtils.js

//facem sa vedem HUD cu informatii despre masuratori
// calculeaza informatiile de masurare pentru segmentul curent
///
/////////////////////////////////////////////////

export function formatLengthMeters(meters) {
    if (meters == null || !isFinite(meters)) return "";

    if (meters < 1) {
        const cm = meters * 100;
        // ex: 3.2 cm, 25.0 cm
        const decimals = cm < 10 ? 1 : 0;
        return `${cm.toFixed(decimals)} cm`;
    }

    // ex: 1.20 m, 12.35 m
    return `${meters.toFixed(2)} m`;
}

export function computeMeasureInfo(pipeSegments, hoverPoint, mPerPx) {
    if (!hoverPoint) return null;

    const segCount = pipeSegments?.length || 0;
    const lastSeg = segCount > 0 ? pipeSegments[segCount - 1] : null;
    const anchor = lastSeg ? lastSeg.end : null;

    let angleDeg = 0;

    // --- ANGLE ---
    if (segCount === 1 && anchor) {
        // 1 SEGMENT → angle vs X axis, from anchor to hover
        const vx = hoverPoint.x - anchor.x;
        const vy = hoverPoint.y - anchor.y;
        let a = Math.atan2(vy, vx) * 180 / Math.PI;   // (-180, 180]

        if (a > 180) a -= 360;
        if (a < -180) a += 360;
        angleDeg = Math.abs(a); // 0..180
    } else if (segCount >= 2 && anchor) {
        // 2+ SEGMENTS → angle relative to last segment
        const v1x = lastSeg.end.x - lastSeg.start.x;
        const v1y = lastSeg.end.y - lastSeg.start.y;
        const v2x = hoverPoint.x - anchor.x;
        const v2y = hoverPoint.y - anchor.y;

        const len1 = Math.hypot(v1x, v1y);
        const len2 = Math.hypot(v2x, v2y);

        if (len1 > 1e-6 && len2 > 1e-6) {
            const ux1 = v1x / len1;
            const uy1 = v1y / len1;
            const ux2 = v2x / len2;
            const uy2 = v2y / len2;

            const dot = ux1 * ux2 + uy1 * uy2;       // cos θ
            const cross = ux1 * uy2 - uy1 * ux2;     // sin θ

            let a = Math.atan2(cross, dot) * 180 / Math.PI; // (-180, 180]
            if (a > 180) a -= 360;
            if (a < -180) a += 360;

            angleDeg = Math.abs(a); // 0..180
        } else {
            angleDeg = 0;
        }
    } else {
        // 0 segments → nothing drawn yet; keep 0
        angleDeg = 0;
    }

    // --- LENGTHS (segment + total), in meters / cm ---
    const scale = mPerPx || 0;   // meters per pixel
    let segLenM = 0;
    let totalLenM = 0;

    if (segCount > 0 && anchor) {
        const dxPreview = hoverPoint.x - anchor.x;
        const dyPreview = hoverPoint.y - anchor.y;
        const previewLenPx = Math.hypot(dxPreview, dyPreview);
        segLenM = previewLenPx * scale;
    }

    if (segCount > 0) {
        for (const seg of pipeSegments) {
            const dx = seg.end.x - seg.start.x;
            const dy = seg.end.y - seg.start.y;
            totalLenM += Math.hypot(dx, dy) * scale;
        }
    }

    totalLenM += segLenM;

    const formatLen = (m) => {
        if (!m || m <= 0) return "0 cm";
        if (m < 1) {
            const cm = Math.round(m * 100);
            return `${cm} cm`;
        }
        return `${m.toFixed(2)} m`;
    };

    const segLabel = formatLen(segLenM);
    const totalLabel = formatLen(totalLenM);

    return {
        x: hoverPoint.x,
        y: hoverPoint.y,
        angleDeg,
        segLenM,
        totalLenM,
        segLabel,
        totalLabel,
    };
}