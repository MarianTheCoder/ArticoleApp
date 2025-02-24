import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';


export default function ManoperaTable({reloadKey}) {

    const [manopere, setManopere] = useState(null);
    const [totalItems, setTotalItems] = useState(0);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [limit, setLimit] = useState(20);

    const [filters, setFilters] = useState({
        cod_COR: '',
        ocupatie: '',
    });

 
    const fetchManopere = async (offset, limit) => {
        try {
            const response = await api.get('/Manopera/FetchManopere', {
                params: {
                    offset,
                    limit,
                    cod_COR: filters.cod_COR, // Pass cod_COR as a query parameter
                    ocupatie: filters.ocupatie, // Add any other filters here
                },
            });
            setManopere(response.data.data);
            setTotalItems(response.data.totalItems);
            setCurrentOffset(response.data.currentOffset);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    useEffect(() => { 
        fetchManopere(currentOffset, limit);
    }, [reloadKey]);

    useEffect(() => {
        const getData = setTimeout(() => {
            if(limit == '' || limit == 0)  fetchManopere(0, 10);
            else fetchManopere(0, limit);
        }, 500)
        return () => clearTimeout(getData);
      }, [filters,limit]);

    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    const handleClickOutside = (event) => {
        if (!event.target.closest('.dropdown-container')) {
            setIsOpen(null); // Close the dropdown if click is outside
        }
    };


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const setPage = (val) =>{
        setCurrentOffset((prev) => {
            // Calculate the new offset by adding `val` to the current offset
            const newOffset = Math.max(prev + val, 0); // Ensure offset does not go below 0
            // Call fetchManopere with the new offset
            fetchManopere(newOffset, limit);
            // Return the new offset to update the state
            return newOffset;
        });
    }

    const handleLimit = (e) =>{
        if(/^[0-9]{0,2}$/.test(e.target.value)){
            setLimit(e.target.value);
        } 
    }
    //States for dropDown/edit/delete/copy]
    const [selected, setSelected] = useState(null);
    const [isOpen, setIsOpen] = useState(null);

    const handleOpening = (id) => {
        setIsOpen((prev) => prev == id ? "null" : id)// Toggle the dropdown based on the current state
    }

    const columns = useMemo(() => [
        { accessorKey: "cod_COR", header: "Cod COR" },
        { accessorKey: "ocupatie", header: "Ocupatie", size:350 },
        { accessorKey: "unitate_masura", header: "Unitate", size:70 },
        { accessorKey: "cost_unitar", header: "Cost unitar", size:100 },
        { accessorKey: "cantitate", header: "Cantitate", size:100},
        { 
            accessorKey: "threeDots", 
            header: "Optiuni",
            cell: ({ row }) => (
                <div className=' dropdown-container w-full relative flex '> 
                    <div className='text-lg relative w-full select-none items-center justify-center flex'>
                        <FontAwesomeIcon className= {` ${row.original.id == isOpen ? "text-2xl" : ""} hover:cursor-pointer transition-all duration-200 hover:text-2xl  `} onClick={() => handleOpening(row.original.id)} icon={faEllipsis} />
                        {isOpen == row.original.id && (
                            <div className="absolute top-[1.1rem] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-b-black border-l-transparent border-r-transparent"></div>
                        )}
                        {isOpen == row.original.id && 
                        (
                            <div className=' p-2 space-y-1  rounded-lg min-w-full z-20 absolute bg-black text-white  top-7  '>
                                <p className=' cursor-pointer duration-300 transition-all text-green-500 hover:text-green-600'>Edit</p>
                                <p className=' cursor-pointer duration-300 transition-all text-[#2563EB] hover:text-[rgba(37,99,235,0.8)] '>Copy</p>
                                <p className=' cursor-pointer duration-300 transition-all text-red-500 hover:text-red-600 '>Delete</p>
                            </div>
                        )}
                    </div>
                </div>
            ),
            meta: {
                style: {
                    textAlign: 'center', // Center the icon
                    padding: '0', // Reduce padding to minimize the space
                },
            },
        },
    ], [isOpen]);

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
       
        {manopere &&
            <div className="px-6 pb-4 scrollbar-webkit text-white h-full flex flex-col justify-between">
            <div className="overflow-auto scrollbar-webkit">
            <table className="w-full border-separate border-spacing-0 ">
              <thead className='top-0 w-full sticky  z-10 '>
              <tr className='text-black'>
                                    <th className='border border-black'>
                                        <input
                                            type="text"
                                            name="cod_COR"
                                            value={filters.cod_COR}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none py-3
                                            
                                            "
                                            placeholder="Filter by Cod COR"
                                        />
                                    </th>
                                    <th className='border border-black'>
                                        <input
                                            type="text"
                                            name="ocupatie"
                                            value={filters.ocupatie}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filter by Ocupatie"
                                        />
                                    </th>
                                    <th className=" bg-white border-l border-t  border-b border-black" colSpan={4}>
                                       <div className=' flex  justify-center items-center'>
                                            <p className='px-2'>Arata</p>
                                            <input className='border border-black p-1 w-12 text-center rounded-lg' type="text" onChange={(e) => handleLimit(e)} value={limit} name="" id="" />
                                            <p className='px-2'>randuri</p>
                                       </div>
                                    </th>
                                </tr>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-white text-black text-left  font-bold select-none">
                    {headerGroup.headers.map(header => (
                       
                            <th key={header.id}  className={`relative border-b-2 border-black border  bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""} `}     
                            style={{
                                width: header.column.id === "threeDots" ? '40px' : `${header.getSize()}px`, // Enforce width for "Options"
                                minWidth: header.column.id === "threeDots" ? '40px' : '', // Ensure no shrinkage
                                maxWidth: header.column.id === "threeDots" ? '40px' : '', // Ensure no expansion
                            }}>
                                <div
                                onMouseDown={header.getResizeHandler()}
                                className={`absolute top-0 right-0 h-full w-2 bg-blue-400 cursor-pointer opacity-0 active:opacity-100 hover:opacity-100 transition-opacity duration-200 ${header.column.id === "threeDots" ? "hidden" : ""}`}

                                ></div>
                                 {header.column.columnDef.header}

                            </th>
                            
                      
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className=' relative z-0'>
                {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className={`text-black ${row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.8)]' : 'bg-[rgb(255,255,255,1)]'} ${row.original.id == selected ? "bg-red-200" : ""}`}>
                        {row.getVisibleCells().map((cell) => (
                            <td
                                key={cell.id}
                                className={` border relative  border-black p-1 px-3`}
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
            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between">
              <button
                className="p-2 min-w-24 bg-white text-black m rounded"
                onClick={() => setPage(-1)}
                disabled={currentOffset === 0}
              >
                Inapoi
              </button>
              <span className=' font-bold'>Pagina {currentOffset+1}</span>
              <button className="p-2 min-w-24 bg-white text-black m rounded" onClick={() => setPage(1)} disabled={currentOffset+1 === Math.ceil(totalItems/limit)}>
                Inainte
              </button>
            </div>
          </div>
        }
    </>
  )
}
