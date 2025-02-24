import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import photoAPI from '../../api/photoAPI';

export default function Material({reloadKey}) {
    const [products, setProducts] = useState([]);
    const [filters, setFilters] = useState({ cod_COR: '', ocupatie: '' });
    const [currentOffset, setCurrentOffset] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;

    useEffect(() => {
        fetchProducts();
    }, [reloadKey]); // Runs only once on component mount

    const fetchProducts = async () => {
        try {
            const response = await api.get('/Materiale/api/materiale');
            setProducts(response.data);
            setTotalItems(response.data.length); // Adjust as needed if your API has pagination
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const columns = useMemo(() => [
        { accessorKey: "furnizor", header: "Furnizor" },
        { accessorKey: "clasa_material", header: "Clasa de materiale" },
        { accessorKey: "cod_produs", header: "Cod Produs" },
        { accessorKey: "denumire_produs", header: "Denumire Produs" },
        { accessorKey: "descriere_produs", header: "Descriere Produs" },
        {
            accessorKey: "photoUrl", 
            header: "Poza",
            cell: ({ getValue }) => (
            <div className='flex justify-center items-center'>
                <img 
                    src={`${photoAPI}/${getValue()}`}  // Concatenate the base URL with the value
                    alt="Product"
                    className="h-16 max-w-48 object-cover" 
                    style={{ objectFit: 'cover' }}
                    />
            </div>
            ),
        },
        { accessorKey: "unitate_masura", header: "Unitate de masura" },
        { accessorKey: "cost_unitar", header: "Cost unitar" },
        { accessorKey: "cost_preferential", header: "Cost Preferential" },
        { accessorKey: "pret_vanzare", header: "Pret Vanzare" },
    ], []);

    const table = useReactTable({
        data: products,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: {
            columnResizing: {},
        },
        columnResizeMode: 'onChange',
       
    });

    return (
        products.length > 0 && (
            <div className="p- scrollbar-webkit text-white h-full flex flex-col">
                <div className="overflow-auto scrollbar-webkit">
                    <table className="w-full border-separate border-spacing-0">
                        <thead className="top-0 w-full sticky">
                            <tr className="text-black">
                                <th className="border border-black">
                                    <input
                                        type="text"
                                        name="cod_COR"
                                        value={filters.cod_COR}
                                        onChange={handleInputChange}
                                        className="p-2 w-full outline-none py-4"
                                        placeholder="Filter by Cod COR"
                                    />
                                </th>
                                <th className="border border-black">
                                    <input
                                        type="text"
                                        name="clasa_materiale"
                                        value={filters.ocupatie}
                                        onChange={handleInputChange}
                                        className="p-2 w-full outline-none py-4"
                                        placeholder="Filter by Ocupatie"
                                    />
                                </th>
                                <th className="bg-white border-l border-t border-b border-black"></th>
                                <th className="bg-white border-t border-b border-black "></th>
                                <th className="bg-white border-t border-b border-black "></th>
                                <th className="bg-white border-t border-b border-black border-r"></th>
                            </tr>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="bg-white text-black text-left font-bold select-none">
                                    {headerGroup.headers.map((header) => (
                                        <th key={header.id} className="relative border-b-2 border-black border bg-white p-2 py-4" style={{ width: `${header.getSize()}px` }}>
                                            <div onMouseDown={header.getResizeHandler()} className="absolute top-0 right-0 h-full w-2 bg-blue-400 cursor-pointer opacity-0 active:opacity-100 hover:opacity-100 transition-opacity duration-200"></div>
                                            {header.column.columnDef.header}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className={`text-black ${row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.8)]' : 'bg-[rgb(255,255,255,1)]'}`}>
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="border border-black p-1 px-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex justify-between">
                    <button className="p-2 bg-gray-300 rounded" onClick={() => setCurrentOffset(Math.max(currentOffset - 1, 0))} disabled={currentOffset === 0}>
                        Previous
                    </button>
                    <span>Page {currentOffset + 1}</span>
                    <button className="p-2 bg-gray-300 rounded" onClick={() => setCurrentOffset(currentOffset + 1)} disabled={currentOffset + 1 === Math.ceil(totalItems / limit)}>
                        Next
                    </button>
                </div>
            </div>
        )
    );
}
