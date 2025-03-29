import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowDownAZ, faArrowRotateRight, faArrowUpAZ, faCancel, faCar, faChevronDown, faChevronRight, faCopy, faEllipsis, faEquals, faFileExport, faFolder, faL, faPenToSquare, faPerson, faPlus, faTrashCan, faTrowelBricks, faTruck, faUser } from '@fortawesome/free-solid-svg-icons';
import { RetetaContext } from '../../context/RetetaContext';
import photoAPI from '../../api/photoAPI';
import ReteteAdaugareObiecte from '../Retete/ReteteAdaugareObiecte';
import SantiereAddReteteTable from './SantiereAddReteteTableAbsolute';
import { useParams } from 'react-router-dom';
import CostInputCell from './CostCell';


export default function SantiereAdd() {

    const {idSantier} = useParams();

    const [openDropdowns, setOpenDropdowns] = useState(new Set());
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    const [selectedDelete, setSelectedDelete] = useState(null);
    const [selectedEdit, setSelectedEdit] = useState(null);
    const [editedCosts, setEditedCosts] = useState({});
    const editedCostsRef = useRef(editedCosts);

    const [retete, setRetete] = useState([]);
    const [ascendent ,setAscendent] = useState(false);

    const [filters, setFilters] = useState({
        cod: '',
        clasa: '',
        articol: '',
    });

    const [objectsLen, setObjectsLen] = useState(0); 
    const [objectsID, setObjectsID] = useState(null); 
    const [lastObjectIndex , setLastObjectIndex] = useState(null);

 
    const fetchManopere = async () => {
        try {
            const response = await api.get(`/Santiere/getReteteLightForSantiere/${idSantier}`, {
                params: {
                    asc_articol: ascendent,
                },
            });
            setOpenDropdowns(new Set());
            if(response.data.data.length == 0){
                setRetete([]);
                return;
            };
                    const renamedItems = response.data.data.map(item => ({
                    ...item,
                    cod: item.cod_reteta,  // Renaming cod to cod_reteta
                    clasa: item.clasa_reteta,  // Renaming cod to cod_reteta
                }));
                // Remove the old 'cod' field if needed
                renamedItems.forEach(item => delete item.cod_reteta);
                renamedItems.forEach(item => delete item.clasa_reteta);
                setRetete(renamedItems);
            
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }


    useEffect(() => { 
        fetchManopere();
    }, [ascendent]);

    useEffect(() => {
        editedCostsRef.current = editedCosts;
      }, [editedCosts]);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };


    //handle selected edit/delete
    const handleSelectedForDelete = (e, id) => {
        setEditedCosts({});
        setSelectedEdit(null);
        setSelectedDelete((prev) => {
            if (prev === id) {
              deleteItem(id); // your custom logic here
              return null;
            }
            return id;
          });
    }

    const deleteItem = async (id) => {
        try {
            await api.delete(`/Santiere/deleteRetetaFromSantier/${id}`);
    
            // Always update retete state
            setRetete(prev => 
                prev.filter(item => item.id !== id && item.parentId !== id)
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

    const handleAcceptEdit = async () =>{
        const currentEditedCosts = editedCostsRef.current;
        console.log('Sending updated costs:', currentEditedCosts);
        // your update logic here
    }

    const handleSelectedForEdit = (e, rowToEdit) =>{
        if(selectedEdit == rowToEdit.id){
            handleAcceptEdit();
            setEditedCosts({});
            setSelectedEdit(null);
        }
        else{
            const isAlreadyOpen = openDropdowns.has(rowToEdit.id);
            if (!isAlreadyOpen) toggleDropdown(rowToEdit.id);
            setSelectedDelete(null);
            const newEditedCosts = {};
            
            retete.forEach((item) => {
                if (item.parentId === rowToEdit.id) {
                    newEditedCosts[item.id] = item.cost;
                }
            });

            setEditedCosts(newEditedCosts);
            setSelectedEdit(rowToEdit.id);
        }
    }

    const handleCostChange = (id, value) => {
        console.log(id,value)
        setEditedCosts((prev) => ({
          ...prev,
          [id]: value,
        }));
      };
    

    const toggleDropdown = async (parentId) => {
        const isAlreadyOpen = openDropdowns.has(parentId);
      
        if (isAlreadyOpen) {
          // Remove children from retete and mark dropdown as closed
          setRetete((prev) => prev.filter(item => item.parentId !== parentId));
          setOpenDropdowns((prev) => {
            const newSet = new Set(prev);
            newSet.delete(parentId);
            return newSet;
          });
        } else {
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
        fetchParentRetete:fetchManopere
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
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-green-500 h-[2rem] w-full ' icon={faUser}/></div>
                :
                row.original.whatIs == 'Material' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-amber-500 h-[2rem] w-full ' icon={faTrowelBricks}/></div>
                :
                row.original.whatIs == 'Utilaj' ?
                    <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-violet-500 h-[2rem] w-full  ' icon={faTruck}/></div>
                :
                row.original.whatIs == 'Transport' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-pink-500 h-[2rem] w-full  ' icon={faCar}/></div>
                :
                <div className='w-full h-full flex justify-center items-center overflow-hidden '><FontAwesomeIcon className='text-blue-500 h-[2rem]   ' icon={faFolder}/></div>
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
            size:70,
            cell: ({ getValue, row }) => getValue() ? <div onClick={() => console.log(row)} className='w-full'>{row.original.whatIs == "Material" ?  getValue() + " " + row.original.tip_material : getValue()}</div> : 'Rețetă', // Display default value if the value is empty or undefined
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
                        className="h-[2.8rem] min-w-[2rem] max-w-28 object-cover" 
                        style={{ objectFit: 'cover' }}
                        />
                </div>
                :
                ""
                ),
                size:70
        },
        { accessorKey: "cantitate", header: "Cantitate", size:70},
        {
            accessorKey: "cost",
            header: "Preț Unitar",
            cell: ({ getValue, row }) => {
              const isEditable = row.original.parentId === selectedEdit;
          
              return (
                <CostInputCell
                  rowId={row.original.id}
                  initialValue={getValue()}
                  isEditable={isEditable}
                  onEdit={handleCostChange} // optional
                />
              );
            },
          },
        { accessorKey: "pret_total", header: "Pret Total", size:70},
        { 
            accessorKey: "threeDots", 
            header: "Opțiuni",
            cell: ({ row }) => (
                row.original.whatIs == 'Manopera' || row.original.whatIs == 'Material' || row.original.whatIs == 'Utilaj' || row.original.whatIs == 'Transport' ? 
                ""
                    :
                <div className=' dropdown-container w-full relative flex '> 
                    <div className='text-xl relative w-full py-2 select-none items-center justify-evenly gap-1 flex'>
                        <FontAwesomeIcon onClick={(e) => handleSelectedForEdit(e, row.original)}  className=' text-green-500 hover:text-green-600 dropw cursor-pointer dropdown-container' icon={faPenToSquare}/>
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
            <div className="p-8 pb-4   scrollbar-webkit  w-full text-white h-full flex flex-col justify-between">
            <div className="overflow-auto  scrollbar-webkit">
                <table className="w-full  border-separate border-spacing-0 ">
                    <thead className='top-0 w-full sticky  z-10 '>
                        <tr className='text-black'>
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
                                </tr>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-white text-black text-left  font-bold select-none">
                    {headerGroup.headers.map(header => (
                       
                            <th key={header.id}  className={`relative border-b-2 border-r border-black   bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""} `}     
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
                            <td className='bg-[rgb(255,255,255,0.75)] border-black border-r border-b text-black h-12' colSpan={12}>
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
                        <tr  className={`   text-black`}>
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
                                        <div className="max-h-12 h-12   grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
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
                                        <div className="max-h-12 h-12 w-full   grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
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
                            <tr className='font-bold '>
                                <td className='border  border-black p-2 bg-white text-black'>2134</td>
                                <td className='border border-black p-2 bg-white text-black'>12</td>
                                <td className='border border-black p-2 bg-white text-black'>4362</td>
                                <td className='border border-black p-2 bg-white text-black'>1221</td>
                                <td className='border border-black p-2 bg-white text-black'>0</td>
                            </tr>
                        </tbody>
                    </table>
                    <table className=''>
                        <tbody>
                            <tr className='font-medium select-none'>
                                <td className='border  border-black p-2 bg-blue-30 bg-blue-300 text-black'>Cheltuieli directe</td>
                                <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faPlus}/></td>
                                <td className='border border-black p-2 bg-blue-300 text-black'>Recapitulatii</td>
                                <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faEquals}/></td>
                                <td className='border border-black p-2 w-32 bg-blue-300 text-black'>Valoare</td>
                                <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faPlus}/></td>
                                <td className='border border-black p-2  bg-blue-300 text-black'>TVA<input maxLength={2} type="text" className='mx-2 max-w-10 font-normal outline-none text-center px-2 border border-black rounded-lg' />%</td>
                                <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faEquals}/></td>
                                <td className='border border-black p-2 w-32  bg-blue-300 text-black'>
                                    <div className='flex items-center gap-2'>
                                        <p>Total</p> 
                                    </div>
                                </td>
                            </tr>
                            <tr className='font-bold'>
                                <td className='border  border-black p-2 bg-white text-black'>2134</td>
                                <td className='border border-black p-2 bg-white text-black'>4362</td>
                                <td className='border border-black p-2 bg-white text-black'>1221</td>
                                <td className='border border-black p-2 bg-white text-black'>0</td>
                                <td className='border  border-black p-2 bg-white text-black'>921</td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="flex flex-col h-full text-base items-center justify-center">
                      <label htmlFor="unit" className=" font-medium text-black">
                        Selecteaza un formular 
                      </label>
                      <select
                        id="unitate_masura"
                        name="unitate_masura"
                   
                        className=" px-2 py-2 w-56 text-black  rounded-lg outline-none shadow-sm "
                      >
                        <option value="C4">Formular C4</option>
                        <option value="C5">Formular C5</option>
                        <option value="C6">Formular C6</option>
                        <option value="C7">Formular C7</option>
                        <option value="C8">Formular C8</option>
                        <option value="C9">Formular C9</option>
                        <option value="F3">Formular F3</option>
             
                      </select>
                  </div>
                    <button className='bg-green-500 cursor-pointer flex gap-2 justify-center font-medium items-center p-2 mt-6 text-base tracking-wide hover:bg-green-600 text-black rounded-lg flex-grow'><FontAwesomeIcon icon={faFileExport}/>Genereaza</button>
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
