import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowRightLong, faCancel, faCopy, faEllipsis, faL, faLanguage, faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import photoAPI from '../../api/photoAPI';

export default function RetetaUtilaje({
    setIsPopupOpen,
    open,
    isPopupOpen,
    setOpen,
    delPreviewReteta,
    fetchPreviewReteta,
}) {

    const [cantitate, setCantitate] = useState("");
    const [selectedUtilaje, setSelectedUtilaje] = useState(null);

    const [selectedUtilajeIds, setSelectedUtilajeIds] = useState([]);


    const [utilaje, setUtilaje] = useState(null);
    const [utilajeFilters, setUtilajeFilters] = useState({
        limba: "",
        clasa_utilaj: "",
        utilaj: '',
        descriere: "",
        cod_definitie: "",
    });

    const setCantitateHandler = (e) => {
        if (/^\d*\.?\d{0,3}$/.test(e.target.value)) {
            setCantitate(e.target.value);
        }
    }

    const handleChangeFilterUtilaje = (e) => {
        const { name, value } = e.target;
        setUtilajeFilters((prev) => ({
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
    }, [utilajeFilters]);


    const translateAll = () => {
        if (!utilaje || !utilaje.length) return;
        // If there are any rows that are selected, iterate through and update the `selectedRetetaIds`
        setSelectedUtilajeIds((prev) => {
            const updatedSelectedIds = utilaje.map((utilaj) => utilaj.id); // All `retete` ids
            // If a `reteta` is already selected, it will be removed from the list
            return prev.length === utilaje.length ? [] : updatedSelectedIds; // Toggle all if all are selected
        });
    };

    const toggleUtilajeChangeLanguage = (id) => {
        setSelectedUtilajeIds((prev) => {
            return prev.includes(id)
                ? prev.filter((r) => r !== id)
                : [...prev, id];
        });
    };

    const fetchManopere = async () => {
        try {
            if (utilajeFilters.clasa_utilaj.trim().length >= 3 || utilajeFilters.descriere.trim().length >= 3 || utilajeFilters.utilaj.trim().length >= 3 || utilajeFilters.cod_definitie.trim().length >= 3) {
                const response = await api.get('/Utilaje/api/utilajeLight', {
                    params: {
                        cod_definitie: utilajeFilters.cod_definitie,
                        limba: utilajeFilters.limba,
                        utilaj: utilajeFilters.utilaj, // Pass cod as a query parameter
                        clasa_utilaj: utilajeFilters.clasa_utilaj,
                        descriere: utilajeFilters.descriere, // Add any other filters here
                    },
                });
                setUtilaje(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }
    //Handle ADD Utilaj
    //
    //
    const handleAddItem = async () => {
        if (cantitate.trim() == "") {
            alert("Introdu o cantitate");
            return;
        }
        else if (!selectedUtilaje) {
            alert("Alege un Utilaj");
            return;
        }
        try {
            await api.post("/Retete/addRetetaObjects", { cantitate: cantitate, objectId: selectedUtilaje.original.id, retetaId: isPopupOpen, whatIs: "Utilaje" })
            let [updatedretete, index] = delPreviewReteta(isPopupOpen);
            const parentIndex = updatedretete.findIndex((row) => row.id == isPopupOpen);
            if (parentIndex !== -1) {
                const parentReteta = updatedretete[parentIndex];
                parentReteta.has_utilaje += 1;
                updatedretete[parentIndex] = { ...parentReteta };
            }
            fetchPreviewReteta(isPopupOpen, index, updatedretete);
            setIsPopupOpen(null);
        } catch (error) {
            console.log("Error at ading Manopera", error);
        };
    };

    //TABLE
    //
    //
    const columns = useMemo(() => [
        {
            accessorKey: "limba",
            header: "Limba",
            cell: ({ getValue, row }) => (
                <div className='flex font-semibold items-center justify-center'>
                    {getValue() || "RO&FR"}
                </div>
            ),
            size: 20
        },
        { accessorKey: "cod_definitie", header: "Cod", size: 50 },
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
            size: 70
        },
        { accessorKey: "clasa_utilaj", header: "Clasa", size: 50 },
        {
            accessorKey: "utilaj",
            header: "Utilaj",
            cell: ({ getValue, row }) => (
                selectedUtilajeIds.includes(row.original.id) ?
                    <div className=''>
                        {row.original.utilaj_fr || "..."}
                    </div>
                    :
                    getValue()
            ),
        },
        {
            accessorKey: "descriere",
            header: "Descriere",
            cell: ({ getValue, row }) => (
                selectedUtilajeIds.includes(row.original.id) ?
                    <div className=''>
                        {row.original.descriere_fr || "..."}
                    </div>
                    :
                    getValue()
            ),
        },
        { accessorKey: "pret_utilaj", header: "Pret", size: 50 },
        {
            accessorKey: "threeDots",
            header: (
                <div className='flex w-full justify-center'>
                    <div onClick={() => translateAll()} className='bg-blue-500 rounded-xl px-4  hover:bg-blue-600 hover:cursor-pointer flex gap-2 p-2 items-center justify-center'>
                        <FontAwesomeIcon className='text-white text-lg' icon={faLanguage} />
                        <span className='font-semibold'>Tradu Tot</span>
                    </div>
                </div>
            ),
            cell: ({ row }) => (
                <div className='w-full relative overflow-hidden flex '>
                    <div className='text-xl relative w-full py-2 select-none items-center justify-evenly gap-2 flex'>
                        <FontAwesomeIcon onClick={() => toggleUtilajeChangeLanguage(row.original.id)} className=' text-blue-500 hover:text-blue-600 cursor-pointer' icon={faLanguage} />
                    </div>
                </div>
            ),
            size: 50,
        },
    ], [selectedUtilajeIds, utilaje]);

    const table = useReactTable({
        data: utilaje,
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
    }, [selectedUtilajeIds]);

    const handleClickOutside = (event) => {
        if (!event.target.closest('.dropdown-container')) {
            setSelectedUtilaje(null);
        }
    };


    return (
        <>
            <div className=' flex flex-col h-full w-full overflow-hidden'>
                {/* Inputs for fetching utilaje */}
                <div className='grid font-medium grid-cols-[auto_1fr_auto_1fr_2fr] gap-4 p-4 pt-2 text-black containerWhiter w-full'>
                    <div className="flex w-full flex-col items-center ">
                        <label className=" text-black">
                            Limba
                        </label>
                        <select
                            id="limba"
                            name="limba"
                            value={utilajeFilters.limba}
                            onChange={handleChangeFilterUtilaje}
                            className=" p-2 w-full cursor-pointer rounded-lg shadow-sm outline-none py-2"
                        >
                            <option value="">RO&FR</option>
                            <option value="RO">RO</option>
                            <option value="FR">FR</option>

                        </select>
                    </div>
                    <div className="flex w-full flex-col items-center ">
                        <label className=" text-black">
                            Cod
                        </label>
                        <input
                            type="text"
                            id="cod_definitie"
                            name="cod_definitie"
                            value={utilajeFilters.cod_definitie}
                            onChange={handleChangeFilterUtilaje}
                            className="px-2 outline-none text-center py-2  w-full rounded-lg shadow-sm "
                        />
                    </div>
                    <div className="flex w-full flex-col items-center ">
                        <label className=" text-black">
                            Clasa
                        </label>
                        <select
                            id="clasa_utilaj"
                            name="clasa_utilaj"
                            value={utilajeFilters.clasa_utilaj}
                            onChange={handleChangeFilterUtilaje}
                            className=" p-2 w-full cursor-pointer rounded-lg shadow-sm outline-none py-2"
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
                    <div className="flex w-full flex-col items-center ">
                        <label className=" text-black">
                            Utilaj
                        </label>
                        <input
                            type="text"
                            id="utilaj"
                            name="utilaj"
                            value={utilajeFilters.utilaj}
                            onChange={handleChangeFilterUtilaje}
                            className="px-2 outline-none text-center py-2  w-full rounded-lg shadow-sm "
                        />
                    </div>
                    <div className="flex flex-col w-full items-center ">
                        <label className=" text-black">
                            Descriere
                        </label>
                        <input
                            type="text"
                            id="descriere"
                            name="descriere"
                            value={utilajeFilters.descriere}
                            onChange={handleChangeFilterUtilaje}
                            className="px-2 outline-none text-center py-2  w-full  rounded-lg shadow-sm "
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

                                            <th key={header.id} className={`relative border-b border-r border-black   bg-white p-1 ${header.column.id === "threeDots" ? "text-center" : ""} `}
                                                style={{
                                                    width: `${header.getSize()}px`
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
                                utilaje == null || utilaje.length == 0 ?
                                    <tbody>
                                        <tr>
                                            <th className=' text-black border-b border-r border-black p-2 bg-white' colSpan={8}>Nici un Rezultat / Introdu minim 3 Caractere</th>
                                        </tr>
                                    </tbody>
                                    :
                                    <tbody className=' relative z-0'>
                                        {table.getRowModel().rows.map((row, index, rows) => (
                                            <tr key={row.id} onClick={() => setSelectedUtilaje((prev) => prev?.original.id == row.original.id ? null : row)} className={` dropdown-container  text-black ${selectedUtilaje?.original.id != row.original.id ? row.index % 2 === 0 ? 'bg-[rgb(255,255,255,0.75)] hover:bg-[rgb(255,255,255,0.65)]  ' : 'bg-[rgb(255,255,255,1)] hover:bg-[rgb(255,255,255,0.90)]' : "bg-blue-300 hover:bg-blue-400"} `}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <td
                                                        key={cell.id}
                                                        className={`  border-b border-r break-words max-w-72 relative border-black p-1 px-3`}
                                                        style={cell.column.columnDef.meta?.style} // Apply the custom style
                                                    >
                                                        <div className="h-full w-full overflow-hidden ">
                                                            <div className="max-h-[4.5rem] h-[4.5rem]   grid grid-cols-1 items-center  break-words whitespace-pre-line   overflow-auto  scrollbar-webkit">
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
                                className="px-2 dropdown-container outline-none text-center tracking-wide py-2 flex-shrink-0 text-black  max-w-64  rounded-lg shadow-sm "
                            />
                        </div>
                        <button onClick={() => handleAddItem()} className='bg-green-500 flex dropdown-container  items-center justify-center gap-2 text-black flex-grow hover:bg-green-600  px-6 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faPlus} />Adauga Utilaj</button>
                    </div>
                </div>
            </div>
        </>
    )
}
