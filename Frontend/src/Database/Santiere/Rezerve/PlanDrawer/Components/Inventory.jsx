import React, { useMemo, useState } from "react";
import { norm } from "../../PlanUtils.jsx"; // Ajustează calea dacă e nevoie

export default function Inventory({ chains, tJoints, M_PER_PX }) {
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── Calculatorul pentru Extrasul de Materiale (BOM) ────────────────────────
  const bomGroups = useMemo(() => {
    const groups = {};

    const addGroup = (type, key, name, color, value, itemDetails) => {
      if (!groups[key]) groups[key] = { type, key, name, color, items: [], total: 0 };
      groups[key].items.push(itemDetails);
      groups[key].total += value;
    };

    // Parcurgem toate lanțurile
    chains.forEach((chain) => {
      // 1. ȚEVI (Segmente)
      chain.segments.forEach((s) => {
        const lenPx = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
        if (lenPx < 1e-3) return; // Ignorăm semințele
        const lenM = lenPx * (M_PER_PX || 1); // Transformăm în metri
        const dn = s.dn || "?";

        // Grupăm după DN și Culoare
        addGroup("pipe", `pipe_${dn}_${s.color}`, `Țeavă DN ${dn}`, s.color, lenM, { id: s.id, lenM });
      });

      // 2. COTURI (Elbows)
      chain.elbows.forEach((e) => {
        // Calculăm unghiul matematic din cele două brațe ale cotului
        let angle = 90;
        if (e.start && e.end && e.corner) {
          const v1 = norm({ x: e.start.x - e.corner.x, y: e.start.y - e.corner.y });
          const v2 = norm({ x: e.end.x - e.corner.x, y: e.end.y - e.corner.y });
          const dot = v1.x * v2.x + v1.y * v2.y;
          angle = Math.round(Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI));
        }

        // Luăm DN-ul și Culoarea de la segmentul care intră în cot
        const sourceSeg = chain.segments.find((s) => s.id === e.seg1Id);
        const dn = e.dn || sourceSeg?.dn || "?";
        const color = e.color || sourceSeg?.color || "#000";

        // Grupăm după DN, Unghi și Culoare
        addGroup("elbow", `elbow_${dn}_${angle}_${color}`, `Cot ${angle}° DN ${dn}`, color, 1, { id: e.id });
      });

      // 3. REDUCȚII
      chain.reducers.forEach((r) => {
        const dnIn = r.dnStart || "?";
        const dnOut = r.dnEnd || "?";

        // Grupăm după DN In -> DN Out și Culoare
        addGroup("reducer", `red_${dnIn}_${dnOut}_${r.color}`, `Reducție DN ${dnIn}-${dnOut}`, r.color, 1, { id: r.id });
      });
    });

    // 4. TEURI / RAMIFICAȚII (T-Joints / Y-Joints)
    tJoints.forEach((t) => {
      const type = t.type || "T";
      // Grupăm după Tip (T/Y), DN Principal, DN Ramificație și Culoare
      addGroup("joint", `joint_${type}_${t.dnMain}_${t.dnBranch}_${t.color}`, `Teu (${type}) DN ${t.dnMain}-${t.dnBranch}`, t.color, 1, { id: t.id });
    });

    // Transformăm obiectul într-un array pentru a-l randa mai ușor
    return Object.values(groups).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  }, [chains, tJoints, M_PER_PX]);

  // Formator pentru lungimi
  const formatLen = (m) => (m < 1 ? `${Math.round(m * 100)} cm` : `${m.toFixed(2)} m`);

  if (bomGroups.length === 0) return null;

  return (
    <div className="absolute left-3 top-3 z-50 bg-slate-900 text-white rounded-xl shadow-xl w-72 flex flex-col max-h-[85vh] border border-slate-700 overflow-hidden pointer-events-auto">
      <div className="bg-slate-800 px-4 py-3 font-bold text-sm tracking-widest text-slate-300 uppercase border-b border-slate-700">📝 Materiale ({bomGroups.length})</div>

      <div className="overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
        {bomGroups.map((group) => {
          const isExpanded = expandedGroups[group.key];
          return (
            <div key={group.key} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              {/* Header Grup */}
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => toggleGroup(group.key)}>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-slate-500" style={{ backgroundColor: group.color }} />
                  <span className="text-sm font-semibold">{group.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-blue-400">{group.type === "pipe" ? formatLen(group.total) : `${group.total} buc`}</span>
                  <span className="text-slate-400 text-xs">{isExpanded ? "▼" : "▶"}</span>
                </div>
              </div>

              {/* Detalii extinse (Lista individuală) */}
              {isExpanded && group.type === "pipe" && (
                <div className="bg-slate-900 p-2 border-t border-slate-700">
                  {group.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-400 py-1 px-2 hover:bg-slate-800 rounded">
                      <span>Bucata {idx + 1}</span>
                      <span>{formatLen(item.lenM)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
