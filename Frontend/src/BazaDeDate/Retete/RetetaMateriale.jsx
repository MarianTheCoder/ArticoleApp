import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowRightLong, faCancel, faCopy, faEllipsis, faL, faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { RetetaContext } from '../../context/RetetaContext';
import photoAPI from '../../api/photoAPI';

export default function RetetaMateriale() {

        const {materialeSelected , setMaterialeSelected} = useContext(RetetaContext);

        const [cantitate, setCantitate] = useState("");
        const [selectedMateriale, setSelectedMateriale] = useState(null);

        const [materiale, setMateriale] = useState(null);
        const [materialeFilters, setMaterialeFilters] = useState({
          clasa:"",
          cod: '',
          denumire: '',
        });

        const setCantitateHandler = (e) =>{
            if (/^\d*\.?\d{0,3}$/.test(e.target.value)) {
                setCantitate(e.target.value);
              }
        }

        const handleChangeFilterMateriale = (e) => {
            const { name, value } = e.target;
            // if(name === "cod"){
            //     if(/^\d*$/.test(value)){
            //         setMaterialeFilters((prev) => ({ ...prev, [name]: value }));
            //     }
            // }
            // else{
                setMaterialeFilters((prev) => ({
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
              }, [materialeFilters]);
        

        const fetchManopere = async () => {
            try {
                if(materialeFilters.cod.trim().length >= 3 || materialeFilters.denumire.trim().length >= 3 || materialeFilters.clasa.trim().length >= 3){
                    const response = await api.get('/Materiale/api/materialeLight', {
                        params: {
                            cod: materialeFilters.cod, // Pass cod as a query parameter
                            clasa:materialeFilters.clasa,
                            denumire: materialeFilters.denumire, // Add any other filters here
                        },
                    });
                    setMateriale(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        //Handle ADD Material
        //
        //
        const handleAddItem = () => {
            if(selectedMateriale && cantitate.trim() > 0){
                const newItem = {
                    whatIs:"Material",
                    id: selectedMateriale.original.id,
                    photo: selectedMateriale.original.photoUrl,
                    furnizor: selectedMateriale.original.furnizor,
                    clasa: selectedMateriale.original.clasa_material,
                    cod: selectedMateriale.original.cod_produs,
                    denumire: selectedMateriale.original.denumire_produs,
                    descriere_produs: selectedMateriale.original.descriere_produs,
                    unitate_masura: selectedMateriale.original.unitate_masura,
                    cost_unitar: selectedMateriale.original.cost_unitar,
                    cost_preferential: selectedMateriale.original.cost_preferential,
                    cost: selectedMateriale.original.pret_vanzare,
                    cantitate: cantitate
                };
                
                // Check if the item is already in the array to avoid duplicates
                if (!materialeSelected.some((existingItem) => existingItem.id === selectedMateriale.original.id)) {
                    setMaterialeSelected((prevItems) => [...prevItems, newItem]);
                    setSelectedMateriale(null);
                    return;
                }
                setSelectedMateriale(null);
                alert("Obiect deja adaugat");
            }
            else if(!selectedMateriale) alert("Nici un rand selectat!");
            else alert("Cantitate invalida");
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
            },
            { accessorKey: "clasa_material", header: "Clasa"},
            { accessorKey: "cod_produs", header: "Cod"},
            { accessorKey: "denumire_produs", header: "Denumire"},
            { accessorKey: "pret_vanzare", header: "Pret"}
        ], []);
        
            const table = useReactTable({
                data: materiale,
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
                        setSelectedMateriale(null);
                    }
                };

  return (
    <>
        <div className=' flex flex-col h-full w-full overflow-hidden'>
            {/* Inputs for fetching materiale */}
            <div className='grid font-medium grid-cols-[2fr_1fr_2fr] gap-4 p-4 pt-2 text-black containerWhiter w-full'>
            <div className="flex flex-col w-full items-center ">
                      <label className=" text-black">
                          Clasa 
                      </label>
                      <input
                          type="text"
                          id="clasa"
                          name="clasa"
                          value={materialeFilters.clasa}
                          onChange={handleChangeFilterMateriale}
                          className="px-2 outline-none text-center py-2  w-full  rounded-lg shadow-sm "
                          placeholder="Enter Clasa"
                      />
                  </div>
                    <div className="flex w-full flex-col items-center ">
                      <label className=" text-black">
                          Cod 
                      </label>
                      <input
                          type="text"
                          id="cod"
                          name="cod"
                          value={materialeFilters.cod}
                          onChange={handleChangeFilterMateriale}
                          maxLength={6}
                          className="px-2 outline-none text-center py-2  w-full rounded-lg shadow-sm "
                          placeholder="Enter Cod"
                      />
                  </div>
                  <div className="flex flex-col w-full items-center ">
                      <label className=" text-black">
                          Denumire 
                      </label>
                      <input
                          type="text"
                          id="denumire"
                          name="denumire"
                          value={materialeFilters.denumire}
                          onChange={handleChangeFilterMateriale}
                          className="px-2 outline-none text-center py-2  w-full  rounded-lg shadow-sm "
                          placeholder="Enter Ocupatie"
                      />
                  </div>

            </div> 

            <div className=' w-full flex flex-col h-full justify-between gap-4 overflow-hidden p-4 '>
                <div className="w-full h-full flex flex-col scrollbar-webkit overflow-auto  justify-between">    
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
                        materiale == null || materiale.length == 0 ?
                            <tbody>
                                <tr>
                                    <th className=' text-black border border-black border-t-0 p-2 bg-white' colSpan={5}>Nici un Rezultat / Introdu minim 3 Caractere</th>
                                </tr>
                            </tbody>
                        :            
                            <tbody className=' relative z-0'>
                                   {table.getRowModel().rows.map((row,index,rows) => (
                                       <tr key={row.id} onClick={() => setSelectedMateriale((prev) => prev?.original.id == row.original.id ? null : row)}  className={` dropdown-container  text-black ${selectedMateriale?.original.id != row.original.id ? row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] hover:bg-[rgb(255,255,255,0.65)]  ' : 'bg-[rgb(255,255,255,1)] hover:bg-[rgb(255,255,255,0.90)]' : "bg-blue-300 hover:bg-blue-400"} `}>
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
                                                className="px-2 outline-none dropdown-container text-center tracking-wide py-2 flex-shrink-0 text-black  max-w-64  rounded-lg shadow-sm "
                                                placeholder="Enter Cantitate"
                                            />
                                        </div>
                                        <button onClick={() => handleAddItem()} className='bg-green-500 flex dropdown-container items-center justify-center gap-2 text-black flex-grow hover:bg-green-600  px-6 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faPlus}/>Adauga Material</button>
                                    </div>
                                </div>                              
       </div>
    </>
  )
}
