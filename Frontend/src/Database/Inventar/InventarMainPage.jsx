import React, { useState } from "react";
import { useParams } from "react-router-dom";

import SpinnerElement from "@/MainElements/SpinnerElement";
import { useInventar } from "@/hooks/Database/useInventar";
import InventarSumar from "./Sumar/InventarSumar";
import InventarMateriale from "./Materiale/InventarMateriale";
import InventarUtilaje from "./Utilaje/InventarUtilaje";
import InventarTransport from "./Transport/InventarTransport";

export default function InventarMainPage() {
  const { idInventar } = useParams();
  const { data, isFetching } = useInventar(idInventar);
  const inventar = data?.item || null;

  const [selectedButton, setSelectedButton] = useState(1);

  const getBtnClass = (index) => {
    const isActive = selectedButton === index;
    const base = "relative w-40 text-foreground font-semibold tracking-wide transition-all duration-[150ms] px-6 p-3 xxxl:px-4 rounded-tr-[4rem] rounded-tl-2xl hover:-translate-y-1";
    const active = "bg-primary text-white -translate-y-1 shadow-[8px_8px_15px_rgba(0,0,0,1)] z-40";
    const inactive = "bg-background shadow-[2px_2px_10px_rgba(0,0,0,1)]";
    const zIndex = `z-[${50 - index * 10}]`;

    return `${base} ${isActive ? active : inactive} ${zIndex}`;
  };

  return (
    <div className="relative h-screen w-full flex text-sm leading-tight items-center justify-center">
      <div className="w-[96%] h-90h relative flex justify-center rounded-lg">
        <div className="absolute -top-9 left-8 -space-x-2 select-none flex">
          <button onClick={() => setSelectedButton(1)} className={`z-50 ${getBtnClass(1)}`}>
            Sumar
          </button>
          <button onClick={() => setSelectedButton(2)} className={`z-40 ${getBtnClass(2)}`}>
            Materiale
          </button>
          <button onClick={() => setSelectedButton(3)} className={`z-30 ${getBtnClass(3)}`}>
            Utilaje
          </button>
          <button onClick={() => setSelectedButton(4)} className={`z-20 ${getBtnClass(4)}`}>
            Transport
          </button>
        </div>

        <div className="bg-background relative z-50 w-full h-full flex flex-col items-center rounded-lg overflow-hidden">
          {isFetching ? (
            <div className="h-full w-full flex items-center justify-center">
              <SpinnerElement text={2} />
            </div>
          ) : !inventar ? (
            <div className="h-full w-full flex items-center justify-center text-center">
              <p className="text-lg font-black text-foreground">Inventarul nu a fost găsit.</p>
            </div>
          ) : (
            <>
              {selectedButton === 1 && <InventarSumar />}
              {selectedButton === 2 && <InventarMateriale />}
              {selectedButton === 3 && <InventarUtilaje />}
              {selectedButton === 4 && <InventarTransport />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
