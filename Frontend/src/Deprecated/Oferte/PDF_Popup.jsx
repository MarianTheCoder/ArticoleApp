import { faFilePdf, faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react'
import { useParams } from 'react-router-dom';
import { FormularRasfiratFR } from '../Formulare/Franta/FormularRasfiratFR';
import { FormularRasfirat } from '../Formulare/Romania/FormularRasfirat';
import { FormularCompact } from '../Formulare/Romania/FormularCompact';
import { FormularCompactFR } from '../Formulare/Franta/FormularCompactFR';
import { FormularMaterialeCantitateFR } from '../Formulare/Franta/FormularMaterialeCantitateFR';
import { all } from 'axios';
import { FormularUltraCompactToateFR } from '../Formulare/Franta/FormularUltraCompactToateFR';
import { FormularUltraCompactToate } from '../Formulare/Romania/FormularUltraCompactToate';

import { FormularCompactToateFR } from '../Formulare/Franta/FormularCompactToateFR';
import { FormularCompactToate } from '../Formulare/Romania/FormularCompactToate';

import { FormularUltraCompactFR } from '../Formulare/Franta/FormularUltraCompactFR';
import { FormularUltraCompact } from '../Formulare/Romania/FormularUltraCompact';

import { FormularMaterialeCantitate } from '../Formulare/Romania/FormularMaterialeCantitate';

export default function PDF_Popup({ allLucrari = false, TVA, recapitulatii, reper1, reper2, oferta_part_id, setIsGenerareOpen }) {
  const { idUser, idSantier, limbaUser } = useParams();


  // 
  //  CELE DIN ROMANIA TREBUIE MODIFICATE, NU SUNT TESTATE SAU REFACUTE
  // 
  return (
    <div className='w-full h-full flex flex-col p-4 text-white'>
      {/* Content container with flex-grow and min-h-0 to allow shrinking */}
      <div className='flex-1 min-h-0 grid grid-rows-[1fr_auto_1fr] gap-4'>
        {/* === PDF LANDSCAPE === */}
        <div className='flex flex-col rounded-xl p-4 shadow overflow-hidden'>
          <h2 className='text-xl font-semibold mb-4 text-white'>PDF Landscape</h2>
          <div className='text-base grid grid-cols-2 md:grid-cols-4 gap-3'>
            {
              allLucrari ? (
                <>
                  <button
                    onClick={() => limbaUser == 'RO'
                      ? FormularUltraCompactToate(oferta_part_id, recapitulatii, TVA, reper1, reper2)
                      : FormularUltraCompactToateFR(oferta_part_id, recapitulatii, TVA, reper1, reper2)}
                    className='bg-blue-500 hover:bg-blue-600 py-4 rounded-lg font-medium'
                  >
                    PDF Ultra Compact
                  </button>
                  <button
                    onClick={() => limbaUser == 'RO'
                      ? FormularCompactToate(oferta_part_id, recapitulatii, TVA, reper1, reper2)
                      : FormularCompactToateFR(oferta_part_id, recapitulatii, TVA, reper1, reper2)}
                    className='bg-blue-500 hover:bg-blue-600 py-4 rounded-lg font-medium'
                  >
                    PDF Compact
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => limbaUser == 'RO'
                      ? FormularRasfirat(oferta_part_id, recapitulatii, TVA, reper1, reper2)
                      : FormularRasfiratFR(oferta_part_id, recapitulatii, TVA, reper1, reper2)}
                    className='bg-blue-500 hover:bg-blue-600 py-4 rounded-lg font-medium'
                  >
                    PDF Retete Extins
                  </button>
                  <button
                    onClick={() => limbaUser == 'RO'
                      ? FormularCompact(oferta_part_id, recapitulatii, TVA, reper1, reper2)
                      : FormularCompactFR(oferta_part_id, recapitulatii, TVA, reper1, reper2)}
                    className='bg-blue-500 hover:bg-blue-600 py-4 rounded-lg font-medium'>
                    PDF Retete Compact
                  </button>
                  <button
                    onClick={() => limbaUser == 'RO'
                      ? FormularUltraCompact(oferta_part_id, recapitulatii, TVA, reper1, reper2) // DE MODIFICAT !!
                      : FormularUltraCompactFR(oferta_part_id, recapitulatii, TVA, reper1, reper2)}
                    className='bg-blue-500 hover:bg-blue-600 py-4 rounded-lg font-medium'
                  >
                    PDF Retete Ultra Compact
                  </button>
                  <button className='bg-blue-500 hover:bg-blue-600 py-4 rounded-lg font-medium'>Gol</button>
                </>)}
          </div>
        </div>

        {/* DIVIDER */}
        <div className='w-full p-0.5 rounded-xl bg-white'></div>

        {/* === PDF PORTRAIT === */}
        <div className='flex flex-col rounded-xl p-4 shadow overflow-hidden'>
          <h2 className='text-xl font-semibold mb-4 text-white'>PDF Portrait</h2>
          <div className='text-base grid grid-cols-2 md:grid-cols-4 gap-3'>
            {allLucrari ? (
              <>
                <button
                  className='bg-green-500 hover:bg-green-600 py-4 rounded-lg font-medium'
                >
                  Gol
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => limbaUser == 'RO'
                    ? FormularMaterialeCantitate(oferta_part_id, recapitulatii, TVA, reper1, reper2)
                    : FormularMaterialeCantitateFR(oferta_part_id, recapitulatii, TVA, reper1, reper2)}
                  className='bg-green-500 hover:bg-green-600 py-4 rounded-lg font-medium'>
                  Materiale Cantitate
                </button>
                <button className='bg-green-500 hover:bg-green-600 py-4 rounded-lg font-medium'>Gol</button>
                <button className='bg-green-500 hover:bg-green-600 py-4 rounded-lg font-medium'>Gol</button>
                <button className='bg-green-500 hover:bg-green-600 py-4 rounded-lg font-medium'>Gol</button>
              </>
            )}
          </div>
        </div>
      </div >

      {/* Close button container - fixed height and margin-top */}
      <div div className='flex-shrink-0 mt-4 flex w-full justify-end gap-4 p-2' >
        <button
          onClick={() => setIsGenerareOpen(false)}
          className='bg-red-500 flex text-base items-center justify-center gap-2 text-black hover:bg-red-600 h-12 px-6 py-2 rounded-xl'
        >
          <FontAwesomeIcon icon={faX} />
          <span className="leading-none">Închide</span>
        </button>
      </div >
    </div >
  )
}


