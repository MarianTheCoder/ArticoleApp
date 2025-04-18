import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowRightLong, faCancel, faCopy, faEllipsis, faL, faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { RetetaContext } from '../../context/RetetaContext';
import photoAPI from '../../api/photoAPI';

export default function RetetaUtilaje({
    setIsPopupOpen,
    open,
    isPopupOpen,
    setOpen,
    delPreviewReteta,
    fetchPreviewReteta,
}) {

        const [cantitate, setCantitate] = useState("");
        const [selectedUtilaje, setSelectedUtilaje] = useState(null);

        const [utilaje, setUtilaje] = useState(null);
        const [utilajeFilters, setUtilajeFilters] = useState({
          clasa_utilaj:"",
          utilaj:'',
          descriere_utilaj:"",
          status_utilaj:"",
        });

        const setCantitateHandler = (e) =>{
            if (/^\d*\.?\d{0,3}$/.test(e.target.value)) {
                setCantitate(e.target.value);
              }
        }

        const handleChangeFilterUtilaje = (e) => {
            const { name, value } = e.target;
                setUtilajeFilters((prev) => ({
                    ...prev,
                    [name]: value,
                }));
            // }
        };

         useEffect(() => {
                const getData = setTimeout(() => {
                     fetchManopere();
                }, 500)
                return () => clearTimeout(getData);
              }, [utilajeFilters]);
        

        const fetchManopere = async () => {
            try {
                if(utilajeFilters.clasa_utilaj.trim().length >= 3 || utilajeFilters.descriere_utilaj.trim().length >= 3 || utilajeFilters.utilaj.trim().length >= 3){
                    const response = await api.get('/Utilaje/api/utilajeLight', {
                        params: {
                            utilaj: utilajeFilters.utilaj, // Pass cod as a query parameter
                            clasa_utilaj:utilajeFilters.clasa_utilaj,
                            status_utilaj:utilajeFilters.status_utilaj,
                            descriere_utilaj: utilajeFilters.descriere_utilaj, // Add any other filters here
                        },
                    });
                    setUtilaje(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        //Handle ADD Utilaj
        //
        //
        const handleAddItem = async () => {
            if(cantitate.trim() == ""){
                alert("Introdu o cantitate");
                return;
            }
            else if(!selectedUtilaje){
                alert("Alege un Utilaj");
                return;
            }
            try {
                await api.post("/Retete/addRetetaObjects", {cantitate:cantitate, objectId:selectedUtilaje.original.id,  retetaId:isPopupOpen, whatIs:"Utilaje"})
                let [updatedretete , index] = delPreviewReteta(isPopupOpen);
                const parentIndex = updatedretete.findIndex((row) => row.id == isPopupOpen);
                if (parentIndex !== -1) {
                    const parentReteta = updatedretete[parentIndex];
                    parentReteta.has_utilaje += 1; 
                    updatedretete[parentIndex] = { ...parentReteta };
                }
                fetchPreviewReteta(isPopupOpen, index , updatedretete);
                setIsPopupOpen(null);
            } catch (error) {
                console.log("Error at ading Manopera" , error);
            };
        };

        //TABLE
        //
        //
        const columns = useMemo(() => [
            { 
                accessorKey: "photoUrl", 
                header: "Poza",
                cell: ({ getValue }) => (
                    <div className='flex justify-center items-center'>
                        <img 
                            src={`${photoAPI}/${getValue()}`}  // Concatenate the base URL with the value
                            alt="Product"
                            className="h-[4.5rem] max-w-32 object-cover" 
                            style={{ objectFit: 'cover' }}
                            />
                    </div>
                    ),
                    size:50
            },
            { accessorKey: "clasa_utilaj", header: "Clasa",size:50},
            { accessorKey: "utilaj", header: "Utilaj",size:100},
            { accessorKey: "descriere_utilaj", header: "Descriere"},
            { accessorKey: "pret_utilaj", header: "Pret",size:50}
        ], []);
        
            const table = useReactTable({
                data: utilaje,
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
                        setSelectedUtilaje(null);
                    }
                };


  return (
    <>
        <div className=' flex flex-col h-full w-full overflow-hidden'>
            {/* Inputs for fetching utilaje */}
            <div className='grid font-medium grid-cols-[2fr_1fr_2fr_auto] gap-4 p-4 pt-2 text-black containerWhiter w-full'>
            <div className="flex flex-col w-full items-center ">
                      <label className=" text-black">
                          Clasa 
                      </label>
                      <input
                          type="text"
                          id="clasa_utilaj"
                          name="clasa_utilaj"
                          value={utilajeFilters.clasa_utilaj}
                          onChange={handleChangeFilterUtilaje}
                          className="px-2 outline-none text-center py-2  w-full  rounded-lg shadow-sm "
                          placeholder="Enter Clasa"
                      />
                  </div>
                    <div className="flex w-full flex-col items-center ">
                      <label className=" text-black">
                          Utilaj 
                      </label>
                      <input
                          type="text"
                          id="utilaj"
                          name="utilaj"
                          value={utilajeFilters.utilaj}
                          onChange={handleChangeFilterUtilaje}
                          className="px-2 outline-none text-center py-2  w-full rounded-lg shadow-sm "
                          placeholder="Enter Cod"
                      />
                  </div>
                  <div className="flex flex-col w-full items-center ">
                      <label className=" text-black">
                          Descriere 
                      </label>
                      <input
                          type="text"
                          id="descriere_utilaj"
                          name="descriere_utilaj"
                          value={utilajeFilters.descriere_utilaj}
                          onChange={handleChangeFilterUtilaje}
                          className="px-2 outline-none text-center py-2  w-full  rounded-lg shadow-sm "
                          placeholder="Enter Ocupatie"
                      />
                  </div>
                  <div className="flex flex-col w-full items-center ">
                      <label className=" text-black">
                          Status 
                      </label>
                      <select
                            id="status_utilaj"
                            name="status_utilaj"
                            value={utilajeFilters.status_utilaj}
                            onChange={handleChangeFilterUtilaje}
                            className="px-2 outline-none text-center py-2  w-full  rounded-lg shadow-sm  "
                        >
                            <option value="">Toate</option>
                            <option value="Nou">Nou</option>
                            <option value="Ca Nou">Ca Nou</option>
                            <option value="Bun">Bun</option>
                            <option value="Recondiționat">Recondiționat</option>
                            <option value="Utilizat">Utilizat</option>
                            <option value="Defect">Defect</option>
                    </select>
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
                        utilaje == null || utilaje.length == 0 ?
                            <tbody>
                                <tr>
                                    <th className=' text-black border-b border-r border-black p-2 bg-white' colSpan={5}>Nici un Rezultat / Introdu minim 3 Caractere</th>
                                </tr>
                            </tbody>
                        :            
                            <tbody className=' relative z-0'>
                                   {table.getRowModel().rows.map((row,index,rows) => (
                                       <tr key={row.id} onClick={() => setSelectedUtilaje((prev) => prev?.original.id == row.original.id ? null : row)}  className={` dropdown-container  text-black ${selectedUtilaje?.original.id != row.original.id ? row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] hover:bg-[rgb(255,255,255,0.65)]  ' : 'bg-[rgb(255,255,255,1)] hover:bg-[rgb(255,255,255,0.90)]' : "bg-blue-300 hover:bg-blue-400"} `}>
                                           {row.getVisibleCells().map((cell) => (
                                               <td
                                                   key={cell.id}
                                                   className={`  border-b border-r break-words max-w-72 relative border-black p-1 px-3`}
                                                   style={cell.column.columnDef.meta?.style} // Apply the custom style
                                               >
                                                   {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                                                className="px-2 dropdown-container outline-none text-center tracking-wide py-2 flex-shrink-0 text-black  max-w-64  rounded-lg shadow-sm "
                                                placeholder="Enter Cantitate"
                                            />
                                        </div>
                                        <button onClick={() => handleAddItem()} className='bg-green-500 flex dropdown-container  items-center justify-center gap-2 text-black flex-grow hover:bg-green-600  px-6 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faPlus}/>Adauga Utilaj</button>
                                    </div>
                                </div>                              
       </div>
    </>
  )
}
