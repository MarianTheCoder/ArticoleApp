import React, { useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowDownAZ, faArrowUpAZ, faCancel, faCar, faChevronDown, faChevronRight, faCirclePlus, faCopy, faEllipsis, faFileCirclePlus, faFolder, faL, faLanguage, faPenToSquare, faPerson, faPlus, faSort, faSortDown, faSortUp, faTrashCan, faTrowelBricks, faTruck, faUser } from '@fortawesome/free-solid-svg-icons';
import { RetetaContext } from '../../context/RetetaContext';
import photoAPI from '../../api/photoAPI';
import ReteteAdaugareObiecte from './ReteteAdaugareObiecte';
import CostInputCell from '../Santiere/Ofertare/CostCell';
import { useRef } from 'react';
import { OverflowPopover } from '../Santiere/OverflowPopover';


export default function ManoperaTable({ reloadKey, selectedDelete, cancelDouble, setSelectedDelete, selectedDouble, setSelectedDouble, setSelectedEdit, setFormData, selectedEdit, cancelEdit, cancelDelete }) {


    const [isPopupOpen, setIsPopupOpen] = useState(null);

    const [retete, setRetete] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [limit, setLimit] = useState(20);


    const [ascendent, setAscendent] = useState(false);
    const [ascendentCOD, setAscendentCOD] = useState(false);
    const [ascendentTime, setAscendentTime] = useState(null);

    const [filters, setFilters] = useState({
        limba: '',
        cod: '',
        clasa: '',
        articol: '',
    });

    // state to see which object is open
    const [open, setOpen] = useState([]);
    //se salveza cele care si-au schimbat limba catre FR
    const [localLimba, setLocalLimba] = useState("RO");

    const fetchManopere = async (offset, limit) => {
        try {
            const response = await api.get('/Retete/getRetete', {
                params: {
                    offset,
                    limit,
                    limba: filters.limba,
                    cod: filters.cod, // Pass cod as a query parameter
                    clasa: filters.clasa, // Add any other filters here
                    articol: filters.articol, // Add any other filters here
                    asc_articol: ascendent,
                    asc_cod: ascendentCOD,
                    dateOrder: ascendentTime,
                },
            });
            // console.log("response ", response.data);
            setOpen([]);
            if (response.data.data.length == 0) {
                setRetete([]);
                setTotalItems(0);
                setCurrentOffset(0);
                return;
            };
            if (offset >= Math.ceil(response.data.totalItems / limit)) {
                fetchManopere(0, limit);
            }
            else {
                setRetete(response.data.data);
                setTotalItems(response.data.totalItems);
                setCurrentOffset(response.data.offset);
            }
        } catch (error) {
            console.error('Eroare la obtinerea de informatii', error);
        }
    }


    //ineriorul retetei aici
    const fetchPreviewReteta = async (id, index, reteteParam) => {
        try {
            const response = await api.get(`/Retete/getSpecificReteta/${id}`);
            // flatten all 4 sections into one array
            const newObjects = [
                ...response.data.manopera,
                ...response.data.materiale,
                ...response.data.utilaje,
                ...response.data.transport
            ];

            // compute the sum(cost * cantitate) over all children
            const totalForThisReteta = newObjects.reduce((sum, obj) => {
                const cost = parseFloat(obj.cost) || 0;
                const qty = parseFloat(obj.cantitate) || 0;
                return sum + cost * qty;
            }, 0);

            const addButton = {
                id: `addButton-${id}`,
                whatIs: "addButton",
                retetaIdForFetch: id,
            };

            // clone and splice in the new rows
            let updatedRetete = reteteParam ? [...reteteParam] : [...retete];
            updatedRetete.splice(index + 1, 0, ...newObjects, addButton);

            // locate the parent recipe (it's still at `index`)
            updatedRetete[index] = {
                ...updatedRetete[index],
                total_price: totalForThisReteta.toFixed(3)
            };

            setOpen(prev => [...prev, id]);
            setRetete(updatedRetete);

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const delPreviewReteta = (id) => {
        if (retete) {
            setOpen((prev) => prev.filter((item) => item !== id));
            const updatedRetete = [...retete];
            const retetaIndex = updatedRetete.findIndex(item => item.id === id && (item.whatIs === null || item.whatIs === undefined)); // sa fie diferit de manopere/material etc
            const addButtonIndex = updatedRetete.findIndex(item => item.id === `addButton-${id}`);
            // console.log("reteIDX ", retetaIndex, "btnIDX ", addButtonIndex);
            if (addButtonIndex !== -1 && retetaIndex !== -1 && addButtonIndex > retetaIndex) {
                updatedRetete.splice(retetaIndex + 1, addButtonIndex - retetaIndex);
                setRetete([...updatedRetete]);
            }
            return [updatedRetete, retetaIndex];
        }
    }

    useEffect(() => {
        fetchManopere(currentOffset, limit);
    }, [reloadKey]);

    useEffect(() => {
        const getData = setTimeout(() => {
            setOpen([]);
            if (limit == '' || limit == 0) fetchManopere(0, 10);
            else fetchManopere(0, limit);
        }, 500)
        return () => clearTimeout(getData);
    }, [filters, limit, ascendent, ascendentCOD, ascendentTime]);



    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };


    const toggleDropdown = (id, index) => {
        // console.log("id ", id, "index ", index)
        if (open.includes(id)) {
            delPreviewReteta(id);
            return;
        }
        fetchPreviewReteta(id, index);
    };



    const setPage = (val) => {
        setCurrentOffset((prev) => {
            // Calculate the new offset by adding `val` to the current offset
            const newOffset = Math.max(prev + val, 0); // Ensure offset does not go below 0
            if (limit == 0) fetchManopere(newOffset, 10);
            else fetchManopere(newOffset, limit);
            // Return the new offset to update the state
            return newOffset;
        });
    }

    const handleLimit = (e) => {
        if (/^[0-9]{0,2}$/.test(e.target.value)) {
            setLimit(e.target.value);
        }
    }
    //States for dropDown/edit/delete

    //handle selected edit/delete
    const handleSelectedForDelete = (e, id) => {
        setSelectedDelete(id);
        cancelEdit(e);
        cancelDouble(e);
    }

    const handleSelectedDouble = (e, passedRow) => {
        setSelectedDelete(null);
        cancelEdit(e);
        setSelectedDouble(passedRow.id);
        setFormData({
            clasa: passedRow.clasa,
            cod: passedRow.cod,
            articol: passedRow.articol,
            articol_fr: passedRow.articol_fr,
            descriere_reteta: passedRow.descriere_reteta,
            descriere_reteta_fr: passedRow.descriere_reteta_fr,
            limba: passedRow.limba,
            unitate_masura: passedRow.unitate_masura
        })
    }

    const handleSelectedForEdit = async (e, passedRow) => {
        setSelectedDelete(null);
        cancelDouble(e);
        try {
            setSelectedEdit(passedRow.id);
            setFormData({
                clasa: passedRow.clasa,
                cod: passedRow.cod,
                articol: passedRow.articol,
                articol_fr: passedRow.articol_fr,
                descriere_reteta: passedRow.descriere_reteta,
                descriere_reteta_fr: passedRow.descriere_reteta_fr,
                limba: passedRow.limba,
                unitate_masura: passedRow.unitate_masura
            })
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const deleteItem = async (e, passedRow) => {
        e.preventDefault();
        try {
            let res = await api.delete(`/Retete/deleteFromReteta/${passedRow.original.reteta_id}/${passedRow.original.id}/${passedRow.original.whatIs}`);
            let newRetete = [...retete];
            newRetete.splice(passedRow.index, 1);
            if (passedRow.original.whatIs === 'Manopera' || passedRow.original.whatIs === 'Material' || passedRow.original.whatIs === 'Utilaj' || passedRow.original.whatIs === 'Transport') {
                const parentId = passedRow.original.reteta_id;
                const parentIndex = newRetete.findIndex((row) => row.id == parentId && !row.whatIs);
                if (parentIndex !== -1) {
                    const parentReteta = newRetete[parentIndex];

                    if (parentReteta.has_manopera > 0 && passedRow.original.whatIs === 'Manopera') {
                        parentReteta.total_price = (parseFloat(parentReteta.total_price) - parseFloat(passedRow.original.cost * passedRow.original.cantitate)).toFixed(3);
                        parentReteta.has_manopera -= 1; // Decrease it by 1
                    }
                    else if (parentReteta.has_materiale > 0 && passedRow.original.whatIs === 'Material') {
                        parentReteta.total_price = (parseFloat(parentReteta.total_price) - parseFloat(passedRow.original.cost * passedRow.original.cantitate)).toFixed(3);
                        parentReteta.has_materiale -= 1; // Decrease it by 1
                    }
                    else if (parentReteta.has_utilaje > 0 && passedRow.original.whatIs === 'Utilaj') {
                        parentReteta.total_price = (parseFloat(parentReteta.total_price) - parseFloat(passedRow.original.cost * passedRow.original.cantitate)).toFixed(3);
                        parentReteta.has_utilaje -= 1; // Decrease it by 1
                    }
                    else if (parentReteta.has_transport > 0 && passedRow.original.whatIs === 'Transport') {
                        parentReteta.total_price = (parseFloat(parentReteta.total_price) - parseFloat(passedRow.original.cost * passedRow.original.cantitate)).toFixed(3);
                        parentReteta.has_transport -= 1; // Decrease it by 1
                    }

                    newRetete[parentIndex] = { ...parentReteta };
                }
            }
            setRetete(newRetete);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }


    //edit CANTITATE !
    //

    //Handle Click Outside!
    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    //cancel edit if ckicked outside
    const handleClickOutside = (event) => {
        if (!event.target.closest('.dropdown-container')) {
            setSelectedEditCantitateInterior(null);
        }
    };


    //handle edit cantitate
    //
    //
    //
    const [cantitateReteta, setCantitateReteta] = useState(0);
    const [selectedEditCantitateInterior, setSelectedEditCantitateInterior] = useState(null);
    const editedCantitateRef = useRef(cantitateReteta);

    useEffect(() => {
        editedCantitateRef.current = cantitateReteta;
    }, [cantitateReteta]);

    const handleCantiatateChange = (id, whatIs, value) => {
        if (/^$|^\d*\.?\d{0,3}$/.test(value)) {
            const num = value === "" ? 0 : parseFloat(value);
            setCantitateReteta(num);
        }
    };

    const handleEditCantitateInterior = async (passedRow) => {
        console.log("dsa")
        const key = `${passedRow.original.id}-${passedRow.original.reteta_id}-${passedRow.original.whatIs}`;

        if (selectedEditCantitateInterior === key) {
            setSelectedEditCantitateInterior(null);

            // parse numbers
            const oldQty = parseFloat(passedRow.original.cantitate) || 0;
            const unitCost = parseFloat(passedRow.original.cost) || 0;
            const newQty = parseFloat(editedCantitateRef.current) || 0;

            try {
                // send update
                await api.put(
                    `/Retete/editCantitateInterior/${passedRow.original.reteta_id}/${passedRow.original.id}/${passedRow.original.whatIs}`,
                    { cantitate: newQty }
                );

                // copy state
                const newRetete = [...retete];

                // update child quantity
                newRetete[passedRow.index].cantitate = newQty.toFixed(3);

                // find parent
                const parentId = passedRow.original.reteta_id;
                const parentIndex = newRetete.findIndex(r => r.id == parentId && !r.whatIs);
                if (parentIndex !== -1) {
                    // compute delta = (new - old) * unitCost
                    const delta = (newQty - oldQty) * unitCost;

                    // parse existing parent total
                    const oldTotal = parseFloat(newRetete[parentIndex].total_price) || 0;

                    // apply adjustment and re-format
                    newRetete[parentIndex].total_price = (oldTotal + delta).toFixed(3);
                }

                setRetete(newRetete);

            } catch (error) {
                console.error('Error updating cantitate:', error);
            }

        } else {
            const currentQty = parseFloat(passedRow.original.cantitate) || 0;
            setCantitateReteta(currentQty);
            editedCantitateRef.current = currentQty;
            setSelectedEditCantitateInterior(key);
        }
    };


    const parentProps = {
        setIsPopupOpen,
        isPopupOpen,
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
                <div
                    onClick={() => toggleDropdown(cell.row.original.id, cell.row.index)} // Pass both id and index
                    className="flex justify-center h-full overflow-hidden select-none w-full cursor-pointer items-center"
                >
                    <FontAwesomeIcon
                        className={`text-center ${open.some((item) => item.id === cell.row.original.id) ? "rotate-90" : ""} text-xl`}
                        icon={faChevronRight}
                    />
                </div>
            ),
        },
        {
            accessorKey: "logo",
            header: "Logo",
            cell: ({ row, getValue, cell }) => (
                row.original.whatIs == 'Manopera' ?
                    <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-green-500 h-[2rem] w-full ' icon={faUser} /></div>
                    :
                    row.original.whatIs == 'Material' ?
                        <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-amber-500 h-[2rem] w-full ' icon={faTrowelBricks} /></div>
                        :
                        row.original.whatIs == 'Utilaj' ?
                            <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-violet-500 h-[2rem] w-full  ' icon={faTruck} /></div>
                            :
                            row.original.whatIs == 'Transport' ?
                                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-pink-500 h-[2rem] w-full  ' icon={faCar} /></div>
                                :
                                <div onClick={() => console.log(retete)} className='w-full h-full flex justify-center items-center overflow-hidden '><FontAwesomeIcon className={`${row.original?.has_manopera > 0 || row.original?.has_materiale > 0 || row.original?.has_transport > 0 || row.original?.has_utilaje > 0 ? " text-blue-500" : "text-gray-400"} h-[2rem] `} icon={faFolder} /></div>
            ),

        },
        {
            accessorKey: "limba",
            header: "Limba",
            cell: ({ getValue, row }) =>
                <div className='w-full flex justify-center  font-bold'> {getValue()}</div>, // Display default value if the value is empty or undefined
            size: 90
        },
        {
            accessorKey: "cod",
            header: (
                <div className="flex items-center w-[95%] justify-between text-black ">
                    <span>Cod</span>
                    <FontAwesomeIcon onClick={() => setAscendentCOD((prev) => prev == false ? true : false)} className="text-xl border border-black p-2  rounded-full  cursor-pointer" icon={!ascendentCOD ? faArrowUpAZ : faArrowDownAZ} />
                </div>
            ),
            cell: ({ getValue, row }) => (
                getValue()
            ),
            size: 175
        },
        { accessorKey: "clasa", header: "Clasă", size: 300 },
        {
            accessorKey: "articol",
            header: (
                <div className="flex items-center w-[95%] justify-between text-black ">
                    <span>Articol</span>
                    <FontAwesomeIcon onClick={() => setAscendent((prev) => prev == false ? true : false)} className="text-xl border border-black p-2  rounded-full  cursor-pointer" icon={!ascendent ? faArrowUpAZ : faArrowDownAZ} />
                </div>
            ),
            cell: ({ getValue, row }) => (
                <OverflowPopover maxLines={2} text={localLimba === 'RO' ? getValue() : row.original.articol_fr} />
            ),
            size: 500
        },
        {
            accessorKey: "descriere_reteta",
            header: (
                <div className="flex items-center w-[95%]  justify-between text-black ">
                    <span>Descriere</span>
                    <span className='flex items-center'>Limba:
                        <span onClick={() => setLocalLimba(prev => prev == 'RO' ? 'FR' : 'RO')} className='ml-2 text-green-600 border-2 hover:text-green-500 hover:border-green-500 cursor-pointer border-green-600 rounded-full aspect-square min-w-[2.2rem] flex items-center justify-center'>
                            {localLimba}
                        </span>
                    </span>
                </div>
            ),
            cell: ({ getValue, row }) => (
                <OverflowPopover maxLines={2} text={localLimba === 'RO' ? getValue() : row.original.descriere_reteta_fr} />
            ),
            size: 500
        },
        {
            accessorKey: 'whatIs',
            header: 'Tip',
            size: 120,
            cell: ({ getValue, row }) => getValue() ? <div className='w-full'>{row.original.whatIs == "Material" ? getValue() + " " + row.original.tip_material : getValue()}</div> : 'Rețetă', // Display default value if the value is empty or undefined
        },
        { accessorKey: "unitate_masura", header: "Unitate", size: 60 },
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
            size: 70
        },
        {
            accessorKey: "cantitate",
            header: "Cantitate",
            cell: ({ getValue, row }) => {
                let create = "";
                let isEditable = false;
                if (row.original.reteta_id) {
                    create = row.original.id + "-" + row.original.reteta_id + "-" + row.original.whatIs;
                    isEditable = (create === selectedEditCantitateInterior);
                    return (
                        <CostInputCell
                            rowId={row.original.id}
                            whatIs={row.original.whatIs || "Reteta"}
                            initialValue={getValue()}
                            isEditable={isEditable}
                            onEdit={handleCantiatateChange} // optional
                            bold={false}
                        />
                    );
                }
                else {
                    return (
                        <div className='w-full flex font-medium'>
                            1.000
                        </div>
                    )
                }


            },
            size: 70
        },
        {
            accessorKey: "total_price",
            header: "Preț Total",
            cell: ({ getValue, row }) => {
                let val = getValue();
                return (
                    <div onClick={() => console.log(row.original)} className='w-full flex font-medium'>
                        {row.original.whatIs ? (row.original.cost * row.original.cantitate).toFixed(3) : parseFloat(val).toFixed(3)}
                    </div>
                )
            },
        },
        {
            accessorKey: "threeDots",
            header: "Opțiuni",
            cell: ({ row }) => (
                <div className="absolute group w-full">
                    {/* Confirm button DOAR pt. edit cantitate la copii */}
                    <div className="w-full select-none flex items-center justify-center">
                        {(row.original.whatIs == "Material" || row.original.whatIs == "Utilaj" || row.original.whatIs == "Manopera" || row.original.whatIs == "Transport") &&
                            selectedEditCantitateInterior == `${row.original.id}-${row.original.reteta_id}-${row.original.whatIs}` ? (
                            <button
                                onClick={() => handleEditCantitateInterior(row)}
                                className="bg-green-500 hover:bg-green-600 text-white font-semibold text-base px-3 py-3 rounded-lg"
                            >
                                Confirm
                            </button>
                        ) : (
                            <FontAwesomeIcon
                                icon={faEllipsis}
                                className="text-xl text-gray-600"
                            />
                        )}
                    </div>

                    {/* Dropdown vizibil DOAR dacă nu e în confirm mode */}
                    {selectedEditCantitateInterior !== row.original.id && (
                        <div className="absolute z-10 left-0 -translate-x-[40%] bg-white border shadow-lg rounded-md w-40 p-2 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 text-lg font-semibold text-gray-700">
                            {row.original.whatIs ? (
                                <>
                                    {/* Copii: doar EditCantitate + Delete */}
                                    <div
                                        onClick={() => handleEditCantitateInterior(row)}
                                        className="cursor-pointer dropdown-container w-full flex justify-start items-center rounded-md px-2 py-2 hover:bg-green-100 hover:bg-opacity-90"
                                    >
                                        <FontAwesomeIcon
                                            icon={faPenToSquare}
                                            className="mr-2 text-green-400"
                                        />
                                        Edit
                                    </div>
                                    <div
                                        onClick={(e) => deleteItem(e, row)}
                                        className="cursor-pointer w-full flex justify-start items-center rounded-md px-2 py-2 hover:bg-red-100 hover:bg-opacity-90"
                                    >
                                        <FontAwesomeIcon
                                            icon={faTrashCan}
                                            className="mr-2 text-red-400"
                                        />
                                        Delete
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Reteta: toate opțiunile */}
                                    <div
                                        onClick={(e) => handleSelectedForEdit(e, row.original)}
                                        className="cursor-pointer w-full flex justify-start items-center rounded-md px-2 py-2 hover:bg-green-100 hover:bg-opacity-90"
                                    >
                                        <FontAwesomeIcon
                                            icon={faPenToSquare}
                                            className="mr-2 text-green-400"
                                        />
                                        Edit
                                    </div>
                                    <div
                                        onClick={(e) => handleSelectedDouble(e, row.original)}
                                        className="cursor-pointer w-full flex justify-start items-center rounded-md px-2 py-2 hover:bg-amber-100 hover:bg-opacity-90"
                                    >
                                        <FontAwesomeIcon
                                            icon={faFileCirclePlus}
                                            className="mr-2 text-amber-400"
                                        />
                                        Duplicate
                                    </div>
                                    <div
                                        onClick={(e) => handleSelectedForDelete(e, row.original.id)}
                                        className="cursor-pointer w-full flex justify-start items-center rounded-md px-2 py-2 hover:bg-red-100 hover:bg-opacity-90"
                                    >
                                        <FontAwesomeIcon
                                            icon={faTrashCan}
                                            className="mr-2 text-red-400"
                                        />
                                        Delete
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            ),
            meta: {
                style: {
                    textAlign: "center",
                    padding: "0",
                },
            },
        }
    ], [selectedDelete, selectedEditCantitateInterior, open, retete, ascendent, localLimba, ascendentCOD]);

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
                    <div className="overflow-auto h-full scrollbar-webkit">
                        <table className="w-full text-[0.91rem]  border-separate border-spacing-0 ">
                            <thead className='top-0 w-full sticky  z-10 '>
                                <tr className='text-black'>
                                    <th className='border-b border-r border-black bg-white' colSpan={2}></th>
                                    <th className='border-b border-r bg-white border-black'>
                                        <select
                                            id="limba"
                                            name="limba"
                                            value={filters.limba}
                                            onChange={handleInputChange}
                                            className=" p-2 w-full cursor-pointer outline-none py-3"
                                        >
                                            <option value="">RO&FR</option>
                                            <option value="RO">RO</option>
                                            <option value="FR">FR</option>

                                        </select>
                                    </th>

                                    <th className='border-b border-r bg-white border-black'>
                                        <input
                                            type="cod"
                                            name="cod"
                                            value={filters.cod}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filtru Cod"
                                        />
                                    </th>
                                    <th className='border-b border-r bg-white border-black'>
                                        <select
                                            id="clasa"
                                            name="clasa"
                                            value={filters.clasa}
                                            onChange={handleInputChange}
                                            className=" p-2 text-sm w-full cursor-pointer outline-none py-3"
                                        >
                                            <option value="">Toate clasele</option>
                                            <option value="Organizare de șantier">Organizare de șantier</option>
                                            <option value="Regie">Regie</option>
                                            <option value="Dezafectare">Dezafectare</option>
                                            <option value="Pregătirea terenului prin terasamente (săpături, nivelări, umpluturi)">
                                                Pregătirea terenului prin terasamente (săpături, nivelări, umpluturi)
                                            </option>
                                            <option value="Fundații">Fundații</option>
                                            <option value="Subsol (Soubassement)">Subsol (Soubassement)</option>
                                            <option value="Pereți portanți">Pereți portanți</option>
                                            <option value="Planșee">Planșee</option>
                                            <option value="Șarpantă">Șarpantă</option>
                                            <option value="Acoperiș">Acoperiș</option>
                                            <option value="Tâmplărie exterioară">Tâmplărie exterioară</option>
                                            <option value="Racordarea clădirilor la rețelele de alimentare cu apă, electricitate, gaz, telefonie, internet">
                                                Racordarea clădirilor la rețelele de alimentare cu apă, electricitate, gaz, telefonie, internet
                                            </option>
                                            <option value="Realizarea rețelelor de canalizare și evacuare a apelor uzate și pluviale">
                                                Realizarea rețelelor de canalizare și evacuare a apelor uzate și pluviale
                                            </option>
                                            <option value="Amenajare spații verzi - peisagistică">Amenajare spații verzi - peisagistică</option>
                                            <option value="Lucrări de șarpantă - bardaj și acoperiș">Lucrări de șarpantă - bardaj și acoperiș</option>
                                            <option value="Lucrări de zincărie - Acoperiș">Lucrări de zincărie - Acoperiș</option>
                                            <option value="Lucrări de etanșietate - izolații: hidro">Lucrări de etanșietate - izolații: hidro</option>
                                            <option value="Finisaje interioare - Lucrări de gips carton">Finisaje interioare - Lucrări de gips carton</option>
                                            <option value="Instalații sanitare">Instalații sanitare</option>
                                            <option value="Instalații termice">Instalații termice</option>
                                            <option value="Instalații de ventilație">Instalații de ventilație</option>
                                            <option value="Lucrări de climatizare">Lucrări de climatizare</option>
                                            <option value="Instalații electrice">Instalații electrice</option>
                                            <option value="Lucrări de șarpantă și structuri verticale de lemn">
                                                Lucrări de șarpantă și structuri verticale de lemn
                                            </option>
                                            <option value="Lucrări de tâmplărie exterioară">Lucrări de tâmplărie exterioară</option>
                                            <option value="Lucrări de tâmplărie interioară">Lucrări de tâmplărie interioară</option>
                                            <option value="Confecții metalice">Confecții metalice</option>
                                            <option value="Lucrări de tâmplărie: Storuri, obloane, placări exterioare">
                                                Lucrări de tâmplărie: Storuri, obloane, placări exterioare
                                            </option>
                                            <option value="Finisaje interioare - lucrări de ipsoserie și zugrăveli">
                                                Finisaje interioare - lucrări de ipsoserie și zugrăveli
                                            </option>
                                            <option value="Finisaje exterioare - fațade">Finisaje exterioare - fațade</option>
                                            <option value="Confecționarea și montajul elementelor de sticlă/oglinzi">
                                                Confecționarea și montajul elementelor de sticlă/oglinzi
                                            </option>
                                            <option value="Lucrări de placări ceramice/piatră naturală">
                                                Lucrări de placări ceramice/piatră naturală
                                            </option>
                                            <option value="Lucrări de finisare a pardoselilor">Lucrări de finisare a pardoselilor</option>
                                            <option value="Dezafectarea azbestului">Dezafectarea azbestului</option>
                                            <option value="Lucrări de renovare și reabilitări energetice">
                                                Lucrări de renovare și reabilitări energetice
                                            </option>
                                            <option value="Conservare">Conservare</option>
                                            <option value="Reparații capitale">Reparații capitale</option>
                                            <option value="Consolidări">Consolidări</option>
                                            <option value="-">-----------------------------------------------------------------</option>
                                            <option value="Ouvrages communs TCE">Ouvrages communs TCE</option>
                                            <option value="Terrassement">Terrassement</option>
                                            <option value="Fondations">Fondations</option>
                                            <option value="Soubassement">Soubassement</option>
                                            <option value="Murs porteurs">Murs porteurs</option>
                                            <option value="Planchers">Planchers</option>
                                            <option value="Charpente">Charpente</option>
                                            <option value="Couverture">Couverture</option>
                                            <option value="Menuiseries extérieures">Menuiseries extérieures</option>
                                            <option value="Voies d’accès pour voitures ou piétonnes">Voies d’accès pour voitures ou piétonnes</option>
                                            <option value="Raccordements aux réseaux/utilités">Raccordements aux réseaux/utilités</option>
                                            <option value="Raccordements au réseau d’assainissement et aux eaux pluviales">Raccordements au réseau d’assainissement et aux eaux pluviales</option>
                                            <option value="Espace Vert">Espace Vert</option>
                                            <option value="Charpante - Bardage et Couve">Charpante - Bardage et Couve</option>
                                            <option value="Couverture - Zinguerie">Couverture - Zinguerie</option>
                                            <option value="Etancheite">Etancheite</option>
                                            <option value="Plâtrerie - Plaque de Platre">Plâtrerie - Plaque de Platre</option>
                                            <option value="Plomberie - Sanitare">Plomberie - Sanitare</option>
                                            <option value="Chauffage">Chauffage</option>
                                            <option value="Ventilation">Ventilation</option>
                                            <option value="Climatisation">Climatisation</option>
                                            <option value="Electricite">Electricite</option>
                                            <option value="Charpente et ossature boi">Charpente et ossature boi</option>
                                            <option value="Menuiserie exterieure">Menuiserie exterieure</option>
                                            <option value="Menuiserie agnecement interieure">Menuiserie agnecement interieure</option>
                                            <option value="Metallerie (Acier - Aluminiu)">Metallerie (Acier - Aluminiu)</option>
                                            <option value="Store et Fermeture">Store et Fermeture</option>
                                            <option value="Peinture - Revetement interieure">Peinture - Revetement interieure</option>
                                            <option value="Ravelement Peinture - Revetement">Ravelement Peinture - Revetement</option>
                                            <option value="Vitrerie - Miroiterie">Vitrerie - Miroiterie</option>
                                            <option value="Carrelage et Revetement">Carrelage et Revetement</option>
                                            <option value="Revetement de sol">Revetement de sol</option>
                                            <option value="Désamiantage">Désamiantage</option>
                                            <option value="Renovation energetique">Renovation energetique</option>
                                            <option value="Conservation">Conservation</option>
                                            <option value="Réparations majeures">Réparations majeures</option>
                                            <option value="Consolidation">Consolidation</option>
                                        </select>
                                    </th>
                                    <th className='border-b border-r bg-white border-black'>
                                        <input
                                            type="text"
                                            name="articol"
                                            value={filters.articol}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filtru Articol"
                                        />
                                    </th>
                                    <th className=" bg-white border-b border-r border-black" colSpan={6}>
                                        <div className=' flex  justify-evenly items-center'>
                                            <div className='flex items-center'>
                                                <p className='px-2'>Arată</p>
                                                <input className='border border-black p-1 w-12 text-center rounded-lg' type="text" onChange={(e) => handleLimit(e)} value={limit} name="" id="" />
                                                <p className='px-2'>rânduri</p>
                                            </div>
                                            <div className='flex justify-center  items-center'>
                                                <div onClick={() => setAscendentTime((prev) => prev == null ? true : prev == true ? false : null)} className='bg-blue-500 rounded-xl px-6
                                                
                                                
                                                
                                                hover:bg-blue-600 hover:cursor-pointer flex gap-2 p-2 items-center justify-center'>
                                                    <span className='font-semibold'>Data</span>
                                                    <FontAwesomeIcon className='text-white text-lg' icon={ascendentTime == null ? faSort : ascendentTime == true ? faSortDown : faSortUp} />
                                                </div>
                                            </div>
                                        </div>
                                    </th>
                                    <th className='border-b border-r border-black bg-white' colSpan={1}>

                                    </th>
                                </tr>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id} className="bg-white text-black text-left  font-bold select-none">
                                        {headerGroup.headers.map(header => (

                                            <th key={header.id} className={`relative border-b-2 border-r border-black   bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""} `}
                                                style={{
                                                    width: header.column.id === "threeDots" ? '8rem' : header.column.id === "Dropdown" ? "3rem" : header.column.id === "logo" ? "3rem" : `${header.getSize()}px`, // Enforce width for "Options"
                                                    minWidth: header.column.id === "threeDots" ? '8rem' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px" : "3rem" : '', // Ensure no shrinkage
                                                    maxWidth: header.column.id === "threeDots" ? '8rem' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px" : "3rem" : '', // Ensure no expansion
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
                            {retete.length == 0 ?
                                <tbody className='relative z-0'>
                                    <tr>
                                        <td className='bg-white text-black h-12' colSpan={15}>
                                            <div className=' flex justify-center items-center w-full text-lg font-semibold h-full'>Nici un rezultat</div>
                                        </td>
                                    </tr>
                                </tbody>
                                :
                                <tbody className=' relative z-0'>
                                    {table.getRowModel().rows.map((row, index, rows) => (
                                        row.original.whatIs == 'addButton' ?
                                            <tr key={row.original.id}>
                                                <td></td>
                                                <td onClick={() => setIsPopupOpen(row.original.retetaIdForFetch)} className='bg-green-400 p-1 px-3 hover:bg-green-500 cursor-pointer border-b border-r border-black select-none text-black' colSpan={12}>
                                                    <div className='flex font-bold text-center justify-center items-center gap-2'>
                                                        <p className=' text-center'>Adauga Obiecte</p>
                                                        <FontAwesomeIcon className='text-black  text-center text-lg' icon={faPlus} />
                                                    </div>
                                                </td>
                                            </tr>
                                            :
                                            row.original.whatIs == 'Manopera' || row.original.whatIs == 'Material' || row.original.whatIs == 'Utilaj' || row.original.whatIs == 'Transport' ?
                                                <React.Fragment key={row.id}>
                                                    <tr
                                                        className={`dropdown-container    text-black`}>
                                                        {row.getVisibleCells().map((cell) => (
                                                            cell.column.id == "Dropdown" ?
                                                                <td key={cell.id}>

                                                                </td>
                                                                :
                                                                <td
                                                                    style={cell.column.columnDef.meta?.style} // Apply the custom style
                                                                    key={cell.id}
                                                                    className={` 
                                     ${cell.column.id == "whatIs" ? row.original.whatIs == 'Manopera' ? "bg-green-300" : row.original.whatIs == 'Material' ? "bg-amber-300" : row.original.whatIs == 'Utilaj' ? "bg-violet-300" : row.original.whatIs == 'Transport' ? "bg-pink-300" : "bg-white" : "bg-white"}
                                     border-b border-r break-words max-w-72  relative border-black px-3 `}
                                                                >
                                                                    <div className="h-full w-full overflow-hidden ">
                                                                        <div className="max-h-12 h-12   grid grid-cols-1 items-center  break-words whitespace-pre-line   overflow-auto  scrollbar-webkit">
                                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                        ))}
                                                    </tr>
                                                </React.Fragment>
                                                :
                                                <React.Fragment key={row.id}>
                                                    <tr className={`dropdown-container   text-black 
                            ${row.original.id == selectedDelete ? "bg-red-300 sticky" : row.original.id == selectedEdit ? "bg-green-300 sticky" : row.original.id == selectedDouble ? "bg-amber-300" : 'bg-[rgb(255,255,255,0.80)] '}`}>
                                                        {row.getVisibleCells().map((cell) => (
                                                            <td key={cell.id}
                                                                className={`    border-b border-r break-words max-w-72  relative border-black p-1 px-3`}
                                                                style={cell.column.columnDef.meta?.style} // Apply the custom style
                                                            >
                                                                <div className="h-full w-full overflow-hidden ">
                                                                    <div className="max-h-12 h-12 w-full   grid grid-cols-1 items-center  break-words whitespace-pre-line  overflow-auto  scrollbar-webkit">
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
                    {/* Pagination Controls */}
                    <div className="mt-4 flex items-center justify-between">
                        <button
                            className="p-2 min-w-24 bg-white text-black rounded-lg"
                            onClick={() => setPage(-1)}
                            disabled={currentOffset === 0}
                        >
                            Inapoi
                        </button>
                        <span className=''>Pagina <span className=' font-semibold tracking-widest'>{currentOffset + 1}/{Math.ceil(totalItems / limit) == Infinity ? Math.ceil(totalItems / 10) : Math.ceil(totalItems / limit)}</span></span>
                        <button className="p-2 min-w-24 bg-white text-black rounded-lg" onClick={() => setPage(1)} disabled={currentOffset + 1 >= Math.ceil(totalItems / limit)}>
                            Inainte
                        </button>
                    </div>
                </div>




            }
            {/* div that prevents clicks outside */}
            {isPopupOpen != null && (
                <>
                    <div className=" absolute top-0 left-0 right-0 bottom-0 h-screen w-screen z-[100]"></div>
                    <div className='w-full top-0 left-0 right-0 bottom-0 absolute h-full items-center justify-center flex z-[200]'>
                        <div className=' relative rounded-xl bg-[#002a54] h-90h w-90w'>
                            <ReteteAdaugareObiecte parentProps={parentProps} />
                        </div>
                    </div>
                </>
            )}
        </>
    )
}
