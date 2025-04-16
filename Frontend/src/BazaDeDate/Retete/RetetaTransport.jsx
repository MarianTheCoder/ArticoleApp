import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowRightLong, faCancel, faCopy, faEllipsis, faL, faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { RetetaContext } from '../../context/RetetaContext';

export default function RetetaTransport({
    setIsPopupOpen,
    open,
    isPopupOpen,
    setOpen,
    delPreviewReteta,
    fetchPreviewReteta,
  }) {


        const [cantitate, setCantitate] = useState("");
        const [selectedTransport,setSelectedTransport] = useState(null);

        const [transport, setTransport] = useState(null);
        const [transportFilters, setTransportFilters] = useState({
            cod_transport: "",
            transport: '',
            clasa_transport:"",
        });

        const setCantitateHandler = (e) =>{
            if (/^\d*\.?\d{0,3}$/.test(e.target.value)) {
                setCantitate(e.target.value);
              }
        }

        const handleChangeFilterManopera = (e) => {
            const { name, value } = e.target;
                setTransportFilters((prev) => ({
                    ...prev,
                    [name]: value,
               }));
        };

         useEffect(() => {
                const getData = setTimeout(() => {
                     fetchManopere();
                }, 500)
                return () => clearTimeout(getData);
              }, [transportFilters]);
        

        const fetchManopere = async () => {
            try {
                if(transportFilters.cod_transport.trim().length >= 3 || transportFilters.transport.trim().length >= 3 || transportFilters.clasa_transport.trim().length >= 3){
                    const response = await api.get('/Transport/FetchTransportLight', {
                        params: {
                            cod_transport: transportFilters.cod_transport, // Pass cod_COR as a query parameter
                            transport: transportFilters.transport, // Add any other filters here
                            clasa_transport: transportFilters.clasa_transport, // Add any other filters here
                        },
                    });
                    setTransport(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        //Handle ADD MANOPERA
        //
        //
        const handleAddItem = async () => {
            if(cantitate.trim() == ""){
                alert("Introdu o cantitate");
                return;
            }
            else if(!selectedTransport){
                alert("Alege o manopera");
                return;
            }
            try {
                await api.post("/Retete/addRetetaObjects", {cantitate:cantitate, objectId:selectedTransport.original.id,  retetaId:isPopupOpen, whatIs:"Transport"})
                let [updatedretete , index] = delPreviewReteta(isPopupOpen);
                const parentIndex = updatedretete.findIndex((row) => row.id == isPopupOpen);
                if (parentIndex !== -1) {
                    const parentReteta = updatedretete[parentIndex];
                    parentReteta.has_transport += 1; 
                    updatedretete[parentIndex] = { ...parentReteta };
                }
                fetchPreviewReteta(isPopupOpen, index , updatedretete);
                setIsPopupOpen(null);
            } catch (error) {
                console.log("Error at ading Transport" , error);
            }
        };

        //TABLE
        //
        //
          const columns = useMemo(() => [
                { accessorKey: "cod_transport", header: "Cod" },
                { accessorKey: "clasa_transport", header: "Clasa" },
                { accessorKey: "transport", header: "Transport" },
                { accessorKey: "cost_unitar", header: "Cost"},
                { accessorKey: "unitate_masura", header: "Unitate"},
            ], []);
        
            const table = useReactTable({
                data: transport,
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
                   setSelectedTransport(null);
                }
            };


  return (
    <>
        <div className=' flex flex-col h-full w-full overflow-hidden'>
            {/* Inputs for fetching transport */}
            <div className='grid font-medium grid-cols-3 gap-4 p-4 pt-2 text-black containerWhiter w-full'>
                    <div className="flex w-full flex-col items-center ">
                      <label className=" text-black">
                          Cod
                      </label>
                      <input
                          type="text"
                          id="cod_transport"
                          name="cod_transport"
                          value={transportFilters.cod_transport}
                          onChange={handleChangeFilterManopera}
                          maxLength={12}
                          className="px-2 outline-none text-center py-2  w-full rounded-lg shadow-sm "
                          placeholder="Enter Cod"
                      />
                  </div>
                  <div className="flex w-full flex-col items-center ">
                      <label className=" text-black">
                          Clasa
                      </label>
                      <input
                          type="text"
                          id="clasa_transport"
                          name="clasa_transport"
                          value={transportFilters.clasa_transport}
                          onChange={handleChangeFilterManopera}
                          maxLength={55}
                          className="px-2 outline-none text-center py-2  w-full rounded-lg shadow-sm "
                          placeholder="Enter Clasa"
                      />
                  </div>
                  <div className="flex flex-col w-full items-center ">
                      <label className=" text-black">
                          Transport 
                      </label>
                      <input
                          type="text"
                          id="transport"
                          name="transport"
                          value={transportFilters.transport}
                          onChange={handleChangeFilterManopera}
                          className="px-2 outline-none text-center py-2  w-full  rounded-lg shadow-sm "
                          placeholder="Enter Transport"
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
                                          
                                               <th key={header.id}  className={`relative border-b border-r border-black   bg-white p-1 ${header.column.id === "threeDots" ? "text-center" : ""} `}     
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
                        transport == null || transport.length == 0 ?
                            <tbody>
                                <tr>
                                    <th className=' text-black border-b border-r  border-black  p-2 bg-white' colSpan={5}>Nici un Rezultat / Introdu minim 3 Caractere</th>
                                </tr>
                            </tbody>
                        :            
                            <tbody className=' relative z-0'>
                                   {table.getRowModel().rows.map((row,index,rows) => (
                                       <tr key={row.id} onClick={() =>setSelectedTransport((prev) => prev?.original.id == row.original.id ? null : row)}  className={` dropdown-container  text-black ${selectedTransport?.original.id != row.original.id ? row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] hover:bg-[rgb(255,255,255,0.65)]  ' : 'bg-[rgb(255,255,255,1)] hover:bg-[rgb(255,255,255,0.90)]' : "bg-blue-300 hover:bg-blue-400"} `}>
                                           {row.getVisibleCells().map((cell) => (
                                                <td
                                                key={cell.id}
                                                className="border-b border-r break-words max-w-72 relative border-black p-1 px-3 
                                                            h-[3rem]  whitespace-normal 
                                                            overflow-auto"
                                            >
                                                <div className="h-full w-full overflow-hidden text-ellipsis">
                                                    <div className="max-h-[3rem] scrollbar-webkit overflow-y-auto">
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
                                                placeholder="Enter Cantitate"
                                            />
                                        </div>
                                        <button onClick={() => handleAddItem()} className='bg-green-500 dropdown-container flex  items-center justify-center gap-2 text-black flex-grow hover:bg-green-600  px-6 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faPlus}/>Adauga Manopera</button>
                                    </div>
                                </div>                              
       </div>
    </>
  )
}
