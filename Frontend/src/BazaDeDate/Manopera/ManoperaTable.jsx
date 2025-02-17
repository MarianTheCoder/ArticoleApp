import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { use } from 'react';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';

export default function ManoperaTable({reloadKey}) {

    const [manopere, setManopere] = useState(null);
    const [totalItems, setTotalItems] = useState(0);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [limit, setLimit] = useState(25);

    const fetchManopere = async (offset, limit) => {
        try {
            const response = await api.get(`/Manopera/FetchManopere?offset=${offset}&limit=${limit}`);
            setManopere(response.data.data);
            setTotalItems(response.data.totalItems);
            setCurrentOffset(response.data.currentOffset);
            console.log(response);
        }
        catch (error) {
            console.error('Eroare la obținerea datelor:', error);
        }
    }

    useEffect(() => {
        fetchManopere(currentOffset, limit);
      }, [currentOffset, limit, reloadKey]);



      const columns = useMemo(() => [
        { accessorKey: "cod_COR", header: "Cod COR" },
        { accessorKey: "ocupatie", header: "Ocupatie", size:250 },
        { accessorKey: "unitate_masura", header: "Unitate", size:70 },
        { accessorKey: "cost_unitar", header: "Cost unitar", size:100 },
        { accessorKey: "cantitate", header: "Cantitate", size:100},
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
       
        {manopere &&
            <div className="p-4 scrollbar-webkit text-white h-full flex flex-col">
            <div className="overflow-auto scrollbar-webkit">
            <table className="w-full">
              <thead className='top-0 sticky'>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-white text-black text-left  font-bold select-none">
                    {headerGroup.headers.map(header => (
                        <>
                            <th key={header.id}  className="relative border  p-3" style={{ width: `${header.getSize()}px` }}>
                                <div
                                onMouseDown={header.getResizeHandler()}
                                className="absolute top-0 right-0 h-full w-2 bg-blue-400 cursor-pointer opacity-0 active:opacity-100 hover:opacity-100 transition-opacity duration-200"

                                ></div>
                                 {header.column.columnDef.header}
                                
                            </th>
                            
                        </>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className={`text-black border ${row.index % 2 == 0 ? "bg-[rgb(255,255,255,0.8)]" : "bg-[rgb(255,255,255,1)]"}`} >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="border p-1 px-3 ">{cell.renderValue()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {/* Pagination Controls */}
            <div className="mt-4 flex justify-between">
              <button
                className="p-2 bg-gray-300 rounded"
                onClick={() => setCurrentOffset((prev) => Math.max(prev - 1, 0))}
                disabled={currentOffset === 0}
              >
                Previous
              </button>
              <span>Page {currentOffset+1}</span>
              <button className="p-2 bg-gray-300 rounded" onClick={() => setCurrentOffset((prev) => prev + 1)} disabled={currentOffset+1 === Math.ceil(totalItems/limit)}>
                Next
              </button>
            </div>
          </div>
        }
    </>
  )
}
