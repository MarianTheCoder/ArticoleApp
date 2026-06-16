import React, { useState } from "react";

import OferteSidebar from "./components/Sidebars/OferteSidebar";
import OferteCoeficientiSidebar from "./components/Sidebars/OferteCoeficientiSidebar";
import OferteContent from "./OferteContent";

const emptyCoeficientEditorState = {
  active: false,
  highlight: false,
  retetaIds: [],
  elementIds: [],
};

export default function OferteWrapper() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMode, setSidebarMode] = useState("oferte");
  const [openOfertaIds, setOpenOfertaIds] = useState(new Set());
  const [coeficientEditorState, setCoeficientEditorState] = useState(emptyCoeficientEditorState);

  const [selectedOferta, setSelectedOferta] = useState(null);
  const [selectedLucrare, setSelectedLucrare] = useState(null);

  const sidebarWidth = sidebarMode === "coeficienti" && coeficientEditorState.active ? "32rem" : "22rem";

  const handleToggleSidebarMode = () => {
    setSidebarMode((prev) => {
      const next = prev === "coeficienti" ? "oferte" : "coeficienti";

      if (next !== "coeficienti") {
        setCoeficientEditorState(emptyCoeficientEditorState);
      }

      return next;
    });
  };

  const handleUpdateSelectedLucrare = (patch) => {
    setSelectedLucrare((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        ...patch,
      };
    });
  };

  return (
    <div className="relative h-full w-full bg-background rounded-lg p-4 overflow-hidden">
      <div
        className="grid h-full w-full transition-[grid-template-columns] duration-300 ease-in-out"
        style={{
          gridTemplateColumns: sidebarOpen ? `${sidebarWidth} minmax(0, 1fr)` : "0rem minmax(0, 1fr)",
        }}
      >
        <div className="h-full min-w-0 overflow-hidden">
          {sidebarMode === "coeficienti" ? (
            <OferteCoeficientiSidebar isCollapsed={!sidebarOpen} selectedLucrare={selectedLucrare} onCoeficientEditorStateChange={setCoeficientEditorState} />
          ) : (
            <>
              <OferteSidebar
                isCollapsed={!sidebarOpen}
                selectedOfertaId={selectedOferta?.id || null}
                selectedLucrareId={selectedLucrare?.id || null}
                onSelectOferta={(oferta) => {
                  setSelectedOferta(oferta);
                  setSelectedLucrare(null);
                }}
                onSelectLucrare={(lucrare, oferta) => {
                  setSelectedOferta(oferta);
                  setSelectedLucrare(lucrare);
                }}
                openOfertaIds={openOfertaIds}
                onOpenOfertaIdsChange={setOpenOfertaIds}
              />
              <OferteCoeficientiSidebar passive selectedLucrare={selectedLucrare} onCoeficientEditorStateChange={setCoeficientEditorState} />
            </>
          )}
        </div>

        <div className="h-full min-w-0 overflow-hidden">
          <OferteContent
            isCollapsed={!sidebarOpen}
            onToggleCollapse={() => setSidebarOpen((prev) => !prev)}
            sidebarMode={sidebarMode}
            onToggleSidebarMode={handleToggleSidebarMode}
            selectedOferta={selectedOferta}
            selectedLucrare={selectedLucrare}
            coeficientEditorState={coeficientEditorState}
            onUpdateSelectedLucrare={handleUpdateSelectedLucrare}
          />
        </div>
      </div>
    </div>
  );
}
