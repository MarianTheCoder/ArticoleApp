import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faCancel, faCar, faChevronDown, faChevronRight, faCopy, faEllipsis, faFolder, faL, faPenToSquare, faPerson, faPlus, faTrashCan, faTrowelBricks, faTruck, faUser } from '@fortawesome/free-solid-svg-icons';
import { RetetaContext } from '../../context/RetetaContext';
import photoAPI from '../../api/photoAPI';
import ReteteAdaugareObiecte from './ReteteAdaugareObiecte';


export default function ManoperaTable({reloadKey, selectedDelete, setSelectedDelete, setSelectedEdit, setFormData, selectedEdit, cancelEdit, cancelDelete}) {


    const [open, setOpen] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [reloadReteta, setReloadReteta] = useState(0);

    const [retete, setRetete] = useState(null);
    const [totalItems, setTotalItems] = useState(0);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [limit, setLimit] = useState(20);

    const [filters, setFilters] = useState({
        cod: '',
        clasa: '',
        articol: '',
    });

    const [objectsLen, setObjectsLen] = useState(0); 
    const [objectsID, setObjectsID] = useState(null); 
    const [lastObjectIndex , setLastObjectIndex] = useState(null);

 
    const fetchManopere = async (offset, limit) => {
        console.log(filters.cod)
        try {
            const response = await api.get('/Retete/getRetete', {
                params: {
                    offset,
                    limit,
                    cod: filters.cod, // Pass cod as a query parameter
                    clasa: filters.clasa, // Add any other filters here
                    articol: filters.articol, // Add any other filters here
                },
            });
            setObjectsLen(0);
            setObjectsID(null);
            setLastObjectIndex(null);
            setOpen(null);
            if(response.data.data.length == 0) return;
            if(offset >= Math.ceil(response.data.totalItems/limit)){
                fetchManopere(0, limit);
            }
            else{
                    const renamedItems = response.data.data.map(item => ({
                    ...item,
                    cod: item.cod_reteta,  // Renaming cod to cod_reteta
                    clasa: item.clasa_reteta,  // Renaming cod to cod_reteta
                }));
                // Remove the old 'cod' field if needed
                renamedItems.forEach(item => delete item.cod_reteta);
                renamedItems.forEach(item => delete item.clasa_reteta);
                setRetete(renamedItems);
                setTotalItems(response.data.totalItems);
                setCurrentOffset(response.data.currentOffset);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const fetchPreviewReteta = async (param) => {
        try {
            const response = await api.get(`/Retete/getSpecificReteta/${open}`);
            const updatedRetete = param ? [...param] : [...retete];
            const newObjects = [...response.data.manopera, ...response.data.materiale, ...response.data.utilaje, ...response.data.transport];
            // Find the index of the target object
            const targetIndex = updatedRetete.findIndex(item => item.id === open);
            setObjectsLen(newObjects.length);
            setObjectsID(open);
            if (targetIndex !== -1) {
                // Insert new objects after the target object
                setLastObjectIndex(targetIndex + newObjects.length);
                updatedRetete.splice(targetIndex + 1, 0, ...newObjects);
                setRetete(updatedRetete); // Update the state
            }
            
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const delPreviewReteta = () => {
        if(retete){
            const updatedRetete = [...retete];
            const targetIndex = updatedRetete.findIndex(item => item.id === objectsID);
            if (targetIndex !== -1) {
                updatedRetete.splice(targetIndex + 1, objectsLen);
                setRetete(updatedRetete);
            }
            if(open == null){
                setLastObjectIndex(null);
                setObjectsID(null);
                setObjectsLen(0);  
            }
            return updatedRetete;
        }
    }

    useEffect(() => { 
        if(objectsID == null && open != null) fetchPreviewReteta();
        else if(objectsID != null && open != null){
             let theNew = delPreviewReteta();
            fetchPreviewReteta(theNew);
        } 
        else if(objectsID != null) delPreviewReteta(); 
    }, [open])

    useEffect(() => { 
        fetchManopere(currentOffset, limit);
    }, [reloadKey]);

    useEffect(() => {  
        const getData = setTimeout(() => {
            setOpen(null);
            setObjectsID(null);
            setObjectsLen(0); 
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
                clasa: passedRow.clasa,
                cod: passedRow.cod,
                articol: passedRow.articol,
                unitate_masura: passedRow.unitate_masura
            })
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const deleteItem = async (e, passedRow) => {
        e.preventDefault();
        try {
            let res = await api.delete(`/Retete/deleteFromReteta/${passedRow.original.id}/${passedRow.original.whatIs}`);
            console.log(res);
            let newRetete = [...retete];
            newRetete.splice(passedRow.index, 1);
            setObjectsLen((prev) => prev - 1);
            setLastObjectIndex((prev) => prev - 1);
            setRetete(newRetete);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }


    const parentProps = {
        setIsPopupOpen,
        setObjectsLen,
        objectsLen,
        lastObjectIndex,
        setLastObjectIndex,
        open,
        setOpen,
        delPreviewReteta,
        fetchPreviewReteta,
      };


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
        { 
            accessorKey: "logo",
            header: "Logo",
            cell: ({ row, getValue, cell }) => (
                row.original.whatIs == 'Manopera' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-green-500 h-[2rem] w-full ' icon={faUser}/></div>
                :
                row.original.whatIs == 'Material' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-amber-500 h-[2rem] w-full ' icon={faTrowelBricks}/></div>
                :
                row.original.whatIs == 'Utilaj' ?
                    <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-violet-500 h-[2rem] w-full  ' icon={faTruck}/></div>
                :
                row.original.whatIs == 'Transport' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-pink-500 h-[2rem] w-full  ' icon={faCar}/></div>
                :
                <div className='w-full h-full flex justify-center items-center overflow-hidden '><FontAwesomeIcon className='text-blue-500 h-[2rem]   ' icon={faFolder}/></div>
            ),
            
        },
        { accessorKey: "cod", header: "Cod",size:100 },
        { accessorKey: "clasa", header: "Clasa", size:200},
        { accessorKey: "articol", header: "Articol", size:500 },
        {
            accessorKey: 'whatIs', 
            header: 'Tip',
            size:70,
            cell: ({ getValue, row }) => getValue() ? <div onClick={() => console.log(row)} className='w-full'>{row.original.whatIs == "Material" ?  getValue() + " " + row.original.tip_material : getValue()}</div> : 'Reteta', // Display default value if the value is empty or undefined
        },
        { accessorKey: "unitate_masura", header: "Unitate",size:60},
        { 
            accessorKey: "photo", 
            header: "Poza",
            cell: ({ getValue }) => (
                getValue() ? 
                <div className='flex w-full overflow-hidden justify-center items-center'>
                    <img 
                        src={`${photoAPI}/${getValue()}`}  // Concatenate the base URL with the value
                        alt="Product"
                        className="h-[2.8rem] min-w-[2rem] max-w-28 object-cover" 
                        style={{ objectFit: 'cover' }}
                        />
                </div>
                :
                ""
                ),
                size:70
        },
        { accessorKey: "cantitate", header: "Cantitate", size:70},
        { 
            accessorKey: "threeDots", 
            header: "Optiuni",
            cell: ({ row }) => (
                row.original.whatIs == 'Manopera' || row.original.whatIs == 'Material' || row.original.whatIs == 'Utilaj' || row.original.whatIs == 'Transport' ? 
                <div className=' dropdown-container w-full h-full relative flex '> 
                    <div className='text-xl relative w-full h-full py-2 select-none items-center justify-evenly gap-1 flex'>
                        <FontAwesomeIcon onClick={(e) => deleteItem(e, row)} className=' text-red-500 hover:text-red-600 cursor-pointer' icon={faTrashCan}/>
                    </div>
                </div>    
                    :
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
    ], [selectedDelete, open, retete]);

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
                                    <th className='border-b border-r border-black bg-white' colSpan={2}></th>
                                    <th className='border-b border-r border-black'>
                                        <input
                                            type="text"
                                            name="cod"
                                            value={filters.cod}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none py-3"
                                            placeholder="Filter by Cod"
                                        />
                                    </th>
                                    <th className='border-b border-r border-black'>
                                        <input
                                            type="text"
                                            name="clasa"
                                            value={filters.clasa}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filter by Clasa"
                                        />
                                    </th>
                                    <th className='border-b border-r border-black'>
                                        <input
                                            type="text"
                                            name="articol"
                                            value={filters.articol}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filter by Articol"
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
                                width: header.column.id === "threeDots" ? '55px' : header.column.id === "Dropdown" ? "35px" : header.column.id === "logo" ? "35px": `${header.getSize()}px`, // Enforce width for "Options"
                                minWidth: header.column.id === "threeDots" ?  '55px' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px": "35px" : '', // Ensure no shrinkage
                                maxWidth: header.column.id === "threeDots" ? '55px' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px": "35px" : '', // Ensure no expansion
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
                    row.original.whatIs == 'Manopera' || row.original.whatIs == 'Material' || row.original.whatIs == 'Utilaj' || row.original.whatIs == 'Transport' ?
                    <React.Fragment key={row.id}>
                        <tr className={`dropdown-container    text-black`}>
                            {row.getVisibleCells().map((cell) => (  
                                cell.column.id == "Dropdown" ?
                                <td key={cell.id}>

                                </td>
                                :
                                <td     
                                onClick={()=>console.log(cell)}
                                key={cell.id}
                                className={`h-[3rem]  
                                     ${cell.column.id == "whatIs" ? row.original.whatIs == 'Manopera' ? "bg-green-300" : row.original.whatIs == 'Material' ? "bg-amber-300" : row.original.whatIs == 'Utilaj' ? "bg-violet-300" : row.original.whatIs == 'Transport' ? "bg-pink-300" : "bg-white" : "bg-white"}
                                     border-b border-r break-words max-w-72  relative border-black px-3 `}
                                >
                                   <div className="h-full w-full overflow-hidden ">
                                        <div className="max-h-[3rem] h-full   grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    </div>
                                </td>
                            ))}
                        </tr>
                        {index == lastObjectIndex ?
                        <tr>
                             <td></td>
                             <td className='bg-blue-300 p-1 px-3 hover:bg-blue-500 border-b border-r border-black select-none text-black' colSpan={9}>
                                 <div onClick={() => setIsPopupOpen(true)} className='flex font-bold  text-center cursor-pointer  justify-center items-center gap-2'>
                                     <p className=' text-center'>Adauga Obiecte</p>
                                     <FontAwesomeIcon className='text-green-500  text-center text-2xl' icon={faPlus}/>
                                 </div>
                             </td>
                         </tr>
                            :
                            ""
                        }
                    </React.Fragment>
                    :
                    <React.Fragment key={row.id}>
                        <tr className={`dropdown-container   text-black 
                            ${row.original.id == selectedDelete ? "bg-red-300 sticky" : row.original.id == selectedEdit ? "bg-green-300 sticky" :  row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] ' : 'bg-[rgb(255,255,255,1)] '}`}>
                            {row.getVisibleCells().map((cell) => (  
                                    <td  key={cell.id}   
                                        className={`    border-b border-r break-words max-w-72  relative border-black p-1 px-3`}
                                        style={cell.column.columnDef.meta?.style} // Apply the custom style
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                            
                            ))}
                        </tr>
                            {index == lastObjectIndex ?
                            <tr>
                                <td></td>
                                <td onClick={() => setIsPopupOpen(true)} className='bg-white p-1 px-3 hover:bg-[rgb(255,255,255,0.9)] cursor-pointer border-b border-r border-black select-none text-black' colSpan={9}>
                                    <div className='flex font-bold  text-center justify-center items-center gap-2'>
                                        <p className=' text-center'>Adauga Obiecte</p>
                                        <FontAwesomeIcon className='text-green-500  text-center text-2xl' icon={faPlus}/>
                                    </div>
                                </td>
                            </tr>
                            :
                            ""
                            }
                    </React.Fragment>
                ))}
                </tbody>
            </table>
            </div>
            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between">
              <button
                className="p-2 min-w-24 bg-white text-black rounded"
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
        {/* div that prevents clicks outside */}
        {isPopupOpen && (
        <>
            <div className=" absolute top-0 left-0 right-0 bottom-0 h-screen w-screen z-[100]"></div>
            <div className='w-full top-0 left-0 right-0 bottom-0 absolute h-full items-center justify-center flex z-[200]'>
                    <div className=' relative rounded-xl bg-[#002a54] h-90h w-90w'>
                        <ReteteAdaugareObiecte parentProps = {parentProps} />
                    </div>
            </div>
        </>
      )}
    </>
  )
}
