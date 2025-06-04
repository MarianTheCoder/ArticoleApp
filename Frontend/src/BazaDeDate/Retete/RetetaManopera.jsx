import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowRightLong, faCancel, faCopy, faEllipsis, faL, faLanguage, faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { RetetaContext } from '../../context/RetetaContext';

export default function RetetaManopera({
    setIsPopupOpen,
    open,
    isPopupOpen,
    setOpen,
    delPreviewReteta,
    fetchPreviewReteta,
  }) {


        const [cantitate, setCantitate] = useState("");
        const [selectedManopera, setSelectedManopera] = useState(null);

        const [manopere, setManopere] = useState(null);
        const [manoperaFilters, setManoperaFilters] = useState({
          limba: "",
          cod_COR: '',
          ocupatie: '',
        });

        const [selectedManopereIds, setSelectedManopereIds] = useState([]);

        const setCantitateHandler = (e) =>{
            if (/^\d*\.?\d{0,3}$/.test(e.target.value)) {
                setCantitate(e.target.value);
              }
        }

        const handleChangeFilterManopera = (e) => {
            const { name, value } = e.target;
            if(name === "cod_COR"){
                if(/^\d*$/.test(value)){
                    setManoperaFilters((prev) => ({ ...prev, [name]: value }));
                }
            }
            else{
                setManoperaFilters((prev) => ({
                    ...prev,
                    [name]: value,
                }));
            }
        };

         useEffect(() => {
                const getData = setTimeout(() => {
                     fetchManopere();
                }, 500)
                return () => clearTimeout(getData);
              }, [manoperaFilters]);
        

        const fetchManopere = async () => {
            try {
                if(manoperaFilters.cod_COR.trim().length >= 3 || manoperaFilters.ocupatie.trim().length >= 3){
                    const response = await api.get('/Manopera/FetchManopereLight', {
                        params: {
                            limba: manoperaFilters.limba,
                            cod_COR: manoperaFilters.cod_COR, // Pass cod_COR as a query parameter
                            ocupatie: manoperaFilters.ocupatie, // Add any other filters here
                        },
                    });
                    setManopere(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }

            //States for dropDown/edit/delete/copy and CHANGED language

            const translateAll = () => {
            if(!manopere || !manopere.length) return;
                // If there are any rows that are selected, iterate through and update the `selectedRetetaIds`
                setSelectedManopereIds((prev) => {
                    const updatedSelectedIds = manopere.map((manopera) => manopera.id); // All `retete` ids
                    // If a `reteta` is already selected, it will be removed from the list
                    return prev.length === manopere.length ? [] : updatedSelectedIds; // Toggle all if all are selected
                });
            };

        const toggleManopereChangeLanguage = (id) => {
            setSelectedManopereIds((prev) => {
            return prev.includes(id)
                ? prev.filter((r) => r !== id) 
                : [...prev, id];               
            });
        };


        //Handle ADD MANOPERA
        //
        //
        const handleAddItem = async () => {
            if(cantitate.trim() == ""){
                alert("Introdu o cantitate");
                return;
            }
            else if(!selectedManopera){
                alert("Alege o manopera");
                return;
            }
            try {
                await api.post("/Retete/addRetetaObjects", {cantitate:cantitate, objectId:selectedManopera.original.id,  retetaId:isPopupOpen, whatIs:"Manopera"})
                let [updatedretete , index] = delPreviewReteta(isPopupOpen);
                //lucram cu aceste retete si adaugam in inerior noul obiect pentru a fii folderul cu gri  sau albastru
                const parentIndex = updatedretete.findIndex((row) => row.id == isPopupOpen);
                if (parentIndex !== -1) {
                    const parentReteta = updatedretete[parentIndex];
                    parentReteta.has_manopera += 1; 
                    updatedretete[parentIndex] = { ...parentReteta };
                }
                fetchPreviewReteta(isPopupOpen, index , updatedretete);
                setIsPopupOpen(null);
            } catch (error) {
                console.log("Error at ading Manopera" , error);
            }
        };

        //TABLE
        //
        //
          const columns = useMemo(() => [
                { accessorKey: "limba", header: "Limba",size:50 },
                { accessorKey: "cod_COR", header: "Cod COR",size:50 },
                { 
                    accessorKey: "ocupatie", 
                    header: "Ocupatie",
                    cell: ({ getValue, row }) => (
                        selectedManopereIds.includes(row.original.id) ?
                        <div className=''>
                            {row.original.ocupatie_fr || "..."}
                        </div>
                        :
                        getValue()
                    ),  
                },
                { accessorKey: "unitate_masura", header: "Unitate",size:50 },
                { accessorKey: "cost_unitar", header: "Cost",size:50},
                { 
                    accessorKey: "threeDots", 
                    header: (
                        <div className='flex w-full   justify-center'>
                            <div onClick={() => translateAll()} className='bg-blue-500 rounded-xl px-4 w-1/2 hover:bg-blue-600 hover:cursor-pointer flex gap-2 p-2 items-center justify-center'>
                                    <FontAwesomeIcon className='text-white text-lg' icon={faLanguage}/>
                                    <span className='font-semibold'>Tradu Tot</span>
                            </div>
                        </div>
                    ),
                    cell: ({ row }) => (
                        <div className='w-full relative overflow-hidden flex '> 
                            <div className='text-3xl relative w-full py-2 select-none items-center justify-evenly gap-2 flex'>
                                <FontAwesomeIcon onClick={()  =>  toggleManopereChangeLanguage(row.original.id)} className=' text-blue-500 hover:text-blue-600 cursor-pointer' icon={faLanguage }/>
                            </div>
                        </div>
                    ),
                    size:50,
                },
            ], [selectedManopereIds, manopere]);
        
            const table = useReactTable({
                data: manopere,
                columns,
                getCoreRowModel: getCoreRowModel(),
                columnResizeMode: 'onChange',
                state: {
                    columnResizing: {},
                  },
            });

            
            useEffect(() => {
                document.addEventListener('click', handleClickOutside);
                return () => {
                    document.removeEventListener('click', handleClickOutside);
                };
            }, []);
        
            const handleClickOutside = (event) => {
                if (!event.target.closest('.dropdown-container')) {
                    setSelectedManopera(null);
                }
            };


  return (
    <>
        <div className=' flex flex-col h-full w-full overflow-hidden'>
            {/* Inputs for fetching manopere */}
            <div className='grid font-medium grid-cols-[auto_1fr_1fr] gap-4 p-4 pt-2 text-black containerWhiter w-full'>
                        <div className="flex w-full flex-col items-center ">
                                <label className=" text-black">
                                 Limba
                                </label>
                                        <select
                                            id="limba"
                                            name="limba"
                                            value={manoperaFilters.limba}
                                            onChange={handleChangeFilterManopera}
                                            className=" p-2 w-full cursor-pointer rounded-lg shadow-sm outline-none py-2"
                                        >
                                            <option value="">RO&FR</option>
                                            <option value="RO">RO</option>
                                            <option value="FR">FR</option>
               
                                        </select>
                        </div>  
                    <div className="flex w-full flex-col items-center ">
                      <label className=" text-black">
                          Cod COR 
                      </label>
                      <input
                          type="text"
                          id="cod_COR"
                          name="cod_COR"
                          value={manoperaFilters.cod_COR}
                          onChange={handleChangeFilterManopera}
                          maxLength={6}
                          className="px-2 outline-none text-center py-2  w-full rounded-lg shadow-sm "
                      />
                  </div>
                  <div className="flex flex-col w-full items-center ">
                      <label className=" text-black">
                          Ocupatie 
                      </label>
                      <input
                          type="text"
                          id="ocupatie"
                          name="ocupatie"
                          value={manoperaFilters.ocupatie}
                          onChange={handleChangeFilterManopera}
                          className="px-2 outline-none text-center py-2  w-full  rounded-lg shadow-sm "
                      />
                  </div>
            </div> 

            <div className=' w-full flex flex-col h-full justify-between gap-4 overflow-hidden p-4 '>
                <div className="w-full h-full flex flex-col scrollbar-webkit overflow-auto  justify-between">    
                               <table className="w-full  border-separate border-spacing-0 ">
                                 <thead className='top-0 w-full sticky  z-10 '>
                                   {table.getHeaderGroups().map(headerGroup => (
                                     <tr key={headerGroup.id} className="bg-white text-black text-left  font-bold select-none">
                                       {headerGroup.headers.map(header => (
                                          
                                               <th key={header.id}  className={`relative border-b border-r border-black   bg-white p-2 ${header.column.id === "threeDots" ? "text-center" : ""} `}     
                                               style={{
                                                   width:  `${header.getSize()}px`
                                               }}>
                                                   <div
                                                   onMouseDown={header.getResizeHandler()}
                                                   className={`absolute top-0 right-0 h-full w-2 bg-blue-300 cursor-pointer opacity-0 active:opacity-100 hover:opacity-100 transition-opacity duration-200`}
                   
                                                   ></div>
                                                    {header.column.columnDef.header}
                   
                                               </th>
                                               
                                         
                                       ))}
                                     </tr>
                                   ))}
                                 </thead>
                       {
                        manopere == null || manopere.length == 0 ?
                            <tbody>
                                <tr>
                                    <th className=' text-black border-b border-r  border-black  p-2 bg-white' colSpan={6}>Nici un Rezultat / Introdu minim 3 Caractere</th>
                                </tr>
                            </tbody>
                        :            
                            <tbody className=' relative z-0'>
                                   {table.getRowModel().rows.map((row,index,rows) => (
                                       <tr key={row.id} onClick={() => setSelectedManopera((prev) => prev?.original.id == row.original.id ? null : row)}  className={` dropdown-container  text-black ${selectedManopera?.original.id != row.original.id ? row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] hover:bg-[rgb(255,255,255,0.65)]  ' : 'bg-[rgb(255,255,255,1)] hover:bg-[rgb(255,255,255,0.90)]' : "bg-blue-300 hover:bg-blue-400"} `}>
                                           {row.getVisibleCells().map((cell) => (
                                                <td
                                                key={cell.id}
                                                className="border-b border-r break-words max-w-72 relative border-black p-1 px-3 
                                                            h-[3rem]  whitespace-normal 
                                                            overflow-auto"
                                            >
                                                <div className="h-full w-full overflow-hidden ">
                                                    <div className="max-h-12 h-12   grid grid-cols-1 items-center  break-words whitespace-pre-line   overflow-auto  scrollbar-webkit">
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </div>
                                                </div>
                                            </td>
                                           ))}
                                       </tr>
                                   ))}
                                   </tbody>}
                                </table>
                                </div>
                                    <div className='flex gap-4 w-full'>
                                        <div className="flex gap-4 items-center ">
                                            <label className=" font-medium">
                                                Cantitate: 
                                            </label>
                                            <input
                                                type="text"
                                                id="cantitate"
                                                name="cantitate"
                                                value={cantitate}
                                                maxLength={8}
                                                onChange={(e) => setCantitateHandler(e)}
                                                className="px-2 outline-none text-center dropdown-container tracking-wide py-2 flex-shrink-0 text-black  max-w-64  rounded-lg shadow-sm "
                                            />
                                        </div>
                                        <button onClick={() => handleAddItem()} className='bg-green-500 dropdown-container flex  items-center justify-center gap-2 text-black flex-grow hover:bg-green-600  px-6 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faPlus}/>Adauga Manopera</button>
                                    </div>
                                </div>                              
       </div>
    </>
  )
}
