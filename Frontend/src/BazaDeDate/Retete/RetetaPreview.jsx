import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowRightLong, faCancel, faCopy, faEllipsis, faL, faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { RetetaContext } from '../../context/RetetaContext';
import photoAPI from '../../api/photoAPI';

export default function RetetaMateriale() {

        const {setManopereSelected, manopereSelected, materialeSelected, setMaterialeSelected, transportSelected, setTransportSelected, utilajeSelected, setUtilajeSelected} = useContext(RetetaContext);

        const [obiecteReteta, setObiecteReteta] = useState(null);

        useEffect(() => {
            // Update the state immediately whenever these arrays change.
            setObiecteReteta([
                ...manopereSelected,
                ...materialeSelected,
                ...transportSelected,
                ...utilajeSelected
            ]);
        }, [manopereSelected, materialeSelected, transportSelected, utilajeSelected]);
        
        const handleDeleteFromReteta = (row) =>{
            if(row.original.whatIs == "Manopera"){
                setManopereSelected(manopereSelected.filter(item => item.id !== row.original.id));
            }
            else if(row.original.whatIs == "Material"){
                setMaterialeSelected(materialeSelected.filter(item => item.id !== row.original.id));
            }
            else if(row.original.whatIs == "Utilaj"){
                setUtilajeSelected(utilajeSelected.filter(item => item.id !== row.original.id));
            }
            else setTransportSelected(transportSelected.filter(item => item.id !== row.original.id));
        }

        //TABLE
        //
        //
        const columns = useMemo(() => [
            {   accessorKey: "whatIs", 
                header: "Tip", 
                size:85,
                cell: ({ getValue }) => (
                    <div className='flex w-full justify-center items-center'>
                        {getValue()}
                    </div>
                    ),
            },
            { 
                accessorKey: "photo", 
                header: "Poza",
                cell: ({ getValue }) => (
                    getValue() ? 
                    <div className='flex justify-center items-center'>
                        <img 
                            src={`${photoAPI}/${getValue()}`}  // Concatenate the base URL with the value
                            alt="Product"
                            className="h-[4rem] max-w-28 object-cover" 
                            style={{ objectFit: 'cover' }}
                            />
                    </div>
                    :
                    ""
                    ),
                    size:60
            },
            { accessorKey: "clasa", header: "Clasa", size:70},
            { accessorKey: "cod", header: "Cod",size:70},
            { accessorKey: "denumire", header: "Denumire"},
            { accessorKey: "cost", header: "Pret Vanzare",size:50},
            { accessorKey: "cantitate", header: "Cantitate",size:50},
            { 
                accessorKey: "", 
                header: " ",
                size:10,
                cell: ({ getValue, row }) => (
                    <div className='flex w-full justify-center items-center'>
                        <FontAwesomeIcon onClick={() => handleDeleteFromReteta(row)} className='text-red-500 cursor-pointer text-base hover:text-red-600' icon={faTrashCan}/>
                    </div>
                ),
            }
        ], [obiecteReteta]);
        
            const table = useReactTable({
                data: obiecteReteta,
                columns,
                getCoreRowModel: getCoreRowModel(),
                columnResizeMode: 'onChange',
                state: {
                    columnResizing: {},
                  },
            });



  return (
    <>
            <div className=' w-full flex flex-col h-full justify-between gap-4 overflow-hidden p-4 pt-0 md:px-4 xl:px-6 '>
                <div className="w-full h-full flex flex-col scrollbar-webkit overflow-auto text-sm  justify-between">    
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
                       {
                        obiecteReteta == null || obiecteReteta.length == 0 ?
                            <tbody>
                                <tr>
                                    <th className=' text-black border border-black border-t-0 p-2 bg-white' colSpan={8}>Nimic Adaugat</th>
                                </tr>
                            </tbody>
                        :            
                            <tbody className=' relative z-0'>
                                   {table.getRowModel().rows.map((row,index,rows) => (
                                       <tr key={row.id} className={` dropdown-container  text-black ${row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)]' : 'bg-[rgb(255,255,255,1)]'} `}>
                                           {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className={`border break-words max-w-72 relative border-black p-1 px-3 
                                                            max-h-4  whitespace-normal ${cell.column.id == "cantitate" ? " font-bold" : ""}
                                                            overflow-auto ${cell.column.id == "whatIs" ? cell.row.original.whatIs == "Material" ? "bg-[#C68E94]" :  cell.row.original.whatIs == "Manopera" ? "bg-[#8E7CC3]" : cell.row.original.whatIs == "Utilaj" ? "bg-[#8B6E6E]" : "bg-[#5F6CAF]" : ""}`} 
                                            >
                                                <div className="h-full w-full overflow-hidden text-ellipsis">
                                                    <div className="max-h-[4rem] scrollbar-webkit overflow-y-auto">
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
                            </div>                              
    </>
  )
}
