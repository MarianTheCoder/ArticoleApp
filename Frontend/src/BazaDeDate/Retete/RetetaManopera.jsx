import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCancel, faCopy, faEllipsis, faL, faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';

export default function RetetaManopera() {

        const [manopere, setManopere] = useState(null);
        const [manoperaFilters, setManoperaFilters] = useState({
          cod_COR: '',
          ocupatie: '',
        });

    
        const handleChangeFilterManopera = (e) => {
            const { name, value } = e.target;
            setManoperaFilters((prev) => ({
                ...prev,
                [name]: value,
            }));
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

        //TABLE
        //
        //
          const columns = useMemo(() => [
                { accessorKey: "cod_COR", header: "Cod COR" },
                { accessorKey: "ocupatie", header: "Ocupatie" },
                { accessorKey: "unitate_masura", header: "Unitate" },
                { accessorKey: "cost_unitar", header: "Cost"},
            ], []);
        
            const table = useReactTable({
                data: manopere,
                columns,
                getCoreRowModel: getCoreRowModel(),
                columnResizeMode: 'onChange',
                state: {
                    columnResizing: {},
                  },
            });


  return (
    <>
      <div className='w-full pt-4 rounded-xl grid grid-rows-[auto_1fr] gap-2 h-full '>
            <div className='w-full gap-4 px-4 py-2 pb-4 containerWhiter grid grid-cols-[1fr_1fr]'>
                <div className="flex w-full flex-col items-center">
                <label className=" font-medium text-black">
                  Cod COR
                </label>
                <input
                    type="text"
                    id="cod_COR"
                    name="cod_COR"
                    value={manoperaFilters.cod_COR}
                    onChange={handleChangeFilterManopera}
                    className="px-2 w-full outline-none text-black text-center py-2  rounded-lg shadow-sm"
                    placeholder="Enter Cod COR"
                />
                </div>
                <div className="flex w-full flex-col items-center">
                <label className=" font-medium text-black">
                    Articol
                </label>
                <input
                    type="text"
                    id="ocupatie"
                    name="ocupatie"
                    value={manoperaFilters.ocupatie}
                    onChange={handleChangeFilterManopera}
                    className="px-2 w-full outline-none text-black text-center py-2  rounded-lg shadow-sm "
                    placeholder="Enter Ocupatie"
                />
                </div>
            </div>
          { 
            manopere &&  
            <div className="w-full h-full flex scrollbar-webkit overflow-hidden mt-6">
            <div className=" px-6 pb-4 scrollbar-webkit text-white h-full flex flex-col justify-between ">
                    <div className="overflow-auto  scrollbar-webkit">
                               <table className="w-full  border-separate border-spacing-0 ">
                                 <thead className='top-0 w-full sticky  z-10 '>
                                   {table.getHeaderGroups().map(headerGroup => (
                                     <tr key={headerGroup.id} className="bg-white text-black text-left  font-bold select-none">
                                       {headerGroup.headers.map(header => (
                                          
                                               <th key={header.id}  className={`relative border-b-2 border-black border  bg-white p-1 ${header.column.id === "threeDots" ? "text-center" : ""} `}     
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
                                 <tbody className=' relative z-0'>
                                   {table.getRowModel().rows.map((row,index,rows) => (
                                       <tr key={row.id}  className={`dropdown-container  text-black ${row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] ' : 'bg-[rgb(255,255,255,1)]'} `}>
                                           {row.getVisibleCells().map((cell) => (
                                               <td
                                                   key={cell.id}
                                                   className={`  border break-words max-w-72 relative border-black p-1 px-3`}
                                                   style={cell.column.columnDef.meta?.style} // Apply the custom style
                                               >
                                                   {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                               </td>
                                           ))}
                                       </tr>
                                   ))}
                                   </tbody>
                               </table>
                               </div>
                             </div>
                             {/* Pagination */}
                                <div className=' flex z-20 relative bg-red-400 w-full h-32'> 
                                    fsd
                                </div>
                            </div>
                            }       
        </div>
    </>
  )
}
