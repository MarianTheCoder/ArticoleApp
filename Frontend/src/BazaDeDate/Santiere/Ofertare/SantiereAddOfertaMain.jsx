import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import api from '../../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowDownAZ, faArrowRotateRight, faArrowUpAZ, faCancel, faCar, faChevronDown, faChevronRight, faCopy, faEllipsis, faEquals, faFileExport, faFolder, faL, faPenToSquare, faPerson, faPlus, faTrashCan, faTrowelBricks, faTruck, faUser } from '@fortawesome/free-solid-svg-icons';
import photoAPI from '../../../api/photoAPI';
import SantiereAddReteteTable from './SantiereAddReteteTableAbsolute';
import { useParams } from 'react-router-dom';
import CostInputCell from './CostCell';

import {FormularRasfirat} from '../Formulare/Romania/FormularRasfirat';
import { FormularCompact } from '../Formulare/Romania/FormularCompact';
import { FormularCompactFR } from '../Formulare/Franta/FormularCompactFR';
import { FormularRasfiratFR } from '../Formulare/Franta/FormularRasfiratFR';




export default function SantiereAdd({mainOfertaPartID}) {

    const {idSantier, limbaUser} = useParams();

    const [openDropdowns, setOpenDropdowns] = useState(new Set());
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    const [selectedDelete, setSelectedDelete] = useState(null);
    const [selectedEdit, setSelectedEdit] = useState(null);
    const [editedCosts, setEditedCosts] = useState({});
    const [cantitateReteta, setCantitateReteta] = useState(0);
    const editedCostsRef = useRef(editedCosts);
    const editedCantitateRef = useRef(cantitateReteta);

    const [retete, setRetete] = useState([]);
    const [detailedCosts, setDetailedCosts] = useState({});
    const [ascendent ,setAscendent] = useState(false);

    const [filters, setFilters] = useState({
        cod: '',
        clasa: '',
        articol: '',
    });

    const [TVA , setTVA] = useState(24);
    const [recapitulatii , setRecapitulatii] = useState(10);
    const [finalData , setFinalData] = useState({
        oreManopera: 0,
        manopera: 0,
        materiale: 0,
        transport: 0,
        utilaje: 0,
        cheltuieliDirecte: 0,
    })
    const [selectedFormular , setSelectedFormular] = useState(limbaUser == 'RO' ? 'Răsfirat' : 'RăsfiratFR');

    const [objectsLen, setObjectsLen] = useState(0); 
    const [objectsID, setObjectsID] = useState(null); 
    const [lastObjectIndex , setLastObjectIndex] = useState(null);

 


    const fetchManopere = async () => {
        try {
            const response = await api.get(`/Santiere/getReteteLightForSantiereWithPrices/${mainOfertaPartID}`, {
                params: {
                    asc_articol: ascendent,
                },
            });
            setOpenDropdowns(new Set());
            setEditedCosts({});
            setSelectedEdit(null);
            setSelectedDelete(null);
            if(response.data.data.length == 0){
                setRetete([]);
                setDetailedCosts({});
                return;
            };
                setDetailedCosts(response.data.detailedCosts);
                setRetete(response.data.data);
                
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }


    useEffect(() => { 
        fetchManopere();
    }, [ascendent]);

    useEffect(() => {
        // console.log(detailedCosts);
        if(detailedCosts){
            handleFinalData();
        }
    },[detailedCosts]);

    //to see the updated cantitate and costs in the function
    useEffect(() => {
        editedCostsRef.current = editedCosts;
      }, [editedCosts]);

    useEffect(() => {
        editedCantitateRef.current = cantitateReteta;
      }, [cantitateReteta]);


    // const handleInputChange = (e) => {
    //     const { name, value } = e.target;
    //     setFilters((prev) => ({
    //         ...prev,
    //         [name]: value,
    //     }));
    // };



    //CE FROMULAR SELECTAM?
    const handleFormular = () =>{
      // console.log(mainOfertaPartID);
      switch (selectedFormular) {
        case 'Răsfirat':
          FormularRasfirat(mainOfertaPartID, recapitulatii, TVA)
          break;
        case 'Compact':
          FormularCompact(mainOfertaPartID, recapitulatii, TVA);
          break;  
        case "CompactFR":
          FormularCompactFR(mainOfertaPartID, recapitulatii, TVA);
          break;
        case "RăsfiratFR":
          FormularRasfiratFR(idSantier, mainOfertaPartID, recapitulatii, TVA);
          break;

        default:
          break;
      }
    }



    //handle selected edit/delete
    const handleSelectedForDelete = (e, id) => {
        setEditedCosts({});
        setSelectedEdit(null);
        setCantitateReteta(0);
        setSelectedDelete((prev) => {
            if (prev === id) {
              deleteItem(id); // your custom logic here
              return null;
            }
            return id;
          });
    }

    const deleteItem = async (id) => {
        // console.log(retete);
        try {
            await api.delete(`/Santiere/deleteRetetaFromSantier/${id}`);
    
            setDetailedCosts(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
              });
            setRetete(prev => 
                prev.filter(item => {
                  const isParentToDelete = item.id === id && item.whatIs === undefined;
                  const isChildOfDeleted = item.parentId === id;
              
                  return !isParentToDelete && !isChildOfDeleted;
                })
              );
            // Remove dropdown open state if it was open
            setOpenDropdowns((prev) => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
    
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

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
                nowManopere += parseFloat(cost)*parseFloat(cantitate);
            });
            totalTime = totalTime + nowTime * reteta_quantity;
            totalManopere = totalManopere + nowManopere * reteta_quantity;

            Object.entries(materiale).forEach(([itemId, { cost, cantitate }]) => {
                nowMateriale += parseFloat(cost)*parseFloat(cantitate);
            });
            totalMateriale = totalMateriale + nowMateriale * reteta_quantity;

            Object.entries(utilaje).forEach(([itemId, { cost, cantitate }]) => {
                nowUtilaje += parseFloat(cost)*parseFloat(cantitate);
            });
            totalUtilaje = totalUtilaje + nowUtilaje * reteta_quantity;

            Object.entries(transport).forEach(([itemId, { cost, cantitate }]) => {
                nowTransport += parseFloat(cost)*parseFloat(cantitate);
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

    const handleAcceptEdit = async () =>{
        const currentEditedCosts = editedCostsRef.current;
        const currentCantitateReteta = editedCantitateRef.current;
        // console.log('Sending updated costs:', currentEditedCosts , currentCantitateReteta);
        try {
            const res = await api.put(`/Santiere/updateSantierRetetaPrices`, {santier_reteta_id: selectedEdit ,cantitate_reteta: currentCantitateReteta, updatedCosts: currentEditedCosts});
            let tempCosts = JSON.parse(JSON.stringify(detailedCosts));
            setRetete((prev) =>{
                const updated = [...prev]; // Clone so you don't mutate state directly
                let totalCost = 0;
                for (let i = 0; i < updated.length; i++) {
                    const item = updated[i];
                    const key = `${item.id}-${item.whatIs}`;
                
                    if (item.parentId === selectedEdit) {
                      const cost = currentEditedCosts[key] !== undefined
                        ? parseFloat(currentEditedCosts[key])
                        : parseFloat(item.cost);
                
                      totalCost += cost * parseFloat(item.cantitate);
                
                      if (currentEditedCosts.hasOwnProperty(key)) {
                        tempCosts[selectedEdit][item.whatIs][item.id].cost = cost.toFixed(2);
                        updated[i] = { ...item, cost: cost.toFixed(2) };
                      }
                    }
                  }
                  const parentIndex = updated.findIndex(
                    item => !item.whatIs && item.id === selectedEdit
                  );
                
                  if (parentIndex !== -1) {
                    // console.log("gasit" , totalCost);
                    tempCosts[selectedEdit].cantitate_reteta = parseFloat(currentCantitateReteta).toFixed(2);
                    updated[parentIndex] = {
                      ...updated[parentIndex],
                      cantitate: parseFloat(currentCantitateReteta).toFixed(2),
                      cost: totalCost.toFixed(2),
                    };
                  }
                
                  return updated;
            }
                // prev.map(item => {
                //   const key = `${item.id}-${item.whatIs}`;
                //   if(item.parentId === selectedEdit){
                //     const cost = currentEditedCosts[key] !== undefined
                //     ? parseFloat(currentEditedCosts[key])
                //     : parseFloat(item.cost);

                //     console.log(cost , item.cantitate)
                //     totalCost += cost * parseFloat(item.cantitate);
                //   }
                //   if (currentEditedCosts.hasOwnProperty(key)) {
                //     tempCosts[selectedEdit][item.whatIs][item.id].cost = parseFloat(currentEditedCosts[key]).toFixed(2);
                //     return {
                //       ...item,
                //       cost: parseFloat(currentEditedCosts[key]).toFixed(2)
                //     };
                //   }
              
                //   if (!item.whatIs && item.id == selectedEdit) {
                //     tempCosts[selectedEdit].cantitate_reteta = parseFloat(currentCantitateReteta).toFixed(2);
                //     return {
                //       ...item,
                //       cantitate: parseFloat(currentCantitateReteta).toFixed(2)
                //     };
                //   }
                //   return item;
                // })
              );
            setDetailedCosts(tempCosts);
        } catch (error) {
            console.error("Error at editing the Reteta:", error);
        }
        setEditedCosts({});
        setSelectedEdit(null);
        setCantitateReteta(0);

    }

    const handleSelectedForEdit = (rowToEdit , theActualRetete) =>{
        setSelectedDelete(null);
        const newEditedCosts = {};
        theActualRetete.forEach((item) => {
            if (item.parentId === rowToEdit) {
                newEditedCosts[`${item.id}-${item.whatIs}`] = item.cost;
                }
            if(item.id == rowToEdit && !item.parentId) setCantitateReteta(item.cantitate);
        });
        setEditedCosts(newEditedCosts);
        setSelectedEdit(rowToEdit); 
    }

    const handleCostChange = (id, whatIs, value) => {
        // console.log(id, whatIs, value)
        setEditedCosts((prev) => ({
          ...prev,
          [`${id}-${whatIs}`]: value,
        }));
      };
    
      const handleCantiatateChange = (id, whatIs, value) => {
        // console.log(value)
        setCantitateReteta(value);
      };

    const toggleDropdown = async (parentId , isEditClicked) => {
        const isAlreadyOpen = openDropdowns.has(parentId);
        //daca sunt egale trebuue sa acceotam editul
        if(isEditClicked == selectedEdit && selectedEdit != null){
            handleAcceptEdit();
            return;
        }
        //verificam daca e deja deschis
        if(isAlreadyOpen && isEditClicked){
            handleSelectedForEdit(isEditClicked, retete);
            return;
        }
        //aici e inchiderea standard
        if (isAlreadyOpen && !isEditClicked) {
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
              const index = prev.findIndex(item => item.id === parentId && !item.parentId );
              if (index === -1) return prev;
      
              const newList = [...prev];
              newList.splice(index + 1, 0, ...children);
              if(isEditClicked != null){
                  handleSelectedForEdit(isEditClicked, newList)
              }
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

      
        //Handle Click Outside!
        useEffect(() => {
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }, []);
    
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setSelectedDelete(false);
                setEditedCosts({});
                setSelectedEdit(null);
            }
        };

    const parentProps = {
        setIsPopupOpen,
        setObjectsLen,
        objectsLen,
        lastObjectIndex,
        setLastObjectIndex,
        fetchParentRetete:fetchManopere,
        mainOfertaPartID
      };



      


    const columns = useMemo(() => [
        { 
            accessorKey: "Dropdown", 
            header: "",
            cell: ({ row, getValue, cell }) => (
            <div  onClick={() => row.original.id != selectedEdit && toggleDropdown(cell.row.original.id)}className='flex justify-center select-none w-full dropdown-container cursor-pointer items-center'>
                <FontAwesomeIcon  className={` ${openDropdowns.has(cell.row.original.id) ? "rotate-90" : ""}  text-center  text-xl`} icon={faChevronRight}/>
            </div>
             
                
            ),
        },
        { 
            accessorKey: "logo",
            header: "Logo",
            cell: ({ row, getValue, cell }) => (
                row.original.whatIs == 'Manopera' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-green-500 h-[1.5rem] w-full ' icon={faUser}/></div>
                :
                row.original.whatIs == 'Material' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-amber-500 h-[1.5rem] w-full ' icon={faTrowelBricks}/></div>
                :
                row.original.whatIs == 'Utilaj' ?
                    <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-violet-500 h-[1.5rem] w-full  ' icon={faTruck}/></div>
                :
                row.original.whatIs == 'Transport' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-pink-500 h-[1.5rem] w-full  ' icon={faCar}/></div>
                :
                <div className='w-full h-full flex justify-center items-center overflow-hidden '><FontAwesomeIcon className='text-blue-500 h-[1.5rem]   ' icon={faFolder}/></div>
            ),
            
        },
        { accessorKey: "cod", header: "Cod",size:100 },
        { accessorKey: "clasa", header: "Clasă", size:200},
       { 
            accessorKey: "articol", 
            header: (
                <div className="flex items-center w-[95%] justify-between text-black ">
                    <span>Articol</span>
                    <FontAwesomeIcon onClick={() => setAscendent((prev) => prev == false ? true : false)} className="text-xl border border-black p-2  rounded-full  cursor-pointer" icon={!ascendent ? faArrowUpAZ : faArrowDownAZ} /> 
                </div>
              ),
            size:400
        },
        {
            accessorKey: 'whatIs', 
            header: 'Tip',
            size:100,
            cell: ({ getValue, row }) => getValue() ? <div className='w-full'>{row.original.whatIs == "Material" ?  getValue() + " " + row.original.tip_material : getValue()}</div> : 'Rețetă', // Display default value if the value is empty or undefined
        },
        { accessorKey: "unitate_masura", header: "Unitate",size:60},
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
                size:70
        },
        { 
            accessorKey: "cantitate", 
            header: "Cantitate", 
            cell: ({ getValue, row }) => {
                const isEditable = (row.original.id === selectedEdit && !row.original.whatIs);
            
                return (
                  <CostInputCell
                    rowId={row.original.id}
                    whatIs={row.original.whatIs || "Reteta"}
                    initialValue={getValue()}
                    isEditable={isEditable}
                    onEdit={handleCantiatateChange} // optional
                    bold = {false}
                  />
                );
              },
            size:70},
        {
            accessorKey: "cost",
            header: "Preț Unitar",
            cell: ({ getValue, row }) => {
              const isEditable = row.original.parentId === selectedEdit;
          
              return (
                <CostInputCell
                  rowId={row.original.id}
                  whatIs={row.original.whatIs || "Reteta"}
                  initialValue={getValue()}
                  isEditable={isEditable}
                  onEdit={handleCostChange} // optional
                  bold = {true}
                />
              );
            },
            size:80
          },
        { 
            accessorKey: "pret_total", 
            header: "Pret Total", 
            cell: ({ getValue, row }) => {

                return (
                    <span className='font-semibold'>{(row.original.cost * row.original.cantitate).toFixed(2)}</span>
                )
              },
            size:80},
        { 
            accessorKey: "threeDots", 
            header: "Opțiuni",
            cell: ({ row }) => (
                row.original.whatIs == 'Manopera' || row.original.whatIs == 'Material' || row.original.whatIs == 'Utilaj' || row.original.whatIs == 'Transport' ? 
                ""
                    :
                <div className=' dropdown-container w-full relative flex '> 
                    <div className='text-xl relative w-full py-2 select-none items-center justify-evenly gap-1 flex'>
                        <FontAwesomeIcon onClick={(e) => toggleDropdown(row.original.id, row.original.id)}  className=' text-green-500 hover:text-green-600 dropw cursor-pointer dropdown-container' icon={faPenToSquare}/>
                        <FontAwesomeIcon onClick={(e) => handleSelectedForDelete(e, row.original.id)} className=' text-red-500 hover:text-red-600 cursor-pointer dropdown-container' icon={faTrashCan}/>
                    </div>
                </div>
            ),
            meta: {
                style: {
                    textAlign: 'center', 
                    padding: '0', 
                },
            },
        },
    ], [retete, ascendent, selectedEdit, selectedDelete]);

    const table = useReactTable({
        data: retete,
        columns,
        getCoreRowModel: getCoreRowModel(),
        columnResizeMode: 'onChange',
        state: {
            columnResizing: {},
          },
    });


  return (
    <>
       
        {retete &&
            <div className="p-8 pb-4 pt-5 text-sm    scrollbar-webkit  w-full text-white h-full flex flex-col justify-between">
            <div className="overflow-auto  scrollbar-webkit">
                <table className="w-full  border-separate border-spacing-0 ">
                    <thead className='top-0 w-full sticky  z-10 '>
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
                       
                            <th key={header.id}  className={`relative border-b-2 border-r border-black text-base   bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""} `}     
                            style={{
                                width: header.column.id === "threeDots" ? '55px' : header.column.id === "Dropdown" ? "35px" : header.column.id === "logo" ? "35px": `${header.getSize()}px`, // Enforce width for "Options"
                                minWidth: header.column.id === "threeDots" ?  '55px' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px": "35px" : '', // Ensure no shrinkage
                                maxWidth: header.column.id === "threeDots" ? '55px' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px": "35px" : '', // Ensure no expansion
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
                    <tbody className='relative z-0'>
                        <tr>
                            <td className='bg-[rgb(255,255,255,0.75)] border-black border-r border-b text-black h-10' colSpan={12}>
                                <div className=' flex justify-center items-center w-full text-lg font-semibold h-full'>Nimic Adaugat</div>
                            </td>
                        </tr>
                        <tr>
                            <td onClick={() => setIsPopupOpen(true)} className='bg-white p-2 px-3 hover:bg-[rgb(255,255,255,0.9)] cursor-pointer border-b border-r border-black select-none text-black' colSpan={12}>
                                <div className='flex font-bold   text-center justify-center items-center gap-2'>
                                    <p className=' text-center'>Adauga Retete</p>
                                    <FontAwesomeIcon className='text-green-500  text-center text-2xl' icon={faPlus}/>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                :
                <tbody className=' relative z-0'>
                {table.getRowModel().rows.map((row,index,rows) => (
                    row.original.whatIs == 'Manopera' || row.original.whatIs == 'Material' || row.original.whatIs == 'Utilaj' || row.original.whatIs == 'Transport' ?
                    <React.Fragment key={row.id}>
                        <tr  className={` dropdown-container   text-black`}>
                            {row.getVisibleCells().map((cell) => (  
                                cell.column.id == "Dropdown" ?
                                <td key={cell.id}>

                                </td>
                                :
                                <td     
                                onClick={()=>console.log(cell)}
                                key={cell.id}
                                className={` 
                                     ${cell.column.id == "whatIs" ? row.original.whatIs == 'Manopera' ? "bg-green-300" : row.original.whatIs == 'Material' ? "bg-amber-300" : row.original.whatIs == 'Utilaj' ? "bg-violet-300" : row.original.whatIs == 'Transport' ? "bg-pink-300" : "bg-white" : "bg-white"}
                                     border-b border-r break-words max-w-72  relative border-black px-3 `}
                                >
                                   <div className="h-full w-full overflow-hidden ">
                                        <div className="max-h-10 h-10   grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </React.Fragment>
                    :
                    <React.Fragment key={row.id}>
                        <tr className={`dropdown-container   text-black 
                            ${row.original.id == selectedDelete ? "bg-red-300 sticky" : row.original.id == selectedEdit ? "bg-green-300 sticky" :  row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] ' : 'bg-[rgb(255,255,255,1)] '}`}>
                            {row.getVisibleCells().map((cell) => (  
                                    <td  key={cell.id}   
                                        className={`    border-b border-r break-words max-w-72  relative border-black p-1 px-3`}
                                        style={cell.column.columnDef.meta?.style} // Apply the custom style
                                    >          
                                    <div className="h-full w-full overflow-hidden ">
                                        <div className="max-h-10 h-10 w-full   grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    </div>
                                    </td>
                            
                            ))}
                        </tr>
                    </React.Fragment>
                ))}
                <tr>
                    <td onClick={() => setIsPopupOpen(true)} className='bg-white p-2 px-3 hover:bg-[rgb(255,255,255,0.9)] cursor-pointer border-b border-r border-black select-none text-black' colSpan={12}>
                        <div className='flex font-bold   text-center justify-center items-center gap-2'>
                            <p className=' text-center'>Adauga Retete</p>
                            <FontAwesomeIcon className='text-green-500  text-center text-2xl' icon={faPlus}/>
                        </div>
                    </td>
                </tr>
                </tbody>}
            </table>
            </div>
            {/* Pagination Controls */}
            <div className="mt-4 text-sm  gap-4 flex containerZ p-4  items-center">
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
                                <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faPlus}/></td>
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
                                        className='mx-2 max-w-10 font-normal outline-none text-center px-2 border border-black rounded-lg'/>%</td>
                                <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faEquals}/></td>
                                <td className='border border-black p-2 w-32 bg-blue-300 text-black'>Valoare</td>
                                <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faPlus}/></td>
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
                                        className='mx-2 max-w-10 font-normal outline-none text-center px-2 border border-black rounded-lg'/>%</td>
                                <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faEquals}/></td>
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
                                <td className='border border-black p-2 bg-white text-black'>{(TVA/100 * (finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte)).toFixed(2)}</td>
                                <td className='border font-bold tracking-wide  border-black p-2 bg-white text-black'>{((finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte) + TVA/100 * (finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte)).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="flex flex-col h-full text-base items-center justify-center">
                      <label htmlFor="unit" className=" font-medium text-black">
                        Selecteaza un formular 
                      </label>
                 { limbaUser == "RO" ?     
                    <select
                        value={selectedFormular}
                        onChange={(e) => setSelectedFormular(e.target.value)}
                        className=" px-2 py-2 w-56 text-black  rounded-lg outline-none shadow-sm "
                      >
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
                  </div>
                    <button onClick={() => handleFormular()} className='bg-green-500 cursor-pointer flex gap-2 justify-center font-medium items-center p-2 mt-6 text-base tracking-wide hover:bg-green-600 text-black rounded-lg flex-grow'><FontAwesomeIcon icon={faFileExport}/>Genereaza</button>
            </div>
          </div>
          
        }
        {/* div that prevents clicks outside */}
        {isPopupOpen && (
        <>
            <div className=" absolute top-0 left-0 right-0 bottom-0 h-full w-full z-[100]"></div>
            <div className='w-full top-0 left-0 right-0 bottom-0 absolute h-full items-center justify-center flex z-[200]'>
                    <div className=' relative rounded-xl bg-[#002a54] h-[95%] w-90w'>
                        <SantiereAddReteteTable  {...parentProps} />
                    </div>
            </div>
        </>
      )}
    </>
  )
}
