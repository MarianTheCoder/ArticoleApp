import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faCancel, faChevronDown, faChevronRight, faCopy, faEllipsis, faL, faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import RetetaTablePreview from './RetetaTablePreview';
import { RetetaContext } from '../../context/RetetaContext';
import photoAPI from '../../api/photoAPI';


export default function ManoperaTable({reloadKey, selectedDelete, setSelectedDelete, setSelectedEdit, setFormData, selectedEdit, cancelEdit, cancelDelete}) {

    const {setManopereSelected, manopereSelected, materialeSelected, setMaterialeSelected, transportSelected, setTransportSelected, utilajeSelected, setUtilajeSelected} = useContext(RetetaContext)

    const [open, setOpen] = useState(null);

    const [retete, setRetete] = useState(null);
    const [totalItems, setTotalItems] = useState(0);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [limit, setLimit] = useState(20);

    const [filters, setFilters] = useState({
        cod_reteta: '',
        clasa_reteta: '',
        articol: '',
    });

    

 
    const fetchManopere = async (offset, limit) => {
        try {
            const response = await api.get('/Retete/getRetete', {
                params: {
                    offset,
                    limit,
                    cod: filters.cod_reteta, // Pass cod_reteta as a query parameter
                    clasa: filters.clasa_reteta, // Add any other filters here
                    articol: filters.articol, // Add any other filters here
                },
            });
            if(offset >= Math.ceil(response.data.totalItems/limit)){
                fetchManopere(0, limit);
            }
            else{
                setRetete(response.data.data);
                setTotalItems(response.data.totalItems);
                setCurrentOffset(response.data.currentOffset);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const fetchPreviewReteta = async () => {
        try {
            const response = await api.get(`/Retete/getSpecificReteta/${open}`);
            console.log(retete);
            const updatedRetete = [...retete];
            const newObjects = [...response.data.manopera, ...response.data.materiale, ...response.data.utilaje];
            console.log(newObjects)
            // Find the index of the target object
            const targetIndex = updatedRetete.findIndex(item => item.id === open);
    
            if (targetIndex !== -1) {
                // Insert new objects after the target object
                updatedRetete.splice(targetIndex + 1, 0, ...newObjects);
                setRetete(updatedRetete); // Update the state
            }
            
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }


    useEffect(() => { 
        if(open != null) fetchPreviewReteta();
    }, [open])

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
    //States for dropDown/edit/delete

    //handle selected edit/delete
    const handleSelectedForDelete = (e, id) => {
        setSelectedDelete(id)
        cancelEdit(e);
    }

    const handleSelectedForEdit = async (passedRow) => {
        setSelectedDelete(null);
        try {
            const response = await api.get(`/Retete/getSpecificReteta/${passedRow.id }`);
            console.log(response);
            setSelectedEdit(passedRow.id);
            setFormData({
                clasa: passedRow.clasa_reteta,
                cod: passedRow.cod_reteta,
                articol: passedRow.articol,
                unitate_masura: passedRow.unitate_masura
            })
            setManopereSelected(response.data.manopera);
            setMaterialeSelected(response.data.materiale);
            // setTransportSelected(response.data.transport);
            setUtilajeSelected(response.data.utilaje);
            
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }



    const columns = useMemo(() => [
        { 
            accessorKey: "Dropdown", 
            header: "",
            cell: ({ row, getValue, cell }) => (
                <div onClick={() => setOpen((prev) => prev == cell.row.original.id ? null : cell.row.original.id)} className='flex justify-center select-none w-full cursor-pointer items-center'>
                    <FontAwesomeIcon  className={`  text-center ${open == cell.row.original.id ? " rotate-90" : ""}  text-xl`} icon={faChevronRight}/>
                </div>
            ),
        },
        { accessorKey: "cod_reteta", header: "Cod",size:100 },
        { accessorKey: "clasa_reteta", header: "Clasa", size:100},
        { accessorKey: "articol", header: "Articol", size:500 },
        { accessorKey: "unitate_masura", header: "Unitate",size:60},
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
        { accessorKey: "cantitate", header: "Cantitate", size:60},
        { 
            accessorKey: "threeDots", 
            header: "Optiuni",
            cell: ({ row }) => (
                <div className=' dropdown-container w-full relative flex '> 
                    <div className='text-xl relative w-full py-2 select-none items-center justify-evenly gap-1 flex'>
                        <FontAwesomeIcon onClick={() => handleSelectedForEdit(row.original)}  className=' text-green-500 hover:text-green-600 cursor-pointer' icon={faPenToSquare}/>
                        <FontAwesomeIcon onClick={(e) => handleSelectedForDelete(e, row.original.id)} className=' text-red-500 hover:text-red-600 cursor-pointer' icon={faTrashCan}/>
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
    ], [selectedDelete, open]);

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
            <div className="px-6 pb-4 scrollbar-webkit text-white h-full flex flex-col justify-between">
            <div className="overflow-auto  scrollbar-webkit">
                <table className="w-full  border-separate border-spacing-0 ">
                    <thead className='top-0 w-full sticky  z-10 '>
                        <tr className='text-black'>
                                    <th className='border border-black bg-white'></th>
                                    <th className='border border-black'>
                                        <input
                                            type="text"
                                            name="clasa_reteta"
                                            value={filters.clasa_reteta}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none py-3"
                                            placeholder="Filter by Clasa"
                                        />
                                    </th>
                                    <th className='border border-black'>
                                        <input
                                            type="text"
                                            name="cod_reteta"
                                            value={filters.cod_reteta}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filter by Cod"
                                        />
                                    </th>
                                    <th className='border border-black'>
                                        <input
                                            type="text"
                                            name="articol"
                                            value={filters.articol}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filter by Articol"
                                        />
                                    </th>
                                    <th className=" bg-white border border-black" colSpan={4}>
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
                                width: header.column.id === "threeDots" ? '55px' : header.column.id === "Dropdown" ? "15px": `${header.getSize()}px`, // Enforce width for "Options"
                                minWidth: header.column.id === "threeDots" ?  '55px' : header.column.id === "Dropdown" ? "15px" : '', // Ensure no shrinkage
                                maxWidth: header.column.id === "threeDots" ? '55px' : header.column.id === "Dropdown" ? "15px" : '', // Ensure no expansion
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
              <tbody className=' relative z-0'>
                {table.getRowModel().rows.map((row,index,rows) => (
                    <tr key={row.id}   className={`dropdown-container   text-black ${row.original.id == selectedDelete ? "bg-red-300 sticky" : row.original.id == selectedEdit ? "bg-green-300 sticky" : row.original.id == open ? "bg-blue-300" : row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] ' : 'bg-[rgb(255,255,255,1)] '}`}>
                        {row.getVisibleCells().map((cell) => (
                            <td
                            
                            key={cell.id}
                            className={`   border break-words max-w-72  relative border-black p-1 px-3`}
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
              <button className="p-2 min-w-24 bg-white text-black m rounded" onClick={() => setPage(1)} disabled={currentOffset+1 >= Math.ceil(totalItems/limit)}>
                Inainte
              </button>
            </div>
          </div>
        }
    </>
  )
}
