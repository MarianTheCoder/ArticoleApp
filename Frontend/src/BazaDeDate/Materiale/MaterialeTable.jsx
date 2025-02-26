import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCancel, faCopy, faEllipsis, faL, faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import photoApi from '../../api/photoAPI'

export default function ManoperaTable({reloadKey, setSelectedFile, setPreview, selectedDelete, setSelectedDelete, setSelectedEdit, setFormData, selectedEdit, cancelEdit, cancelDelete}) {

    const [materiale, setMateriale] = useState(null);
    const [totalItems, setTotalItems] = useState(0);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [limit, setLimit] = useState(20);

    const [filters, setFilters] = useState({
        cod: '',
        denumire: '',
        descriere: '',
    });

 
    const fetchManopere = async (offset, limit) => {
        try {
            const response = await api.get('/Materiale/api/materiale', {
                params: {
                    offset,
                    limit,
                    cod: filters.cod, // Pass cod_COR as a query parameter
                    denumire: filters.denumire, // Add any other filters here
                    descriere: filters.descriere, // Add any other filters here
                },
            });
            if(offset >= Math.ceil(response.data.totalItems/limit)){
                fetchManopere(0, limit);
            }
            else{
                setMateriale(response.data.data);
                setTotalItems(response.data.totalItems);
                setCurrentOffset(response.data.currentOffset);
            }
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
    //States for dropDown/edit/delete/copy

    //handle selected edit/delete
    const handleSelectedForDelete = (id) => {
        setSelectedDelete(id)// Toggle the dropdown based on the current state
        setSelectedEdit(null);
    }

    const handleSelectedForEdit = (passedRow) => {
        setSelectedEdit(passedRow.id)// Toggle the dropdown based on the current state
        setFormData({
            furnizor: passedRow.furnizor,
            clasa_material: passedRow.clasa_material,
            cod_produs: passedRow.cod_produs,
            denumire_produs: passedRow.denumire_produs,
            descriere_produs: passedRow.descriere_produs,
            unitate_masura: passedRow.unitate_masura,
            cost_unitar: passedRow.cost_unitar,
            cost_preferential: passedRow.cost_preferential,
            pret_vanzare: passedRow.pret_vanzare,
        })
        setPreview(`${photoApi}/${passedRow.photoUrl}`);
        setSelectedFile(null);
        setSelectedDelete(null);
    }

    //copy mechanics
    const [selectedRows, setSelectedRows] = useState({});
    const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
    const [isCopying, setCopying] = useState(false);

    //PASSING WITH ROWID . NOT ORIGINAL
    const handleRowClick = (row, event, rows) => {
        // Check if Shift key is pressed
        if(event.ctrlKey){
            const newSelectedRows = { ...selectedRows };
            const rowId = row.index; // Assuming each row has an `id` field
            newSelectedRows[rowId] = !newSelectedRows[rowId]; // Toggle selection
            setSelectedRows(newSelectedRows);
        }
        else if (event.shiftKey && lastSelectedIndex !== null) {
            // Select all rows between the first selected and the current one
            const newSelectedRows = { ...selectedRows };
            const startIndex = Math.min(lastSelectedIndex, row.index);
            const endIndex = Math.max(lastSelectedIndex, row.index);
            for (let i = startIndex; i <= endIndex; i++) {
                const rowId = rows[i].index;  // Assuming each row has an `id` field
                newSelectedRows[rowId] = true;  // Mark the row as selected
            }
            setSelectedRows(newSelectedRows);
        } else {
            // If Shift key is not pressed, toggle the selected state of the clicked row
            const newSelectedRows = { };
            const rowId = row.index; // Assuming each row has an `id` field
            newSelectedRows[rowId] = !newSelectedRows[rowId]; // Toggle selection
            setSelectedRows(newSelectedRows);
        }
        setLastSelectedIndex(row.index);
    };

    const manageCancelCopy = () => {
        setSelectedRows({});
        setLastSelectedIndex(null);
        setCopying(false);
    }

    const startCopying = (e) =>{
        setCopying(true);
        cancelDelete(e);
        cancelEdit(e);

    }

    const handleCopy = () => {
        const rows = table.getRowModel().rows; // Access rows directly from the table
        const selectedRowIds = Object.keys(selectedRows).filter(rowId => selectedRows[rowId]);
    
        if (selectedRowIds.length === 0) {
            alert("No rows selected!");
            return;
        }
    
        const copiedData = selectedRowIds.map(rowId => {
            const row = rows.find(r => r.index === parseInt(rowId)); // Find row by rowId
            if (!row) return ''; // If row not
            const rowData = columns.map(column => row.getValue(column.accessorKey) || ''); // Get the row data using accessorKey for each column
        return rowData.join('\t'); // Join the row data with a tab
        }).join('\n'); // Join all rows with a newline

        // Copy the TSV formatted data to the clipboard
        navigator.clipboard.writeText(copiedData).then(() => {
            console.log("Selected rows copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy text: ", err);
        });
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
            setSelectedRows({}); // Close the dropdown if click is outside
            setLastSelectedIndex(null);
        }
    };

    const columns = useMemo(() => [
        { accessorKey: "furnizor", header: "Furnizor" },
        { accessorKey: "clasa_material", header: "Clasa"},
        { accessorKey: "cod_produs", header: "Cod", size:80},
        { accessorKey: "denumire_produs", header: "Denumire"},
        { accessorKey: "descriere_produs", header: "Descriere"},
        { 
            accessorKey: "photoUrl", 
            header: "Poza",
            cell: ({ getValue }) => (
                <div className='flex justify-center items-center'>
                    <img 
                        src={`${photoApi}/${getValue()}`}  // Concatenate the base URL with the value
                        alt="Product"
                        className="h-20 max-w-48 object-cover" 
                        style={{ objectFit: 'cover' }}
                        />
                </div>
                ),
            size:60
        },
        { accessorKey: "unitate_masura", header: "Unitate", size:50},
        { accessorKey: "cost_unitar", header: "Cost unitar" ,size:50},
        { accessorKey: "cost_preferential", header: "Cost Preferential", size:70},
        { accessorKey: "pret_vanzare", header: "Pret Vanzare", size:70},
        { 
            accessorKey: "threeDots", 
            header: "Optiuni",
            cell: ({ row }) => (
                <div className=' dropdown-container w-full relative flex '> 
                    <div className='text-xl relative w-full py-2 select-none items-center justify-evenly gap-1 flex'>
                        <FontAwesomeIcon onClick={() => !isCopying && handleSelectedForEdit(row.original)}  className=' text-green-500 hover:text-green-600 cursor-pointer' icon={faPenToSquare}/>
                        <FontAwesomeIcon onClick={() => !isCopying && handleSelectedForDelete(row.original.id)} className=' text-red-500 hover:text-red-600 cursor-pointer' icon={faTrashCan}/>
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
    ], [selectedDelete, isCopying]);

    const table = useReactTable({
        data: materiale,
        columns,
        getCoreRowModel: getCoreRowModel(),
        columnResizeMode: 'onChange',
        state: {
            columnResizing: {},
          },
    });


  return (
    <>
       
        {materiale &&
            <div className="px-6 pb-4 scrollbar-webkit text-white h-full flex flex-col justify-between">
            <div className="overflow-auto scrollbar-webkit">
            <table className="w-full border-separate border-spacing-0 ">
              <thead className='top-0 w-full sticky  z-10 '>
              <tr className='text-black'>
                                    <th className=" bg-white border border-black" colSpan={2}>
                                    
                                    </th>
                                    <th className='border border-black'>
                                        <input
                                            type="text"
                                            name="cod"
                                            value={filters.cod}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none py-3"
                                            placeholder="Filter by Cod "
                                        />
                                    </th>
                                    <th className='border border-black'>
                                        <input
                                            type="text"
                                            name="denumire"
                                            value={filters.denumire}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filter by Denumire"
                                        />
                                    </th>
                                    <th className='border border-black'>
                                        <input
                                            type="text"
                                            name="descriere"
                                            value={filters.descriere}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filter by Descriere"
                                        />
                                    </th>
                                    <th className=" bg-white border border-black" colSpan={5}>
                                       <div className=' flex  justify-center items-center'>
                                            <p className='px-2'>Arata</p>
                                            <input className='border border-black p-1 w-12 text-center rounded-lg' type="text" onChange={(e) => handleLimit(e)} value={limit} name="" id="" />
                                            <p className='px-2'>randuri</p>
                                       </div>
                                    </th>
                                    <th className=" bg-white border border-black">
                                       <div className=' flex justify-evenly items-center'>
                                            
                                            {
                                                isCopying ?
                                                <>
                                                    <FontAwesomeIcon onClick={() => handleCopy()} className='text-2xl text-blue-500 hover:text-blue-600 select-none cursor-pointer' icon={faCopy}/>
                                                    <FontAwesomeIcon onClick={() => manageCancelCopy()} className='text-2xl text-red-500 hover:text-red-600 select-none cursor-pointer' icon={faCancel}/>
                                                </>
                                                :
                                                <div onClick={(e) => startCopying(e)} className=' select-none cursor-pointer hover:bg-blue-600 w-4/5 py-1 rounded-lg bg-blue-500'>Copy</div>
                                            }
                                       </div>
                                    </th>
                                </tr>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-white text-black text-left  font-bold select-none">
                    {headerGroup.headers.map(header => (
                       
                            <th key={header.id}  className={`relative border-b-2 border-black border  bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""} `}     
                            style={{
                                width: header.column.id === "threeDots" ? '60px' : `${header.getSize()}px`, // Enforce width for "Options"
                                minWidth: header.column.id === "threeDots" ? '60px' : '', // Ensure no shrinkage
                                maxWidth: header.column.id === "threeDots" ? '60px' : '', // Ensure no expansion
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
                    <tr key={row.id} onClick = {(event) => isCopying && handleRowClick(row,event,rows)}  className={`dropdown-container  text-black ${!isCopying ? row.original.id == selectedDelete ? "bg-red-300" : row.original.id == selectedEdit ? "bg-green-300" : row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] ' : 'bg-[rgb(255,255,255,1)] ' : selectedRows[row.index] ? "bg-blue-300 hover:bg-blue-400 select-none" :row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] hover:bg-[rgb(255,255,255,0.65)] select-none ' : 'bg-[rgb(255,255,255,1)] hover:bg-[rgb(255,255,255,0.9)]  select-none' }`}>
                        {row.getVisibleCells().map((cell) => (
                            <td
                                key={cell.id}
                                className={`  border break-words relative border-black p-1 px-3`}
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
