import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCancel, faCopy, faEllipsis, faL, faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import photoApi from '../../api/photoAPI'

export default function ManoperaTable({reloadKey, setSelectedFile, setPreview, selectedDelete, setSelectedDelete, setSelectedEdit, setFormData, selectedEdit, cancelEdit, cancelDelete}) {

    const [utilaje, setUtilaje] = useState(null);
    const [totalItems, setTotalItems] = useState(0);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [limit, setLimit] = useState(20);

    const [filters, setFilters] = useState({
        descriere_utilaj: '',
        utilaj: '',
        clasa_utilaj: '',
    });

 
    const fetchManopere = async (offset, limit) => {
        try {
            const response = await api.get('/Utilaje/api/utilaje', {
                params: {
                    offset,
                    limit,
                    descriere_utilaj: filters.descriere_utilaj, // Pass cod_COR as a query parameter
                    utilaj: filters.utilaj, // Add any other filters here
                    clasa_utilaj: filters.clasa_utilaj, // Add any other filters here
                },
            });
            if(response.data.data.length == 0) return;
            if(offset >= Math.ceil(response.data.totalItems/limit)){
                fetchManopere(0, limit);
            }
            else{
                setUtilaje(response.data.data);
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
    const handleSelectedForDelete = (e, id) => {
        setSelectedDelete(id)// Toggle the dropdown based on the current state
        cancelEdit(e);
    }

    const handleSelectedForEdit = (passedRow) => {
        setSelectedEdit(passedRow.id)// Toggle the dropdown based on the current state
        setFormData({
            clasa_utilaj: passedRow.clasa_utilaj,
            utilaj: passedRow.utilaj,
            descriere_utilaj: passedRow.descriere_utilaj,
            status_utilaj: passedRow.status_utilaj,
            cost_amortizare: passedRow.cost_amortizare,
            pret_utilaj: passedRow.pret_utilaj,
            unitate_masura: passedRow.unitate_masura,
            cantitate: passedRow.cantitate
        })
        setPreview(`${photoApi}/${passedRow.photoUrl}`);
        setSelectedFile(null);
        setSelectedDelete(null);
    }

    //copy mechanics
    const [selectedRows, setSelectedRows] = useState({});
    const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

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

    const handleCtrlC = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
            console.log("Ctrl + C was pressed!");
            handleCopy();
        }
      };



    //Handle Click Outside!
    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        document.addEventListener('keydown', handleCtrlC);
        return () => {
          document.removeEventListener('keydown', handleCtrlC);
        };
      }, [selectedRows]);

    const handleClickOutside = (event) => {
        if (!event.target.closest('.dropdown-container')) {
            setSelectedRows({}); // Close the dropdown if click is outside
            setLastSelectedIndex(null);
        }
    };

    const columns = useMemo(() => [
        { accessorKey: "clasa_utilaj", header: "Clasa", size:80 },
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
        { accessorKey: "utilaj", header: "Utilaj"},
        { accessorKey: "descriere_utilaj", header: "Descriere",size: 200},
        { accessorKey: "status_utilaj", header: "Status",size:70},
        { accessorKey: "unitate_masura", header: "Unitate",size:20},
        { accessorKey: "cost_amortizare", header: "Cost Amortizare",size:85},
        { accessorKey: "pret_utilaj", header: "Pret Utilaj", size:60},
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
                    textAlign: 'center', // Center the icon
                    padding: '0', // Reduce padding to minimize the space
                },
            },
        },
    ], [selectedDelete]);

    const table = useReactTable({
        data: utilaje,
        columns,
        getCoreRowModel: getCoreRowModel(),
        columnResizeMode: 'onChange',
        state: {
            columnResizing: {},
          },
    });


  return (
    <>
       
        {utilaje &&
            <div className="px-6 pb-4 scrollbar-webkit text-white h-full flex flex-col justify-between">
            <div className="overflow-auto scrollbar-webkit">
            <table className="w-full border-separate border-spacing-0 ">
              <thead className='top-0 w-full sticky  z-10 '>
              <tr className='text-black'>
                                    <th className='border-b border-r border-black'>
                                        <input
                                            type="text"
                                            name="clasa_utilaj"
                                            value={filters.clasa_utilaj}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none py-3"
                                            placeholder="Filter by Clasa "
                                        />
                                    </th>
                                    <th className=" bg-white border-b border-r border-black">
                                    
                                    </th>
                                    <th className='border-b border-r border-black'>
                                        <input
                                            type="text"
                                            name="utilaj"
                                            value={filters.utilaj}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filter by Utilaj"
                                        />
                                    </th>
                                    <th className='border-b border-r border-black'>
                                        <input
                                            type="text"
                                            name="descriere_utilaj"
                                            value={filters.descriere_utilaj}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filter by Descriere"
                                        />
                                    </th>
                                    <th className=" bg-white border-b border-r border-black" colSpan={6}>
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
                       
                            <th key={header.id}  className={`relative border-b-2 border-r border-black   bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""} `}     
                            style={{
                                width: header.column.id === "threeDots" ? '55px' : `${header.getSize()}px`, // Enforce width for "Options"
                                minWidth: header.column.id === "threeDots" ? '55px' : '', // Ensure no shrinkage
                                maxWidth: header.column.id === "threeDots" ? '55px' : '', // Ensure no expansion
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
                    <tr key={row.id} onClick = {(event) =>!selectedDelete && !selectedEdit && handleRowClick(row,event,rows)}  className={`dropdown-container  text-black 
                        ${selectedDelete || selectedEdit ? row.original.id == selectedDelete ? "bg-red-300" : row.original.id == selectedEdit ? "bg-green-300" : 
                            row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] select-none' :'bg-[rgb(255,255,255,1)] select-none' 
                            : 
                        selectedRows[row.index] ? "bg-blue-300 hover:bg-blue-400 select-none" :
                            row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] hover:bg-[rgb(255,255,255,0.65)] select-none' : 'bg-[rgb(255,255,255,1)] hover:bg-[rgb(255,255,255,0.9)]  select-none'}`
                        }>  
                        {row.getVisibleCells().map((cell) => (
                            <td
                                key={cell.id}
                                className={`max-w-72  border-b border-r break-words relative border-black p-1 px-3`}
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
