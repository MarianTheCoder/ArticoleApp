import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import api from '../../../api/axiosAPI.jsx';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowDownAZ, faArrowDownShortWide, faArrowRotateRight, faArrowUpAZ, faCancel, faCar, faChevronDown, faChevronRight, faCopy, faEllipsis, faEquals, faFileExport, faFolder, faL, faPenToSquare, faPerson, faPlus, faTrashCan, faTrowelBricks, faTruck, faUser } from '@fortawesome/free-solid-svg-icons';
import photoAPI from '../../../api/photoAPI.jsx';
import SantiereAddReteteTable from './SantiereAddReteteTableAbsolute.jsx';
import { useParams } from 'react-router-dom';
import CostInputCell from './CostCell.jsx';

import TextAreaCell from './TextareaCell.jsx';
import PDF_Popup from './PDF_Popup.jsx';
import { useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { OverflowPopover } from '../OverflowPopover.jsx';





export default function SantiereAllPartsForExport({ mainOfertaPartID, ofertaId }) {

  const { idSantier, limbaUser } = useParams();

  const [openDropdowns, setOpenDropdowns] = useState(new Set());
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isGenerareOpen, setIsGenerareOpen] = useState(false);


  const [retete, setRetete] = useState([]);
  const [detailedCosts, setDetailedCosts] = useState({});
  const [ascendent, setAscendent] = useState(false);

  const [filters, setFilters] = useState({
    cod: '',
    clasa: '',
    articol: '',
  });

  const [TVA, setTVA] = useState(24);
  const [recapitulatii, setRecapitulatii] = useState(10);
  const [finalData, setFinalData] = useState({
    oreManopera: 0,
    manopera: 0,
    materiale: 0,
    transport: 0,
    utilaje: 0,
    cheltuieliDirecte: 0,
  })
  const [selectedFormular, setSelectedFormular] = useState(limbaUser == 'RO' ? 'Răsfirat' : 'RăsfiratFR');


  const [localReper1, setLocalReper1] = useState("");
  const [localReper2, setLocalReper2] = useState("");

  const [localLimba, setLocalLimba] = useState("RO");

  useEffect(() => {
    setLocalLimba(limbaUser);
  }, [limbaUser]);



  // useEffect(() => {
  //   if (oferteParts) {
  //     const currentPart = oferteParts.find(part => part.id === parseInt(mainOfertaPartID));
  //     setLocalReper1(currentPart.reper1 || "");
  //     setLocalReper2(currentPart.reper2 || "");
  //   }
  // }, [oferteParts]);
  const fetchManopere = async () => {
    try {
      const { data } = await api.get(`/Santiere/getReteteByOfertaWithPrices/${ofertaId}`, {
        params: { asc_articol: ascendent },
      });

      // construiești lista de rânduri (cum aveai)
      let dum = [];
      for (const part of data.parts) {
        dum.push({
          partId: part.partId,
          partName: part.partName,
          parentId: part.partId + 'z',
          reper1: part.reper.reper1,
          reper2: part.reper.reper2,
        });
        dum = dum.concat(part.retete);
      }
      setRetete(dum);
      console.log("Fetched retete:", data.parts);
      // ⭐ merge toate detailedCosts din fiecare part într-un singur obiect
      const merged = Object.assign({}, ...data.parts.map(p => p.detailedCosts || {}));
      setDetailedCosts(merged);   // ← acum handleFinalData va avea TOATE rețetele
      setOpenDropdowns(new Set());
    } catch (e) {
      console.error('Error fetching data:', e);
      setRetete([]);
      setDetailedCosts({});
    }
  };


  useEffect(() => {
    fetchManopere();
  }, [ascendent]);

  useEffect(() => {
    // console.log(detailedCosts);
    if (detailedCosts) {
      handleFinalData();
    }
  }, [detailedCosts]);



  const handleFinalData = () => {
    let totalTime = 0;
    let totalManopere = 0;
    let totalMateriale = 0;
    let totalUtilaje = 0;
    let totalTransport = 0;
    Object.keys(detailedCosts).forEach(retetaId => {
      const manopere = detailedCosts[retetaId].Manopera;
      const materiale = detailedCosts[retetaId].Material;
      const utilaje = detailedCosts[retetaId].Utilaj;
      const transport = detailedCosts[retetaId].Transport;
      const reteta_quantity = parseFloat(detailedCosts[retetaId].cantitate_reteta);

      let nowTime = 0;
      let nowManopere = 0;
      let nowMateriale = 0;
      let nowUtilaje = 0;
      let nowTransport = 0;

      Object.entries(manopere).forEach(([itemId, { cost, cantitate }]) => {
        nowTime = parseFloat(cantitate) + nowTime;
        nowManopere += parseFloat(cost) * parseFloat(cantitate);
      });
      totalTime = totalTime + nowTime * reteta_quantity;
      totalManopere = totalManopere + nowManopere * reteta_quantity;

      Object.entries(materiale).forEach(([itemId, { cost, cantitate }]) => {
        nowMateriale += parseFloat(cost) * parseFloat(cantitate);
      });
      totalMateriale = totalMateriale + nowMateriale * reteta_quantity;

      Object.entries(utilaje).forEach(([itemId, { cost, cantitate }]) => {
        nowUtilaje += parseFloat(cost) * parseFloat(cantitate);
      });
      totalUtilaje = totalUtilaje + nowUtilaje * reteta_quantity;

      Object.entries(transport).forEach(([itemId, { cost, cantitate }]) => {
        nowTransport += parseFloat(cost) * parseFloat(cantitate);
      });
      totalTransport = totalTransport + nowTransport * reteta_quantity;
    });

    let totalDirecte = totalManopere + totalMateriale + totalTransport + totalUtilaje;
    setFinalData({
      oreManopera: totalTime,
      manopera: totalManopere,
      materiale: totalMateriale,
      transport: totalTransport,
      utilaje: totalUtilaje,
      cheltuieliDirecte: totalDirecte,
    })
  }


  const parentIds = useMemo(
    () => (retete || []).filter(r => !r.parentId).map(r => r.id),
    [retete]
  );
  const allOpen = useMemo(
    () => parentIds.length > 0 && parentIds.every(id => openDropdowns.has(id)),
    [parentIds, openDropdowns]
  );

  const toggleAllDropdowns = async () => {
    try {
      if (allOpen) {
        // CLOSE ALL currently open parents
        const toClose = Array.from(openDropdowns); // snapshot
        for (const id of toClose) {
          await toggleDropdown(id, false); // falsy second arg = close branch in your logic
        }
      } else {
        // OPEN all parents that are not open
        const toOpen = parentIds.filter(id => !openDropdowns.has(id));
        for (const id of toOpen) {
          await toggleDropdown(id); // same logic you already use
        }
      }
    } catch (error) {
      console.error("Error toggling all dropdowns:", error);
    }
  };


  const toggleDropdown = async (parentId) => {
    const isAlreadyOpen = openDropdowns.has(parentId);
    //aici e inchiderea standard
    if (isAlreadyOpen) {
      // Remove children from retete and mark dropdown as closed
      setRetete((prev) => prev.filter(item => item.parentId !== parentId));
      setOpenDropdowns((prev) => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    } else {
      //aici intram daca nu e deschis si verificam mai jos daca sunt in  edit
      try {
        const response = await api.get(`/Santiere/getSpecificRetetaForOfertaInitiala/${parentId}`);
        const children = [
          ...response.data.manopera,
          ...response.data.materiale,
          ...response.data.utilaje,
          ...response.data.transport,
        ].map(item => ({
          ...item,
          parentId,
        }));

        setRetete((prev) => {
          const index = prev.findIndex(item => item.id === parentId && !item.parentId);
          if (index === -1) return prev;
          const newList = [...prev];
          newList.splice(index + 1, 0, ...children);
          return newList;
        });

        setOpenDropdowns((prev) => {
          const newSet = new Set(prev);
          newSet.add(parentId);
          return newSet;
        });
      } catch (err) {
        console.error("Error fetching preview:", err);
      }
    }
  };


  const columns = useMemo(() => [
    {
      accessorKey: "Dropdown",
      header: (
        <div className='flex justify-center items-center h-full w-full'>
          <FontAwesomeIcon
            onClick={toggleAllDropdowns}
            className='text-blue-500 hover:text-blue-600 cursor-pointer text-xl' icon={faArrowDownShortWide} />
        </div>
      ),
      cell: ({ row, getValue, cell }) => (
        <div onClick={() => toggleDropdown(cell.row.original.id)} className='flex justify-center h-full  select-none w-full dropdown-container overflow-hidden cursor-pointer items-center'>
          <FontAwesomeIcon className={` ${openDropdowns.has(cell.row.original.id) ? "rotate-90" : ""}  text-center  text-xl`} icon={faChevronRight} />
        </div>
      ),
    },
    {
      accessorKey: "logo",
      header: "Logo",
      cell: ({ row, getValue, cell }) => (
        row.original.whatIs == 'Manopera' ?
          <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-green-500 h-[1.5rem] w-full ' icon={faUser} /></div>
          :
          row.original.whatIs == 'Material' ?
            <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-amber-500 h-[1.5rem] w-full ' icon={faTrowelBricks} /></div>
            :
            row.original.whatIs == 'Utilaj' ?
              <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-violet-500 h-[1.5rem] w-full  ' icon={faTruck} /></div>
              :
              row.original.whatIs == 'Transport' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-pink-500 h-[1.5rem] w-full  ' icon={faCar} /></div>
                :
                <div onClick={() => console.log(retete)} className='w-full h-full flex justify-center items-center overflow-hidden '><FontAwesomeIcon className='text-blue-500 h-[1.5rem]   ' icon={faFolder} /></div>
      ),

    },
    {
      accessorKey: "detalii_aditionale",
      header: (
        <div className="">
          {localReper1 || "Eroare"}
        </div>
      ),
      size: 100,
      cell: ({ getValue, row }) => {
        return (
          <TextAreaCell
            rowId={row.original.id}
            whatIs={row.original.whatIs || "Reteta"}
            initialValue={getValue() || ""}
            isEditable={false}
            maxLines={2}
            // onEdit={handleDetaliiChange}
            bold={false}
          // fromTop={15}
          // absoluteInput={true}
          // translateXNegative={90}
          // arrowPos={110}
          />
        );
      },
    },
    {
      accessorKey: "reper_plan",
      header:
        <div className="">
          {localReper2 || "Eroare"}
        </div>
      ,
      size: 100,
      cell: ({ getValue, row }) => {
        return (
          <TextAreaCell
            rowId={row.original.id}
            whatIs={row.original.whatIs || "Reteta"}
            initialValue={getValue() || ""}
            maxLines={2}
            isEditable={false}
            // onEdit={handleReperChange}
            bold={false}
          // fromTop={15}
          // absoluteInput={true}
          // translateX={60}
          // arrowPos={50}
          />
        );
      },
    },
    { accessorKey: "furnizor", header: "Furnizor", size: 80 },
    {
      accessorKey: "cod",
      header: "Cod",
      cell: ({ getValue }) => (
        <div className=' font-semibold'>{getValue() ? getValue() : ""}</div>
      ),
      size: 120
    },
    {
      accessorKey: "clasa",
      header: "Clasă",
      cell: ({ getValue }) => (
        <div className=''>{getValue() ? getValue() : ""}</div>
      ),
      size: 150
    },
    {
      accessorKey: "articol_client",
      header: "Articol Client",
      size: 150,
      cell: ({ getValue, row }) => {
        return (
          <TextAreaCell
            rowId={row.original.id}
            whatIs={row.original.whatIs || "Reteta"}
            initialValue={getValue() || ""}
            maxLines={2}
            isEditable={false}
            // onEdit={handleArticolClientChange}
            bold={false}
          // absoluteWidth={"32rem"}
          // absoluteInput={true}
          // arrowPos={50}
          // fromTop={15}
          />
        );
      },
    },
    {
      accessorKey: "articol",
      header: (
        <div className="flex items-center w-[95%]  justify-between text-black ">
          <span>Articol</span>
          <span className='flex items-center'>Limba:
            <span onClick={() => setLocalLimba(prev => prev == 'RO' ? 'FR' : 'RO')} className='ml-2 text-green-600 border-2 hover:text-green-500 hover:border-green-500 cursor-pointer border-green-600 rounded-full aspect-square min-w-[2rem] flex items-center justify-center'>
              {localLimba}
            </span>
          </span>
        </div>
      ),
      cell: ({ getValue, row }) => {
        return <OverflowPopover text={localLimba === 'RO' ? getValue() || "..." : row.original.articol_fr || "..."} maxLines={2} />;
      },
      size: 300
    },
    {
      accessorKey: "descriere",
      header: (
        <div className="flex items-center w-[95%] justify-between text-black ">
          <span>Descriere</span>
        </div>
      ),
      cell: ({ getValue, row }) => {
        return <OverflowPopover text={localLimba === 'RO' ? getValue() || "" : row.original.descriere_fr || ""} maxLines={2} />;
      },
      size: 200
    },
    {
      accessorKey: 'whatIs',
      header: 'Tip',
      size: 100,
      cell: ({ getValue, row }) => getValue() ? <div className='w-full'>{row.original.whatIs == "Material" ? getValue() + " " + row.original.tip_material : getValue()}</div> : 'Rețetă', // Display default value if the value is empty or undefined
    },
    { accessorKey: "unitate_masura", header: "Unitate", size: 60 },
    {
      accessorKey: "photo",
      header: "Poză",
      cell: ({ getValue }) => (
        getValue() ?
          <div className='flex w-full overflow-hidden justify-center items-center'>
            <img
              src={`${photoAPI}/${getValue()}`}  // Concatenate the base URL with the value
              alt="Product"
              className="h-[2.3rem] min-w-[2rem] max-w-28 object-cover"
              style={{ objectFit: 'cover' }}
            />
          </div>
          :
          ""
      ),
      size: 70
    },
    {
      accessorKey: "cantitate",
      header: "Cantitate",
      cell: ({ getValue, row }) => {
        return (
          <CostInputCell
            rowId={row.original.id}
            whatIs={row.original.whatIs || "Reteta"}
            initialValue={getValue()}
            isEditable={false}
            // onEdit={handleCantiatateChange} // optional
            bold={false}
          />
        );
      },
      size: 70
    },
    {
      accessorKey: "cost",
      header: "Preț Unitar",
      cell: ({ getValue, row }) => {
        return (
          <CostInputCell
            rowId={row.original.id}
            whatIs={row.original.whatIs || "Reteta"}
            initialValue={getValue()}
            isEditable={false}
            // onEdit={handleCostChange} // optional
            bold={true}
          />
        );
      },
      size: 80
    },
    {
      accessorKey: "pret_total",
      header: "Pret Total",
      cell: ({ getValue, row }) => {

        return (
          <span className='font-semibold'>{(row.original.cost * row.original.cantitate).toFixed(2)}</span>
        )
      },
      size: 80
    },
  ], [retete, ascendent, limbaUser, localReper1, localReper2]);

  const table = useReactTable({
    data: retete,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    state: {
      columnResizing: {},
    },
  });


  const scrollParentRef = useRef(null);

  // All flat rows from TanStack (what you currently map)
  const allRows = table.getRowModel().rows;

  // Virtualizer: only render the visible slice
  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 40,   // ≈ row height in px; tweak to your actual row height (36–44)
    getItemKey: (index) => allRows[index]?.id ?? index,
    overscan: 10,             // render a few extra rows above/below viewport
  });

  // Spacers
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop =
    virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  // Number of visible columns (for spacer cells to span across the whole table)
  const visibleColCount = table.getVisibleLeafColumns().length;

  // e header de lucrare dacă are partName
  const isPartHeader = (row) => !!row?.original?.partName;

  // primul index vizibil
  const firstVI = virtualItems[0];
  const firstIndex = firstVI ? firstVI.index : 0;

  // găsește ultimul header de lucrare deasupra primului rând vizibil
  let currentHeaderIndex = null;
  for (let i = firstIndex; i >= 0; i--) {
    if (isPartHeader(allRows[i])) {
      currentHeaderIndex = i;
      break;
    }
  }

  const currentPartName =
    currentHeaderIndex != null ? allRows[currentHeaderIndex].original.partName : null;


  const theadRef = useRef(null);
  const [stickyTop, setStickyTop] = useState(0);

  useLayoutEffect(() => {
    let raf1, raf2;

    const update = () => {
      const h = theadRef.current?.offsetHeight ?? 0;
      setStickyTop(h);
    };

    // măsoară după layout + încă o dată în următorul frame
    raf1 = requestAnimationFrame(() => {
      update();
      raf2 = requestAnimationFrame(update);
    });

    // re-măsoară când headerul își schimbă înălțimea
    const ro = new ResizeObserver(update);
    if (theadRef.current) ro.observe(theadRef.current);

    // când fonturile au încărcat, înălțimea se poate schimba
    if (document.fonts?.ready) {
      document.fonts.ready.then(update).catch(() => { });
    }

    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);


  // extrage reper1/reper2 din acel header
  const currentHeaderRow = currentHeaderIndex != null ? allRows[currentHeaderIndex] : null;
  const curRep1 = currentHeaderRow?.original?.reper1 ?? 'Reper 1';
  const curRep2 = currentHeaderRow?.original?.reper2 ?? 'Reper 2';
  // actualizează state doar când se schimbă
  useEffect(() => {
    setLocalReper1((p) => (p !== curRep1 ? curRep1 : p));
    setLocalReper2((p) => (p !== curRep2 ? curRep2 : p));
  }, [curRep1, curRep2]);


  return (
    <>
      <div className=' w-full  flex flex-col h-full justify-between overflow-hidden '>
        {retete &&
          <div className="p-8 pb-4 pt-5 text-sm scrollbar-webkit w-full overflow-hidden gap-6 text-white h-full flex flex-col justify-between">
            <div ref={scrollParentRef} className="  scrollbar-webkit overflow-auto  relative  ">
              {currentPartName && stickyTop > 0 && (
                <div className="sticky z-20" style={{ top: stickyTop }}>
                  <div className="bg-white border-b border-black h-12 flex items-center justify-center text-black text-lg font-semibold pointer-events-none">
                    Lucrarea {currentPartName}
                  </div>
                </div>
              )}
              <table className="w-full  border-separate border-spacing-0 ">
                <thead ref={theadRef} className='top-0 w-full sticky    z-30 '>
                  {/* <tr className='text-black'>
                                    <th className='border-b border-r border-black bg-white' colSpan={2}></th>
                                    <th className='border-b border-r bg-white border-black'>
                                        <input
                                            type="text"
                                            name="cod"
                                            value={filters.cod}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none py-3"
                                            placeholder="Filtru Cod"
                                        />
                                    </th>
                                    <th className='border-b border-r bg-white border-black'>
                                        <input
                                            type="text"
                                            name="clasa"
                                            value={filters.clasa}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filtru Clasă"
                                        />
                                    </th>
                                    <th className='border-b border-r bg-white border-black'>
                                        <input
                                            type="text"
                                            name="articol"
                                            value={filters.articol}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filtru Articol"
                                        />
                                    </th>
                                    <th className=" bg-white border-b border-r border-black" colSpan={7}>
                                
                                    </th>
                                </tr> */}
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="bg-white text-black text-left  font-bold select-none">
                      {headerGroup.headers.map(header => (

                        <th key={header.id} className={`relative border-b-2 border-r border-black text-base   bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""} `}
                          style={{
                            width: header.column.id === "threeDots" ? '55px' : header.column.id === "Dropdown" ? "35px" : header.column.id === "logo" ? "35px" : `${header.getSize()}px`, // Enforce width for "Options"
                            minWidth: header.column.id === "threeDots" ? '55px' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px" : "35px" : '', // Ensure no shrinkage
                            maxWidth: header.column.id === "threeDots" ? '55px' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px" : "35px" : '', // Ensure no expansion
                          }}>
                          <div
                            onMouseDown={header.getResizeHandler()}
                            className={`absolute top-0 right-0 h-full w-2 bg-blue-300 cursor-pointer opacity-0 active:opacity-100 hover:opacity-100 transition-opacity duration-200 ${header.column.id === "threeDots" ? "hidden" : ""}`}

                          ></div>
                          {header.column.columnDef.header}

                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                {retete.length == 0 ?
                  (
                    <tbody className='relative z-0'>
                      <tr>
                        <td className='bg-[rgb(255,255,255,0.75)] border-black border-r border-b text-black h-10' colSpan={16}>
                          <div className=' flex justify-center items-center w-full text-lg font-semibold h-full'>Nimic Adaugat</div>
                        </td>
                      </tr>
                    </tbody>
                  )
                  :
                  (
                    <tbody className=' relative z-0'>
                      {paddingTop > 0 && (
                        <tr>
                          <td colSpan={visibleColCount} style={{ height: `${paddingTop}px` }} />
                        </tr>
                      )}
                      {virtualItems.map((vi) => {
                        const row = allRows[vi.index];
                        const index = vi.index; // in case you need it

                        return (row.original.whatIs == 'Manopera' ||
                          row.original.whatIs == 'Material' ||
                          row.original.whatIs == 'Utilaj' ||
                          row.original.whatIs == 'Transport') ? (
                          <React.Fragment key={row.id}>
                            <tr className={` dropdown-container   text-black`}>
                              {row.getVisibleCells().map((cell) => (
                                cell.column.id == "Dropdown" ?
                                  <td key={cell.id}>

                                  </td>
                                  :
                                  <td
                                    onClick={() => console.log(cell)}
                                    key={cell.id}
                                    className={` 
                                     ${cell.column.id == "whatIs" ?
                                        row.original.whatIs == 'Manopera' ? "bg-green-300" :
                                          row.original.whatIs == 'Material' ? "bg-amber-300" :
                                            row.original.whatIs == 'Utilaj' ? "bg-violet-300" :
                                              row.original.whatIs == 'Transport' ? "bg-pink-300" : "" : row.original.definitie_id ? "bg-blue-100" : "bg-white"}
                                     border-b border-r break-words max-w-72  relative border-black px-3 `}
                                  >
                                    <div className="h-full w-full overflow-hidden ">
                                      <div className="max-h-12 h-12 leading-relaxed  grid grid-cols-1 break-words whitespace-pre-line items-center  overflow-auto  scrollbar-webkit">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                      </div>
                                    </div>
                                  </td>
                              ))}
                            </tr>
                          </React.Fragment>
                        )
                          : (
                            //randul normal cu date
                            <React.Fragment key={row.id}>
                              <tr className='dropdown-container text-black bg-[rgb(255,255,255,0.80)] hover:bg-[rgb(255,255,255,0.60)'>
                                {row.getVisibleCells().map(cell => (
                                  <td
                                    key={cell.id}
                                    className="border-b border-r break-words max-w-72 relative border-black p-1 px-3"
                                    style={cell.column.columnDef.meta?.style}
                                  >
                                    <div className="h-full w-full overflow-hidden">
                                      <div className="max-h-12 h-12 leading-relaxed w-full break-words whitespace-pre-line grid grid-cols-1 items-center overflow-auto scrollbar-webkit">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                      </div>
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            </React.Fragment>
                          )
                      })}
                      {/* BOTTOM spacer */}
                      {paddingBottom > 0 && (
                        <tr>
                          <td colSpan={visibleColCount} style={{ height: `${paddingBottom}px` }} />
                        </tr>
                      )}
                    </tbody>
                  )}
              </table>
            </div>
            {/* Pagination Controls */}
            <div className="mt-auto text-sm  gap-4 flex containerZ p-4  items-center">
              <table className=''>
                <thead>
                  <tr className='select-none'>
                    <th className='border font-medium w-40 text-left  border-black p-2 bg-blue-300 text-black'>Ore Manopera</th>
                    <th className='border font-medium w-32 text-left  border-black p-2 bg-green-300 text-black'>Manopera</th>
                    <th className='border font-medium w-32 text-left border-black p-2 bg-amber-300 text-black'>Materiale</th>
                    <th className='border font-medium w-32 text-left border-black p-2 bg-pink-300 text-black'>Transport</th>
                    <th className='border font-medium w-32 text-left border-black p-2 bg-violet-300 text-black'>Utilaje</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className='font-semibold '>
                    <td className='border  border-black p-2 bg-white text-black'>{finalData.oreManopera.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{finalData.manopera.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{finalData.materiale.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{finalData.transport.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{finalData.utilaje.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <table className=''>
                <tbody>
                  <tr className='font-medium select-none'>
                    <td className='border  border-black p-2 bg-blue-30 bg-blue-300 text-black'>Cheltuieli directe</td>
                    <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faPlus} /></td>
                    <td className='border border-black p-2  bg-blue-300 text-black'>Recapitulații
                      <input
                        maxLength={2}
                        value={recapitulatii}
                        type="text"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+(\.\d{1,2})?$/.test(val)) {
                            setRecapitulatii(val);
                          }
                        }}
                        onBlur={() => {
                          if (recapitulatii === '') {
                            setRecapitulatii('1');
                          }
                        }}
                        className='mx-2 max-w-10 font-normal outline-none text-center px-2 border border-black rounded-lg' />%</td>
                    <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faEquals} /></td>
                    <td className='border border-black p-2 w-32 bg-blue-300 text-black'>Valoare</td>
                    <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faPlus} /></td>
                    <td className='border border-black p-2  bg-blue-300 text-black'>TVA
                      <input
                        maxLength={2}
                        value={TVA}
                        type="text"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+(\.\d{1,2})?$/.test(val)) {
                            setTVA(val);
                          }
                        }}
                        onBlur={() => {
                          if (TVA === '') {
                            setTVA('1');
                          }
                        }}
                        className='mx-2 max-w-10 font-normal outline-none text-center px-2 border border-black rounded-lg' />%</td>
                    <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faEquals} /></td>
                    <td className='border border-black p-2 w-32  bg-blue-300 text-black'>
                      <div className='flex items-center gap-2'>
                        <p>Total</p>
                      </div>
                    </td>
                  </tr>
                  <tr className='font-semibold'>
                    <td className='border  border-black p-2 bg-white text-black'>{finalData.cheltuieliDirecte.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{(recapitulatii / 100 * finalData.cheltuieliDirecte).toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{(finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte).toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{(TVA / 100 * (finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte)).toFixed(2)}</td>
                    <td className='border font-bold tracking-wide  border-black p-2 bg-white text-black'>{((finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte) + TVA / 100 * (finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte)).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <button onClick={() => setIsGenerareOpen(true)} className='bg-green-500 cursor-pointer flex gap-2 justify-center font-medium items-center p-2 mt-6 text-sm tracking-wide hover:bg-green-600 h-10 text-black rounded-lg flex-grow'><FontAwesomeIcon icon={faFileExport} />Genereaza</button>
            </div>
          </div>
        }
        {isGenerareOpen && (
          <>
            <div className=" absolute top-0 left-0 right-0 bottom-0 h-full w-full z-[100]"></div>
            <div className='w-full top-0 left-0 right-0 bottom-0 absolute h-full items-center justify-center flex z-[200]'>
              <div className=' relative rounded-xl border-2 shadow-md shadow-gray-400 bg-[#002a54] h-1/2 w-1/2'>
                <PDF_Popup allLucrari={true} oferta_part_id={ofertaId} setIsGenerareOpen={setIsGenerareOpen} TVA={TVA} recapitulatii={recapitulatii} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