//CE FROMULAR SELECTAM?
//   const handleFormular = () => {
//     // console.log(mainOfertaPartID);
//     switch (selectedFormular) {
//       case 'Deviz General':
//         FormularDevizGeneral(mainOfertaPartID, recapitulatii, TVA)
//         break;
//       case 'Răsfirat':
//         FormularRasfirat(mainOfertaPartID, recapitulatii, TVA)
//         break;
//       case 'Compact':
//         FormularCompact(mainOfertaPartID, recapitulatii, TVA);
//         break;
//       case "CompactFR":
//         FormularCompactFR(mainOfertaPartID, recapitulatii, TVA);
//         break;
//       case "RăsfiratFR":
//         FormularRasfiratFR(idSantier, mainOfertaPartID, recapitulatii, TVA);
//         break;

//       default:
//         break;
//     }
//   }

{/* <div className="flex flex-col h-full text-sm items-center justify-center">
                <label htmlFor="unit" className=" font-medium text-black">
                  Selecteaza un formular
                </label>
                {limbaUser == "RO" ?
                  <select
                    value={selectedFormular}
                    onChange={(e) => setSelectedFormular(e.target.value)}
                    className=" px-2 py-2 w-56 text-black  rounded-lg outline-none shadow-sm "
                  >
                    <option value="Deviz General">Formular Deviz General</option>
                    <option value="Răsfirat">Formular Răsfirat</option>
                    <option value="Compact">Formular Compact</option>
                  </select>
                  :
                  <select
                    value={selectedFormular}
                    onChange={(e) => setSelectedFormular(e.target.value)}
                    className=" px-2 py-2 w-56 text-black  rounded-lg outline-none shadow-sm "
                  >
                    <option value="RăsfiratFR">Formular Răsfirat FR</option>
                    <option value="CompactFR">Formular Compact FR</option>
                  </select>
                }
              </div> */}