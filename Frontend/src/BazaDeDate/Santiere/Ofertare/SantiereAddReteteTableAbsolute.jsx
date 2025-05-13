import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowDownAZ, faArrowUpAZ, faCancel, faCar, faChevronDown, faChevronRight, faCopy, faEllipsis, faFolder, faL, faPenToSquare, faPerson, faPlus, faTrashCan, faTrowelBricks, faTruck, faUser, faX } from '@fortawesome/free-solid-svg-icons';
import photoAPI from '../../../api/photoAPI';
import { useParams } from 'react-router-dom';



export default function SantiereAddReteteTableAbsolute({
    setIsPopupOpen,
    fetchParentRetete,
    mainOfertaPartID
  }) {

      const {idSantier, limbaUser } = useParams();

    const [openDropdowns, setOpenDropdowns] = useState(new Set());
    const [cantitate, setCantitate] = useState("");
    const [doesExistsRetete, setDoesExistsRetete] = useState(false)
    const [selectedRetete, setSelectedRetete] = useState(null);

    //texte aditionale
    const [detaliiAditionale, setDetaliiAditionale] = useState('');
    const [reperPlan, setReperPlan] = useState('');
    

    const [retete, setRetete] = useState([]);
    const [ascendent ,setAscendent] = useState(false);
    const [filters, setFilters] = useState({
        limba: limbaUser,
        cod: '',
        clasa: '',
        articol: '',
    });


 
    const fetchManopere = async () => {
        try {
            if(filters.cod.trim().length >= 3 || filters.articol.trim().length >= 3){
                const response = await api.get('/Retete/getReteteLight', {
                    params: {
                        limba: filters.limba,
                        cod: filters.cod, // Pass cod as a query parameter
                        clasa: filters.clasa, // Add any other filters here
                        articol: filters.articol, // Add any other filters here
                        asc_articol: ascendent,
                    },
                });
                setDoesExistsRetete(true);
                if(response.data.data.length == 0){
                    setRetete([]);
                    return;
                };
                console.log(response.data.data)
                setRetete(response.data.data);
                
            }
            else setDoesExistsRetete(false);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const setCantitateHandler = (e) =>{
        if (/^\d*\.?\d{0,3}$/.test(e.target.value)) {
            setCantitate(e.target.value);
          }
    }

    const handleAddItem = async () => {
          if(cantitate.trim() == ""){
                alert("Introdu o cantitate");
                return;
            }
            else if(!selectedRetete){
                alert("Alege o Reteta");
                return;
            }
            try {
                await api.post("/Santiere/addRetetaToInitialOferta", 
                {
                    oferta_part: mainOfertaPartID,
                    reper_plan: reperPlan,
                    detalii_aditionale: detaliiAditionale,
                    limba: selectedRetete.original.limba,
                    cod_reteta:selectedRetete.original.cod,
                    clasa_reteta:selectedRetete.original.clasa,
                    articol:selectedRetete.original.articol,
                    articol_fr: selectedRetete.original.articol_fr,
                    descriere_reteta:selectedRetete.original.descriere_reteta,
                    descriere_reteta_fr:selectedRetete.original.descriere_reteta_fr,
                    unitate_masura:selectedRetete.original.unitate_masura,
                    reteta_id:selectedRetete.original.id,
                    cantitate:cantitate,
                })
                fetchParentRetete();
                setIsPopupOpen(false);
            } catch (error) {
                console.log("Error at ading Manopera" , error);
            }
    }

const toggleDropdown = async (e,parentId) => {
    e.stopPropagation();
  const isAlreadyOpen = openDropdowns.has(parentId);

  if (isAlreadyOpen) {
    // Remove children from retete and mark dropdown as closed
    setRetete((prev) => prev.filter(item => item.parentId !== parentId));
    setOpenDropdowns((prev) => {
      const newSet = new Set(prev);
      newSet.delete(parentId);
      return newSet;
    });
  } else {
    try {
      const response = await api.get(`/Retete/getSpecificReteta/${parentId}`);
      const children = [
        ...response.data.manopera,
        ...response.data.materiale,
        ...response.data.utilaje,
        ...response.data.transport,
      ].map(item => ({
        ...item,
        parentId, 
      }));

      setRetete((prev) => {
        const index = prev.findIndex(item => item.id === parentId);
        if (index === -1) return prev;

        const newList = [...prev];
        newList.splice(index + 1, 0, ...children);
        return newList;
      });

      setOpenDropdowns((prev) => {
        const newSet = new Set(prev);
        newSet.add(parentId);
        return newSet;
      });
    } catch (err) {
      console.error("Error fetching preview:", err);
    }
  }
};

        useEffect(() => {
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }, []);
    
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setSelectedRetete(null)
            }
        };


    useEffect(() => {  
        const getData = setTimeout(() => {
            fetchManopere();
        }, 500)
        return () => clearTimeout(getData);
      }, [filters,ascendent]);


    const handleChangeFilters = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const columns = useMemo(() => [
        { 
            accessorKey: "Dropdown", 
            header: "",
            cell: ({ row, getValue, cell }) => (
            <div onClick={(e) => toggleDropdown(e,cell.row.original.id)} className='flex justify-center select-none w-full cursor-pointer items-center'>
                <FontAwesomeIcon  className={`  text-center ${openDropdowns.has(cell.row.original.id) ? "rotate-90" : ""}   text-xl`} icon={faChevronRight}/>
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
                <div className='w-full h-full flex justify-center items-center overflow-hidden '><FontAwesomeIcon className={`${row.original?.has_manopera > 0 || row.original?.has_materiale > 0 || row.original?.has_transport > 0 || row.original?.has_utilaje > 0 ? " text-blue-500" : "text-gray-400"} h-[2rem] `} icon={faFolder}/></div>

            ),
            
        },
        { 
            accessorKey: "limba",
            header: "Limba",
            cell: ({ getValue, row }) =>
                <div className='w-full flex justify-center  font-bold'> {getValue()}</div> , // Display default value if the value is empty or undefined
            size:50 
        },
        { accessorKey: "cod", header: "Cod",size:110 },
        { accessorKey: "clasa", header: "Clasă", size:200},
       { 
            accessorKey: "articol", 
            header: (
                <div className="flex items-center w-[95%] justify-between text-black ">
                    <span>Articol</span>
                    {/* <FontAwesomeIcon onClick={() => setAscendent((prev) => prev == false ? true : false)} className="text-xl border border-black p-2  rounded-full  cursor-pointer" icon={!ascendent ? faArrowUpAZ : faArrowDownAZ} />  */}
                </div>
              ),
            size:500
        },
        {
            accessorKey: 'whatIs', 
            header: 'Tip',
            size:80,
            cell: ({ getValue, row }) => getValue() ? <div onClick={() => console.log(row)} className='w-full'>{row.original.whatIs == "Material" ?  getValue() + " " + row.original.tip_material : getValue()}</div> : 'Rețetă', // Display default value if the value is empty or undefined
        },
        { accessorKey: "unitate_masura", header: "Unitate",size:60},
        { 
            accessorKey: "photo", 
            header: "Poză",
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
    ], [retete, ascendent]);

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
        <div className=' containerZ flex flex-col h-full w-full overflow-hidden'>
                <div className='grid font-medium grid-cols-[auto_auto_1fr_3fr] gap-4 p-4 pt-2 text-black containerWhiter w-full'>
                <div className="flex flex-col items-center">
                    <label htmlFor="code" className=" font-medium text-black">
                        Limbă
                    </label>
                    <input
                        disabled={true}
                        value={limbaUser}
                        className={`px-2 w-24 bg-white  text-center py-2 rounded-lg shadow-lg outline-gray-300 `}                  
                    />
                </div>
                {filters.limba == "RO" ?               
                    <div className="flex flex-col items-center">
                      <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Clasă
                      </label>
                      <select
                        id="clasa"
                        name="clasa"
                        value={filters.clasa}
                        onChange={handleChangeFilters}
                        className=" px-1 py-2  text-center rounded-lg outline-none shadow-sm "
                      >
                        <option value="">Toate</option>
                        <option value="Regie">Regie</option>
                        <option value="Dezafectare">Dezafectare</option>
                        <option value="Amenajări interioare">Amenajări interioare</option>
                        <option value="Electrice">Electrice</option>
                        <option value="Sanitare">Sanitare</option>
                        <option value="Termice">Termice</option>
                        <option value="Climatizare Ventilație">Climatizare Ventilație</option>
                        <option value="Amenajări exterioare">Amenajări exterioare</option>
                        <option value="Tâmplărie">Tâmplărie</option>
                        <option value="Mobilă">Mobilă</option>
                        <option value="Confecții Metalice">Confecții Metalice</option>
                        <option value="Prelucrări Ceramice/Piatră Naturală">Prelucrări Ceramice/Piatră Naturală</option>
                        <option value="Ofertare/Devizare">Ofertare/Devizare</option>
                        <option value="Management de proiect">Management de proiect</option>
                        <option value="Reparații">Reparații</option>
                      </select>
                  </div>
                  :
                  <div className="flex flex-col items-center">
                    <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Clasă
                    </label>
                    <select
                        id="clasa"
                        name="clasa"
                        value={filters.clasa}
                        onChange={handleChangeFilters}
                        className=" px-1 py-2 rounded-lg outline-none shadow-sm "
                    >
                        <option value="">Toate</option>
                        <option value="Gros œuvre - maçonnerie">Gros œuvre - maçonnerie</option>
                        <option value="Plâtrerie (plaque de plâtre)">Plâtrerie (plaque de plâtre)</option>
                        <option value="Vrd">Vrd</option>
                        <option value="Espace vert - aménagement extérieur">Espace vert - aménagement extérieur</option>
                        <option value="Charpente - bardage et couverture métallique">Charpente - bardage et couverture métallique</option>
                        <option value="Couverture - zinguerie">Couverture - zinguerie</option>
                        <option value="Étanchéité">Étanchéité</option>
                        <option value="Plomberie - sanitaire">Plomberie - sanitaire</option>
                        <option value="Chauffage">Chauffage</option>
                        <option value="Ventilation">Ventilation</option>
                        <option value="Climatisation">Climatisation</option>
                        <option value="Électricité">Électricité</option>
                        <option value="Charpente et ossature bois">Charpente et ossature bois</option>
                        <option value="Menuiserie extérieure">Menuiserie extérieure</option>
                        <option value="Menuiserie agencement intérieur">Menuiserie agencement intérieur</option>
                        <option value="Métallerie (acier - aluminium)">Métallerie (acier - aluminium)</option>
                        <option value="Store et fermeture">Store et fermeture</option>
                        <option value="Peinture - revêtement intérieur">Peinture - revêtement intérieur</option>
                        <option value="Ravalement peinture - revêtement extérieur">Ravalement peinture - revêtement extérieur</option>
                        <option value="Vitrerie - miroiterie">Vitrerie - miroiterie</option>
                        <option value="Carrelage et revêtement mural">Carrelage et revêtement mural</option>
                        <option value="Revêtement de sol (sauf carrelage)">Revêtement de sol (sauf carrelage)</option>
                        <option value="Ouvrages communs TCE">Ouvrages communs TCE</option>
                        <option value="Rénovation énergétique">Rénovation énergétique</option>
                    </select>
                </div>
                  }
                    <div className="flex w-full flex-col items-center ">
                      <label className=" text-black">
                          Cod  
                      </label>
                      <input
                          type="text"
                          id="cod"
                          name="cod"
                          value={filters.cod}
                          onChange={handleChangeFilters}
                          maxLength={20}
                          className="px-2 outline-none text-center py-2  w-full rounded-lg shadow-sm "
                          placeholder="Filtru Cod"
                      />
                  </div>
                  <div className="flex flex-col w-full items-center ">
                      <label className=" text-black">
                          Articol 
                      </label>
                      <input
                          type="text"
                          id="articol"
                          name="articol"
                          value={filters.articol}
                          onChange={handleChangeFilters}
                          className="px-2 outline-none text-center py-2  w-full  rounded-lg shadow-sm "
                          placeholder="Filtru Articol"
                      />
                  </div>
           
            </div> 
        <div className=' w-full  flex flex-col h-full justify-between gap-4 overflow-hidden p-4 '>
            <div className="px-6 pb-4 scrollbar-webkit text-white overflow-auto h-full flex flex-col justify-between">
            <div className="  scrollbar-webkit">
                <table className="w-full  border-separate border-spacing-0 ">
                    <thead className='top-0 w-full sticky  z-10 '>
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
                {!doesExistsRetete ?
                    <tbody className='relative z-0'>
                        <tr>
                            <td className='bg-white text-black h-12' colSpan={10}>
                                <div className=' flex justify-center items-center w-full text-lg font-semibold h-full'>Introdu minim 3 caractere</div>
                            </td>
                        </tr>
                    </tbody>
                :
                retete.length == 0 ?
                    <tbody className='relative z-0'>
                        <tr>
                            <td className='bg-white text-black h-12' colSpan={10}>
                                <div className=' flex justify-center items-center w-full text-lg font-semibold h-full'>Nici un rezultat</div>
                            </td>
                        </tr>
                    </tbody>
                :
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
                             
                                key={cell.id}
                                className={` 
                                     ${cell.column.id == "whatIs" ? row.original.whatIs == 'Manopera' ? "bg-green-300" : row.original.whatIs == 'Material' ? "bg-amber-300" : row.original.whatIs == 'Utilaj' ? "bg-violet-300" : row.original.whatIs == 'Transport' ? "bg-pink-300" : "bg-white" : "bg-white"}
                                     border-b border-r break-words max-w-72  relative border-black px-3 `}
                                >
                                   <div className="h-full w-full overflow-hidden ">
                                        <div className="max-h-12 h-12   grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </React.Fragment>
                    :
                    <React.Fragment key={row.id}>
                        <tr onClick={() => setSelectedRetete((prev) => prev?.original.id == row.original.id ? null : row)} className={`dropdown-container   text-black 
                            ${selectedRetete?.original.id != row.original.id ? row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] hover:bg-[rgb(255,255,255,0.65)]  ' : 'bg-[rgb(255,255,255,1)] hover:bg-[rgb(255,255,255,0.90)]' : "bg-blue-300 hover:bg-blue-400"}`}>
                            {row.getVisibleCells().map((cell) => (  
                                    <td  key={cell.id}   
                                        className={`     border-b border-r break-words max-w-72  relative border-black p-1 px-3`}
                                        style={cell.column.columnDef.meta?.style} // Apply the custom style
                                    >          
                                    <div className="h-full w-full overflow-hidden ">
                                        <div className="max-h-12 h-12 w-full   grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    </div>
                                    </td>
                            
                            ))}
                        </tr>
                    </React.Fragment>
                ))}
                </tbody>}
            </table>
            </div>
          </div>
               <div className='flex gap-4 w-full '>
                     <div className="flex gap-3 items-center ">
                        <div className='flex flex-col items-center h-full'>
                            <label className=" font-medium">
                                Cantitate
                            </label>
                            <input
                                type="text"
                                id="cantitate"
                                name="cantitate"
                                value={cantitate}
                                maxLength={8}
                                onChange={(e) => setCantitateHandler(e)}
                                className="px-2 outline-none text-center dropdown-container tracking-wide py-2 flex-shrink-0 text-black  max-w-32  rounded-lg shadow-sm "
                            />
                        </div>
                        <div className='flex flex-col items-center h-full'>
                            <label
                                htmlFor="reperPlan"
                                className="font-medium whitespace-nowrap"
                                >
                                Reper Plan
                            </label>  
                            <textarea
                                rows={2}
                                type="text"
                                id="reperPlan"
                                name="reperPlan"
                                value={reperPlan}
                                onChange={(e) => setReperPlan(e.target.value)} 
                                className="px-2 dropdown-container text-black   outline-none resize-none w-96  py-2  rounded-lg shadow-sm "
                                
                            />
                        </div>
                        <div className='flex flex-col items-center h-full'>
                            <label
                                htmlFor="reperPlan"
                                className="font-medium whitespace-nowrap"
                                >
                                Detalii Aditionale
                            </label> 
                            <textarea
                                rows={2}
                                type="text"
                                id="detaliiAditionale"
                                name="detaliiAditionale"
                                value={detaliiAditionale}
                                onChange={(e) => setDetaliiAditionale(e.target.value)}
                                className="px-2 dropdown-container text-black w-96 outline-none resize-none   py-2  rounded-lg shadow-sm "                                
                            />  
                        </div>
                        </div>
                        <div className='w-full flex gap-3 pt-6 '>
                            <button onClick={() => handleAddItem()} className='bg-green-500  dropdown-container flex  items-center justify-center gap-2 text-black flex-grow hover:bg-green-600  px-6 py-2 h-12 rounded-xl'><FontAwesomeIcon className='' icon={faPlus}/><span className="leading-none">Adaugă Rețetă</span></button>
                            <button onClick={() => setIsPopupOpen(false)} className='bg-red-500 dropdown-container flex  items-center justify-center gap-2 text-black  hover:bg-red-600 h-12  px-6 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faX}/><span className="leading-none">Închide</span></button>
                        </div>
                        </div>
          </div>
          </div>
        }

    </>
  )
}
