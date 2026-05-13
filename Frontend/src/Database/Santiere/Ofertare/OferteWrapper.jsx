import React, { useState } from "react";

import OferteSidebar from "./OferteSidebar";
import OferteContent from "./OferteContent";

export default function OferteWrapper() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedOferta, setSelectedOferta] = useState(null);
  const [selectedLucrare, setSelectedLucrare] = useState(null);

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
          gridTemplateColumns: sidebarOpen ? "24rem minmax(0, 1fr)" : "4rem minmax(0, 1fr)",
        }}
      >
        <div className="h-full min-w-0 overflow-hidden">
          <OferteSidebar
            isCollapsed={!sidebarOpen}
            onToggleCollapse={() => setSidebarOpen((prev) => !prev)}
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
          />
        </div>

        <div className="h-full min-w-0 overflow-hidden">
          <OferteContent sidebarOpen={sidebarOpen} selectedOferta={selectedOferta} selectedLucrare={selectedLucrare} onUpdateSelectedLucrare={handleUpdateSelectedLucrare} />
        </div>
      </div>
    </div>
  );
}
