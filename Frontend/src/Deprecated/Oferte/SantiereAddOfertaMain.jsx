import React, { act, useContext, useEffect, useMemo, useRef, useState } from 'react'
import api from '../../../api/axiosAPI';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDownShortWide, faCar, faChevronDown, faChevronRight, faCircleCheck, faCopy, faDownLong, faEllipsis, faEllipsisVertical, faEquals, faFileExport, faFolder, faL, faPenToSquare, faPerson, faPlus, faRotate, faSquareCheck, faTrashCan, faTrowelBricks, faTruck, faUser } from '@fortawesome/free-solid-svg-icons';
import photoAPI from '../../../api/photoAPI';
import SantiereAddReteteTable from './SantiereAddReteteTableAbsolute';
import { useParams } from 'react-router-dom';
import CostInputCell from './CostCell';

import { FormularRasfirat } from '../Formulare/Romania/FormularRasfirat';
import { FormularCompact } from '../Formulare/Romania/FormularCompact';
import { FormularDevizGeneral } from '../Formulare/Romania/FormularDevizGeneral.jsx';
import { FormularCompactFR } from '../Formulare/Franta/FormularCompactFR';
import { FormularRasfiratFR } from '../Formulare/Franta/FormularRasfiratFR';
import TextAreaCell from './TextareaCell';
import { OverflowPopover } from '../OverflowPopover';
import { useVirtualizer } from '@tanstack/react-virtual';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PDF_Popup from './PDF_Popup.jsx';
import { useCallback } from 'react';




export default function SantiereAdd({ mainOfertaPartID, chooseAnchor, onAnchorChosen, anchorId, oferteParts, acceptDelete, setAcceptDelete, selectedRowIds, setSelectedRowIds, dubleazaRetete, deleteRetete, selectedRowIdsDelete, setSelectedRowIdsDelete }) {

  const { idSantier, limbaUser } = useParams();

  const [openDropdowns, setOpenDropdowns] = useState(new Set());
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isGenerareOpen, setIsGenerareOpen] = useState(false);

  const [selectedDelete, setSelectedDelete] = useState(null);
  const [selectedEdit, setSelectedEdit] = useState(null);
  const [editedCosts, setEditedCosts] = useState({});
  const [actualizareReteta, setActualizareReteta] = useState(null);

  //editable 
  const [cantitateReteta, setCantitateReteta] = useState(0);
  const [reperPlan, setReperPlan] = useState("");
  const [articolClient, setArticolClient] = useState("");
  const [detaliiAditionale, setDetaliiAditionale] = useState("");

  const editedCostsRef = useRef(editedCosts);
  const articolClientRef = useRef(articolClient);
  const editedCantitateRef = useRef(cantitateReteta);
  const reperPlanRef = useRef(reperPlan);
  const detaliiAditionaleRef = useRef(detaliiAditionale);

  const [retete, setRetete] = useState([]);

  const [detailedCosts, setDetailedCosts] = useState({});


  const [ascendent, setAscendent] = useState(false);

  const [filters, setFilters] = useState({
    cod: '',
    clasa: '',
    articol: '',
  });

  const [TVA, setTVA] = useState(24);
  const [recapitulatii, setRecapitulatii] = useState(10);
  const [finalData, setFinalData] = useState({
    oreManopera: 0,
    manopera: 0,
    materiale: 0,
    transport: 0,
    utilaje: 0,
    cheltuieliDirecte: 0,
  })

  const [objectsLen, setObjectsLen] = useState(0);
  const [objectsID, setObjectsID] = useState(null);
  const [lastObjectIndex, setLastObjectIndex] = useState(null);

  //
  //salvam interiorul la care vrem sa revenim in caz ca nu se accepta  
  const [originalRow, setOriginalRow] = useState(null); // salvăm originalele temporar
  const [activeRowIndex, setActiveRowIndex] = useState(null); // reținem rândul activ

  const originalRowRef = useRef(null);
  const activeRowIndexRef = useRef(null);
  const detailedCostsRef = useRef({});
  const reteteRef = useRef([]);

  const [localReper1, setLocalReper1] = useState("");
  const [localReper2, setLocalReper2] = useState("");

  useEffect(() => {
    originalRowRef.current = originalRow;
  }, [originalRow]);

  useEffect(() => {
    activeRowIndexRef.current = activeRowIndex;
  }, [activeRowIndex]);

  useEffect(() => {
    detailedCostsRef.current = detailedCosts;
  }, [detailedCosts]);

  useEffect(() => {
    reteteRef.current = retete;
  }, [retete]);


  //Limba User
  //Limba Oferta

  const [localLimba, setLocalLimba] = useState("RO");

  useEffect(() => {
    setLocalLimba(limbaUser);
  }, [limbaUser]);


  const fetchManopere = async () => {
    try {
      const response = await api.get(`/Santiere/getReteteLightForSantiereWithPrices/${mainOfertaPartID}`, {
        params: {
          asc_articol: ascendent,
        },
      });
      setOpenDropdowns(new Set());
      setEditedCosts({});
      setSelectedEdit(null);
      setSelectedDelete(null);
      if (response.data.data.length == 0) {
        setRetete([]);
        setDetailedCosts({});
        return;
      };
      // console.log(response.data.detailedCosts);
      setDetailedCosts(response.data.detailedCosts);
      setRetete(response.data.data);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }


  useEffect(() => {
    if (oferteParts) {
      const currentPart = oferteParts.find(part => part.id === parseInt(mainOfertaPartID));
      setLocalReper1(currentPart.reper1 || "");
      setLocalReper2(currentPart.reper2 || "");
    }
  }, [oferteParts]);

  useEffect(() => {
    fetchManopere();
  }, [ascendent]);

  useEffect(() => {
    // console.log(detailedCosts);
    if (detailedCosts) {
      handleFinalData();
    }
  }, [detailedCosts]);

  //to see the updated cantitate and costs in the function
  useEffect(() => {
    editedCostsRef.current = editedCosts;
  }, [editedCosts]);

  useEffect(() => {
    editedCantitateRef.current = cantitateReteta;
  }, [cantitateReteta]);

  useEffect(() => {
    detaliiAditionaleRef.current = detaliiAditionale;
  }, [detaliiAditionale]);

  useEffect(() => {
    reperPlanRef.current = reperPlan;
  }, [reperPlan]);

  useEffect(() => {
    articolClientRef.current = articolClient;
  }, [articolClient]);



  // const handleInputChange = (e) => {
  //     const { name, value } = e.target;
  //     setFilters((prev) => ({
  //         ...prev,
  //         [name]: value,
  //     }));
  // };


  //handle selected edit/delete
  const handleSelectedForDelete = (e, id) => {
    setEditedCosts({});
    setSelectedEdit(null);
    setCantitateReteta(0);
    setSelectedDelete((prev) => {
      if (prev === id) {
        deleteItem(id); // your custom logic here
        return null;
      }
      return id;
    });
  }

  const deleteItem = async (id) => {
    // console.log(retete);
    try {
      await api.delete(`/Santiere/deleteRetetaFromSantier/${id}`);
      // console.log("Deleted item with ID:", id);
      setDetailedCosts(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      setRetete(prev =>
        prev.filter(item => {
          const isParentToDelete = item.id == id && item.whatIs == undefined;
          const isChildOfDeleted = item.parentId == id;

          return !isParentToDelete && !isChildOfDeleted;
        })
      );
      // Remove dropdown open state if it was open
      setOpenDropdowns((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });

    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleFinalData = () => {
    let totalTime = 0;
    let totalManopere = 0;
    let totalMateriale = 0;
    let totalUtilaje = 0;
    let totalTransport = 0;
    Object.keys(detailedCosts).forEach(retetaId => {
      const manopere = detailedCosts[retetaId].Manopera;
      const materiale = detailedCosts[retetaId].Material;
      const utilaje = detailedCosts[retetaId].Utilaj;
      const transport = detailedCosts[retetaId].Transport;
      const reteta_quantity = parseFloat(detailedCosts[retetaId].cantitate_reteta);

      let nowTime = 0;
      let nowManopere = 0;
      let nowMateriale = 0;
      let nowUtilaje = 0;
      let nowTransport = 0;

      Object.entries(manopere).forEach(([itemId, { cost, cantitate }]) => {
        nowTime = parseFloat(cantitate) + nowTime;
        nowManopere += parseFloat(cost) * parseFloat(cantitate);

        // console.log("Manopera", itemId, cost, cantitate, nowTime, nowManopere);
      });
      totalTime = totalTime + nowTime * reteta_quantity;
      totalManopere = totalManopere + nowManopere * reteta_quantity;

      Object.entries(materiale).forEach(([itemId, { cost, cantitate }]) => {
        nowMateriale += parseFloat(cost) * parseFloat(cantitate);
      });
      totalMateriale = totalMateriale + nowMateriale * reteta_quantity;

      Object.entries(utilaje).forEach(([itemId, { cost, cantitate }]) => {
        nowUtilaje += parseFloat(cost) * parseFloat(cantitate);
      });
      totalUtilaje = totalUtilaje + nowUtilaje * reteta_quantity;

      Object.entries(transport).forEach(([itemId, { cost, cantitate }]) => {
        nowTransport += parseFloat(cost) * parseFloat(cantitate);
      });
      totalTransport = totalTransport + nowTransport * reteta_quantity;
    });

    let totalDirecte = totalManopere + totalMateriale + totalTransport + totalUtilaje;
    setFinalData({
      oreManopera: totalTime,
      manopera: totalManopere,
      materiale: totalMateriale,
      transport: totalTransport,
      utilaje: totalUtilaje,
      cheltuieliDirecte: totalDirecte,
    })
  }



  const handleAcceptEdit = async () => {
    const currentEditedCosts = editedCostsRef.current;
    const currentCantitateReteta = editedCantitateRef.current;
    const currentReperPlan = reperPlanRef.current;
    const currentDetaliiAditionale = detaliiAditionaleRef.current;
    const currentArticolClient = articolClientRef.current;
    // console.log('Sending updated costs:', currentEditedCosts, currentCantitateReteta, detailedCosts, retete, "Das", currentReperPlan, currentDetaliiAditionale, "Das", selectedEdit);
    try {
      const res = await api.put(`/Santiere/updateSantierRetetaPrices`, { articolClient: currentArticolClient, santier_reteta_id: selectedEdit, reper_plan: currentReperPlan, detalii_aditionale: currentDetaliiAditionale, cantitate_reteta: currentCantitateReteta, updatedCosts: currentEditedCosts });
      let tempCosts = JSON.parse(JSON.stringify(detailedCosts));
      setRetete((prev) => {
        const updated = [...prev]; // Clone so you don't mutate state directly
        let totalCost = 0;
        for (let i = 0; i < updated.length; i++) {
          const item = updated[i];
          const key = `${item.id}-${item.whatIs}`;

          if (item.parentId == selectedEdit) {
            const cost = currentEditedCosts[key] != undefined
              ? parseFloat(currentEditedCosts[key])
              : parseFloat(item.cost);

            totalCost += cost * parseFloat(item.cantitate);

            if (currentEditedCosts.hasOwnProperty(key)) {
              tempCosts[selectedEdit][item.whatIs][item.id].cost = cost.toFixed(2);
              updated[i] = { ...item, cost: cost.toFixed(2) };
            }
          }
        }
        const parentIndex = updated.findIndex(
          item => !item.whatIs && item.id == selectedEdit
        );

        if (parentIndex !== -1) {
          // console.log("gasit" , totalCost);
          tempCosts[selectedEdit].cantitate_reteta = parseFloat(currentCantitateReteta).toFixed(3);
          updated[parentIndex] = {
            ...updated[parentIndex],
            cantitate: parseFloat(currentCantitateReteta).toFixed(3),
            detalii_aditionale: currentDetaliiAditionale,
            reper_plan: currentReperPlan,
            articol_client: currentArticolClient,
            cost: totalCost.toFixed(2),
          };
        }

        return updated;
      }



        // prev.map(item => {
        //   const key = `${item.id}-${item.whatIs}`;
        //   if(item.parentId === selectedEdit){
        //     const cost = currentEditedCosts[key] !== undefined
        //     ? parseFloat(currentEditedCosts[key])
        //     : parseFloat(item.cost);

        //     console.log(cost , item.cantitate)
        //     totalCost += cost * parseFloat(item.cantitate);
        //   }
        //   if (currentEditedCosts.hasOwnProperty(key)) {
        //     tempCosts[selectedEdit][item.whatIs][item.id].cost = parseFloat(currentEditedCosts[key]).toFixed(2);
        //     return {
        //       ...item,
        //       cost: parseFloat(currentEditedCosts[key]).toFixed(2)
        //     };
        //   }

        //   if (!item.whatIs && item.id == selectedEdit) {
        //     tempCosts[selectedEdit].cantitate_reteta = parseFloat(currentCantitateReteta).toFixed(2);
        //     return {
        //       ...item,
        //       cantitate: parseFloat(currentCantitateReteta).toFixed(2)
        //     };
        //   }
        //   return item;
        // })
      );
      console.log("Updated detailed costs: oare?");
      setDetailedCosts(tempCosts);
    } catch (error) {
      console.error("Error at editing the Reteta:", error);
    }
    setEditedCosts({});
    setSelectedEdit(null);
    setCantitateReteta(0);

  }

  const handleSelectedForEdit = (rowToEdit, theActualRetete) => {
    setSelectedDelete(null);
    const newEditedCosts = {};
    theActualRetete.forEach((item) => {
      if (item.parentId == rowToEdit) {
        newEditedCosts[`${item.id}-${item.whatIs}`] = item.cost;
      }
      if (item.id == rowToEdit && !item.parentId) {
        setDetaliiAditionale(item.detalii_aditionale);
        setArticolClient(item.articol_client);
        setReperPlan(item.reper_plan);
        setCantitateReteta(item.cantitate);
      }
    });
    setEditedCosts(newEditedCosts);
    setSelectedEdit(rowToEdit);
  }

  const handleCostChange = (id, whatIs, value) => {
    // console.log(id, whatIs, value)
    setEditedCosts((prev) => ({
      ...prev,
      [`${id}-${whatIs}`]: value,
    }));
  };

  const handleCantiatateChange = (id, whatIs, value) => {
    // console.log(value)
    setCantitateReteta(value);
  };

  const handleReperChange = (id, whatIs, value) => {
    // console.log(value)
    setReperPlan(value);
  };

  const handleArticolClientChange = (id, whatIs, value) => {
    // console.log(value)
    setArticolClient(value);
  };

  const handleDetaliiChange = (id, whatIs, value) => {
    // console.log(value)
    setDetaliiAditionale(value);
  };

  const toggleDropdown = async (parentId, isEditClicked) => {
    if (activeRowIndexRef.current !== null && originalRowRef.current !== null) {
      resetNextItem(); // resetam schimbarea de item
    }
    const isAlreadyOpen = openDropdowns.has(parentId);
    //daca sunt egale trebuue sa acceotam editul
    if (isEditClicked == selectedEdit && selectedEdit != null) {
      handleAcceptEdit();
      return;
    }
    //verificam daca e deja deschis
    if (isAlreadyOpen && isEditClicked) {
      handleSelectedForEdit(isEditClicked, retete);
      return;
    }
    //aici e inchiderea standard
    if (isAlreadyOpen && !isEditClicked) {
      // Remove children from retete and mark dropdown as closed
      setRetete((prev) => prev.filter(item => item.parentId != parentId));
      setOpenDropdowns((prev) => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    } else {
      //aici intram daca nu e deschis si verificam mai jos daca sunt in  edit
      try {
        const response = await api.get(`/Santiere/getSpecificRetetaForOfertaInitiala/${parentId}`);
        const children = [
          ...response.data.manopera,
          ...response.data.materiale,
          ...response.data.utilaje,
          ...response.data.transport,
        ];
        // console.log(children)
        setRetete((prev) => {
          const index = prev.findIndex(item => item.id === parentId && !item.parentId);
          if (index === -1) return prev;

          const newList = [...prev];
          newList.splice(index + 1, 0, ...children);
          if (isEditClicked != null) {
            handleSelectedForEdit(isEditClicked, newList)
          }
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


  const handleSaveNextItem = async (row) => {
    if (row.id == originalRowRef.current?.id) {
      return;
    }
    try {
      const response = await api.post(`/Santiere/saveNextItem`, { row });
      if (response.data?.insertedId) {
        const newId = response.data.insertedId;
        const oldId = row.id;
        const parentId = row.parentId;
        const whatIs = row.whatIs;
        console.log("intram sa schimba ID-ul");
        // 🔁 Update doar ID-ul în detailedCosts
        setDetailedCosts((prev) => {
          const updated = structuredClone(prev);
          if (
            updated[parentId]?.[whatIs]?.[oldId]
          ) {
            updated[parentId][whatIs][newId] = updated[parentId][whatIs][oldId];
            delete updated[parentId][whatIs][oldId];
          }
          return updated;
        });

        // 🔁 Update doar ID-ul în retete[row.index]
        setRetete((prev) => {
          const updated = prev.map((reteta) => {
            // Verificăm dacă e o rețetă copil și are `id` egal cu vechiul
            if (reteta.id == oldId && reteta.whatIs == whatIs && reteta.parentId == parentId) {
              return { ...reteta, id: newId };
            }
            return reteta;
          });
          return updated;
        });
      }

      console.log("ITEM SAVED");
      setOriginalRow(null);
      setActiveRowIndex(null);
    } catch (error) {
      console.error("Error saving next item:", error);
    }

  }


  const resetNextItem = () => {
    const original = originalRowRef.current;
    const index = activeRowIndexRef.current;
    const currentDetailedCosts = detailedCostsRef.current;
    const reteteCurrent = reteteRef.current;
    console.log("STERGEM ITEMUL ACTUAL");
    // console.log(reteteCurrent, "reteteCurrent");
    // Verificăm dacă avem un rând original și un index valid
    if (original && index !== null) {
      const parentId = original.parentId;
      const whatIs = original.whatIs;
      const oldId = original.id;
      const currentId = reteteCurrent[index]?.id;
      // console.log(reteteCurrent, "currentId");
      // console.log(currentDetailedCosts, "currentDetailedCosts");
      // 1. Facem modificările în detailedCosts
      const { updatedDetails, total } = replaceItemInDetailedCosts(
        parentId,
        whatIs,
        currentId, // remove temporary
        oldId,     // add back original
        original,
        original.cantitate,
        currentDetailedCosts // use the passed parameter
      );
      // console.log(updatedDetails, "updatedDetails");
      setDetailedCosts(updatedDetails);

      const updatedRetete = [...reteteCurrent];
      updatedRetete[index] = original;

      const parentIndex = updatedRetete.findIndex(i => !i.whatIs && i.id == parentId);
      if (parentIndex !== -1) {
        updatedRetete[parentIndex] = {
          ...updatedRetete[parentIndex],
          cost: total,
        };
      }

      // 👉 Setăm noul retete
      setRetete(updatedRetete);
    }

    // Resetăm și state/ref-uri
    originalRowRef.current = null;
    activeRowIndexRef.current = null;
    setOriginalRow(null);
    setActiveRowIndex(null);
  };




  const setNextItemInList = async (e, row) => {
    setSelectedDelete(false);
    setEditedCosts({});
    setSelectedEdit(null);
    // console.log(detailedCosts, "SDas")
    e.stopPropagation();
    // console.log(activeRowIndex)
    // console.log(activeRowIndex, originalRow)
    if (activeRowIndex !== null && activeRowIndex !== row.index) {
      // If we are already editing a different row, reset it first
      console.log("Resetting next item due to active row change");
      resetNextItem();
      return;
    }
    else if (activeRowIndex == null && originalRow == null) {
      // If we are not editing any row, set the current one as active
      setActiveRowIndex(row.index);
      setOriginalRow(row.original);
    }
    // console.log(row.original);

    try {
      let response;
      if (!row.original.definitie_id) {
        response = await api.get(`/Santiere/getNextItem`, {
          params: {
            id: row.original.id, // il folosim pentru a da de la DEF -> child !
            original_id: row.original.original_id, // id-ul original al item-ului curent
            type: row.original.whatIs, // tipul item-ului curent
            definition: true // flag pentru a indica ca cautam definitia
          }
        });
      }
      else {
        response = await api.get(`/Santiere/getNextItem`, {
          params: {
            id: row.original.id || null,
            original_id: row.original.original_id,
            type: row.original.whatIs,
            definition: false,
            definitie_id: row.original.definitie_id
          }
        });
      }

      const item = response.data.item;

      if (!item || Object.keys(item).length === 0) {
        console.warn("No next item found");
        setActiveRowIndex(null);
        setOriginalRow(null);
        return;
      }
      // console.log("Next item found:", item);
      const parentId = row.original.parentId;
      const whatIs = row.original.whatIs;
      const oldId = row.original.id;
      const newId = item.id;

      let nextItem = null;
      if (row.original.whatIs == 'Manopera') {
        nextItem = {
          id: item.id,
          articol: row.original.articol,
          articol_fr: row.original.articol_fr,
          cantitate: row.original.cantitate,
          cod: item.cod,
          cost: item.cost,
          descriere: item.descriere,
          descriere_fr: item.descriere_fr,
          definitie_id: item.definitie_id,
          limba: row.original.limba,
          original_id: item.original_id,
          parentId: row.original.parentId,
          unitate_masura: row.original.unitate_masura,
          whatIs: 'Manopera',
        }
      } else if (row.original.whatIs == 'Material') {
        nextItem = {
          id: item.id,
          articol: row.original.articol,
          articol_fr: row.original.articol_fr,
          cantitate: row.original.cantitate,
          clasa: row.original.clasa,
          cod: item.cod,
          cost: item.cost,
          cost_preferential: item.cost_preferential,
          cost_unitar: item.cost_unitar,
          descriere: item.descriere,
          descriere_fr: item.descriere_fr,
          definitie_id: item.definitie_id,
          limba: row.original.limba,
          original_id: item.original_id,
          parentId: row.original.parentId,
          photo: item.photo,
          furnizor: item.furnizor,
          tip_material: row.original.tip_material,
          unitate_masura: row.original.unitate_masura,
          whatIs: 'Material',
        }
      } else if (row.original.whatIs == 'Utilaj') {
        nextItem = {
          id: item.id,
          articol: row.original.articol,
          articol_fr: row.original.articol_fr,
          cantitate: row.original.cantitate,
          clasa: row.original.clasa,
          cod: item.cod,
          furnizor: item.furnizor,
          cost: item.cost,
          descriere: item.descriere,
          descriere_fr: item.descriere_fr,
          definitie_id: item.definitie_id,
          limba: row.original.limba,
          original_id: item.original_id,
          parentId: row.original.parentId,
          cost_amortizare: item.cost_amortizare,
          status: item.status,
          photo: item.photo,
          unitate_masura: row.original.unitate_masura,
          whatIs: 'Utilaj',
        }

      } else if (row.original.whatIs == 'Transport') {
        nextItem = {
          id: item.id,
          articol: row.original.articol,
          articol_fr: row.original.articol_fr,
          cantitate: row.original.cantitate,
          clasa: row.original.clasa,
          cod: item.cod,
          cost: item.cost,
          descriere: item.descriere,
          descriere_fr: item.descriere_fr,
          definitie_id: item.definitie_id,
          limba: row.original.limba,
          original_id: item.original_id,
          parentId: row.original.parentId,
          unitate_masura: row.original.unitate_masura,
          whatIs: 'Transport',
        }
      } else return;
      const { updatedDetails, total } = replaceItemInDetailedCosts(
        parentId,
        whatIs,
        oldId,
        newId,
        item,
        row.original.cantitate,
        detailedCosts // Use current state directly instead of ref
      );
      setDetailedCosts(updatedDetails);

      // 3. Apoi setăm vizual și reteta + costul
      setRetete(prevRetete => {
        const updated = [...prevRetete];
        updated[row.index] = nextItem;

        const parentIndex = updated.findIndex(i => !i.whatIs && i.id == parentId);
        if (parentIndex !== -1) {
          updated[parentIndex] = {
            ...updated[parentIndex],
            cost: total,
          };
        }

        return updated;
      });

    }
    catch (error) {
      setActiveRowIndex(null);
      setOriginalRow(null);
      console.error("Error setting next item in list:", error);
    }
  }

  const replaceItemInDetailedCosts = (
    parentId,
    whatIs,
    removeId,
    addId,
    itemToAdd,
    cantitate,
    prevDetails
  ) => {
    const updatedDetails = structuredClone(prevDetails);
    // console.log(updatedDetails, parentId, whatIs, removeId, addId, itemToAdd, cantitate);
    // console.log(prevDetails, "prevDetails");
    if (!updatedDetails[parentId]) return { updatedDetails, total: "0.00" };

    // Remove the old item
    if (updatedDetails[parentId][whatIs]?.[removeId]) {
      delete updatedDetails[parentId][whatIs][removeId];
    }

    // Add the new one
    if (!updatedDetails[parentId][whatIs]) {
      updatedDetails[parentId][whatIs] = {};
    }

    updatedDetails[parentId][whatIs][addId] = {
      cost: parseFloat(itemToAdd.cost).toFixed(2),
      cantitate,
    };

    // Recalculate total
    const allTypes = ['Manopera', 'Material', 'Utilaj', 'Transport'];
    let total = 0;
    allTypes.forEach(type => {
      const group = updatedDetails[parentId][type];
      if (group) {
        Object.values(group).forEach(obj => {
          const c = parseFloat(obj.cost) || 0;
          const q = parseFloat(obj.cantitate) || 0;
          total += c * q;
        });
      }
    });

    return { updatedDetails, total: total.toFixed(2) };
  };

  const acceptUpdateReteta = async (id) => {
    try {
      await api.post(`/Santiere/actualizeOneReteta/${id}`);
      fetchManopere(); // Re-fetch the data to reflect changes
      console.log("Reteta updated successfully:", id);
    } catch (error) {
      console.log("Error accepting update reteta:", error);
    } finally {
      setActualizareReteta(null);
    }
  };


  const updateReteta = async (id) => {
    try {
      setEditedCosts({});
      setSelectedEdit(null);
      setCantitateReteta(0);
      setActualizareReteta((prev) => {
        if (prev === id) {
          acceptUpdateReteta(id); // your custom logic here
          return null;
        }
        return id;
      });
    } catch (error) {
      console.error("Error updating reteta:", error);
    }
  };

  //dropdown logic
  //
  //
  const parentIds = useMemo(
    () => (retete || []).filter(r => !r.parentId).map(r => r.id),
    [retete]
  );
  const allOpen = useMemo(
    () => parentIds.length > 0 && parentIds.every(id => openDropdowns.has(id)),
    [parentIds, openDropdowns]
  );

  const toggleAllDropdowns = async () => {
    try {
      if (allOpen) {
        // CLOSE ALL currently open parents
        const toClose = Array.from(openDropdowns); // snapshot
        for (const id of toClose) {
          await toggleDropdown(id, false); // falsy second arg = close branch in your logic
        }
      } else {
        // OPEN all parents that are not open
        const toOpen = parentIds.filter(id => !openDropdowns.has(id));
        for (const id of toOpen) {
          await toggleDropdown(id); // same logic you already use
        }
      }
    } catch (error) {
      console.error("Error toggling all dropdowns:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignorăm dacă click-ul e înăuntru
      const isClickInsideNext = event.target.closest('.active_nextItem');
      const isClickInsideDropdown = event.target.closest('.dropdown-container');

      if (!isClickInsideNext && originalRowRef.current && activeRowIndexRef.current !== null) {
        // console.log(detailedCosts, detailedCostsRef.current, "Resetting next item with costs");
        resetNextItem(); // folosim detailedCostsRef pentru a avea cele mai recente date
      }

      if (!isClickInsideDropdown) {
        setActualizareReteta(null);
        setSelectedDelete(false);
        setEditedCosts({});
        setSelectedEdit(null);
        lastMoveAnchorRef.current = null; // resetăm referința pentru mutare
        setMoveSelectedIds([]); // resetăm selecția de mutare
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []); // 🔥 Vezi cel mai fresh detailedCosts


  const parentProps = {
    setIsPopupOpen,
    setObjectsLen,
    objectsLen,
    lastObjectIndex,
    setLastObjectIndex,
    fetchParentRetete: fetchManopere,
    mainOfertaPartID
  };


  const topLevelRows = retete.filter(r => r.parentId == null);


  // making double work better
  // selected with shift
  //
  // in SantiereAddOfertaMain
  const lastSelectedIdRef = useRef(null);

  const parentIdsForDouble = useMemo(() =>
    topLevelRows
      .map(r => r.id),
    [topLevelRows]);

  const onParentRowClick = (id, e) => {
    if (!dubleazaRetete) return;

    setSelectedRowIds(prev => {
      if (e.shiftKey && lastSelectedIdRef.current != null) {
        const a = parentIdsForDouble.indexOf(lastSelectedIdRef.current);
        const b = parentIdsForDouble.indexOf(id);
        // console.log("a:", a, "b:", b, "lastSelectedId:", lastSelectedIdRef.current, "id:", id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          const range = parentIdsForDouble.slice(lo, hi + 1);
          lastSelectedIdRef.current = id;
          return Array.from(new Set([...prev, ...range]));
        }
      }
      lastSelectedIdRef.current = id;  // normal click: toggle single
      return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    });
  };

  //logica pentru delete retete din main oferta part
  const onParentRowClickDelete = (id, e) => {
    if (!deleteRetete) return;

    setSelectedRowIdsDelete(prev => {
      if (e.shiftKey && lastSelectedIdRef.current != null) {
        const a = parentIdsForDouble.indexOf(lastSelectedIdRef.current);
        const b = parentIdsForDouble.indexOf(id);
        // console.log("a:", a, "b:", b, "lastSelectedId:", lastSelectedIdRef.current, "id:", id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          const range = parentIdsForDouble.slice(lo, hi + 1);
          lastSelectedIdRef.current = id;
          return Array.from(new Set([...prev, ...range]));
        }
      }
      lastSelectedIdRef.current = id;  // normal click: toggle single
      return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    });
  };


  useEffect(() => {
    if (!acceptDelete) return;                    // run only when toggled on
    if (!selectedRowIdsDelete?.length) {
      setAcceptDelete(false);
      return;
    }

    (async () => {
      for (const id of selectedRowIdsDelete) {
        try {
          await deleteItem(id);                   // your existing single-delete logic
        } catch (e) {
          console.error("Eroare la ștergere ID:", id, e);
        }
      }
      setSelectedRowIdsDelete([]);
      setAcceptDelete(false);
    })();

  }, [acceptDelete]);


  //drag and drop logic
  const [moveSelectedIds, setMoveSelectedIds] = useState([]);
  const lastMoveAnchorRef = useRef(null);

  const onMoveSelectClick = useCallback((id, e) => {
    const isMod = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!isMod) return; // click normal rămâne pentru restul logicii tale

    setMoveSelectedIds(prev => {
      if (e.shiftKey && lastMoveAnchorRef.current != null) {
        const a = parentIdsForDouble.indexOf(lastMoveAnchorRef.current);
        const b = parentIdsForDouble.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          const range = parentIdsForDouble.slice(lo, hi + 1);
          lastMoveAnchorRef.current = id;
          return Array.from(new Set([...prev, ...range]));
        }
      }
      lastMoveAnchorRef.current = id; // toggle
      return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    });
  }, [parentIdsForDouble]);


  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // doar părinții
    const topLevel = retete.filter(r => r.parentId == null);

    // mapare sort_order (id DnD) -> rând părinte
    const getBySortable = (sid) =>
      topLevel.find(r => r.sort_order.toString() === String(sid));

    const draggedParent = getBySortable(active.id);
    const overParent = getBySortable(over.id);
    if (!draggedParent || !overParent) return;

    // selecția pentru mutare (mereu activă)
    const selectedSet = new Set(
      (moveSelectedIds ?? []).filter(id => topLevel.some(p => p.id === id))
    );
    const selectedBlock = topLevel.filter(p => selectedSet.has(p.id)); // ordinea curentă
    const isMultiDrag = selectedSet.has(draggedParent.id);

    // helper: reconstruiește lista completă cu copii după fiecare părinte
    const rebuildWithChildren = (orderedParents) => {
      const childrenByParent = retete
        .filter(r => r.parentId != null)
        .reduce((acc, child) => {
          (acc[child.parentId] ||= []).push(child);
          return acc;
        }, {});
      const list = [];
      for (const p of orderedParents) {
        list.push(p);
        if (childrenByParent[p.id]) list.push(...childrenByParent[p.id]);
      }
      return list;
    };

    // ----- mutare single (comportamentul vechi) -----
    if (!isMultiDrag) {
      const oldIndex = topLevel.findIndex(r => r.sort_order.toString() === active.id);
      const newIndex = topLevel.findIndex(r => r.sort_order.toString() === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const reorderedTop = arrayMove(topLevel, oldIndex, newIndex);
      const updatedParents = reorderedTop.map((r, idx) => ({ ...r, sort_order: idx + 1 }));
      const newRetete = rebuildWithChildren(updatedParents);

      try {
        await api.put(`/Santiere/updateReteteOrder`, {
          updatedParents: updatedParents.map(p => ({ id: p.id, sort_order: p.sort_order })),
        });
        setRetete(newRetete);
      } catch (err) {
        console.error("Failed to persist new order on server:", err);
      }
      return;
    }

    // ----- mutare în BLOC (multi-drag) -----
    if (selectedSet.has(overParent.id)) return; // drop peste un element din bloc => no-op

    const rest = topLevel.filter(p => !selectedSet.has(p.id));
    let insertIndex = rest.findIndex(r => r.sort_order.toString() === over.id);
    if (insertIndex < 0) insertIndex = rest.length;

    const newTop = [
      ...rest.slice(0, insertIndex),
      ...selectedBlock,
      ...rest.slice(insertIndex),
    ];

    const updatedParents = newTop.map((r, idx) => ({ ...r, sort_order: idx + 1 }));
    const newRetete = rebuildWithChildren(updatedParents);

    try {
      await api.put(`/Santiere/updateReteteOrder`, {
        updatedParents: updatedParents.map(p => ({ id: p.id, sort_order: p.sort_order })),
      });
      setRetete(newRetete);
    } catch (err) {
      console.error("Failed to persist new order on server:", err);
    }
  };

  // const handleDragEnd = async event => {
  //   const { active, over } = event;
  //   if (!over || active.id === over.id) return;


  //   // get only the parent rows:
  //   const topLevel = retete.filter(r => r.parentId == null);

  //   const oldIndex = topLevel.findIndex(r => r.sort_order.toString() === active.id);
  //   const newIndex = topLevel.findIndex(r => r.sort_order.toString() === over.id);
  //   if (oldIndex < 0 || newIndex < 0) return;

  //   // reorder just those parent rows
  //   const reorderedTop = arrayMove(topLevel, oldIndex, newIndex);


  //   // give each of those a new sort_order (1, 2, 3, …)
  //   const updatedParents = reorderedTop.map((r, idx) => ({
  //     ...r,
  //     sort_order: idx + 1,
  //   }));

  //   // Build a quick lookup of children by parentId
  //   const childrenByParent = retete
  //     .filter(r => r.parentId != null)
  //     .reduce((acc, child) => {
  //       if (!acc[child.parentId]) acc[child.parentId] = [];
  //       acc[child.parentId].push(child);
  //       return acc;
  //     }, {});

  //   // Now rebuild `retete` by inserting each parent and then its children immediately after
  //   const newRetete = [];
  //   for (const parent of updatedParents) {
  //     newRetete.push(parent);
  //     if (childrenByParent[parent.id]) {
  //       // push all of this parent’s children (in whatever original order they were in)
  //       newRetete.push(...childrenByParent[parent.id]);
  //     }
  //   }
  //   // console.log("New retete order:", newRetete);
  //   try {
  //     // Adjust endpoint URL to whatever you have on the server:
  //     await api.put(`/Santiere/updateReteteOrder`, {
  //       updatedParents: updatedParents.map(p => ({
  //         id: p.id,
  //         sort_order: p.sort_order,
  //       })),
  //     });
  //     setRetete(newRetete);
  //   } catch (err) {
  //     console.error("Failed to persist new order on server:", err);
  //     // Optionally roll back state or show an error message
  //   }


  // }




  const columns = useMemo(() => [
    {
      accessorKey: "Dropdown",
      header: (
        <div className='flex justify-center items-center h-full w-full'>
          <FontAwesomeIcon
            onClick={toggleAllDropdowns}
            className='text-blue-500 hover:text-blue-600 cursor-pointer text-xl' icon={faArrowDownShortWide} />
        </div>
      ),
      cell: ({ row, getValue, cell }) => (
        <div onClick={() => row.original.id != selectedEdit && toggleDropdown(cell.row.original.id)} className='flex justify-center h-full  select-none w-full dropdown-container overflow-hidden cursor-pointer items-center'>
          <FontAwesomeIcon className={` ${openDropdowns.has(cell.row.original.id) ? "rotate-90" : ""}  text-center  text-xl`} icon={faChevronRight} />
        </div>
      ),
    },
    {
      accessorKey: "logo",
      header: "Logo",
      cell: ({ row, getValue, cell }) => (
        row.original.whatIs == 'Manopera' ?
          <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-green-500 h-[1.5rem] w-full ' icon={faUser} /></div>
          :
          row.original.whatIs == 'Material' ?
            <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-amber-500 h-[1.5rem] w-full ' icon={faTrowelBricks} /></div>
            :
            row.original.whatIs == 'Utilaj' ?
              <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-violet-500 h-[1.5rem] w-full  ' icon={faTruck} /></div>
              :
              row.original.whatIs == 'Transport' ?
                <div className='w-full h-full flex justify-center items-center overflow-hidden'><FontAwesomeIcon className='text-pink-500 h-[1.5rem] w-full  ' icon={faCar} /></div>
                :
                <div onClick={() => console.log(retete)} className='w-full h-full flex justify-center items-center overflow-hidden '><FontAwesomeIcon className='text-blue-500 h-[1.5rem]   ' icon={faFolder} /></div>
      ),

    },
    {
      accessorKey: "detalii_aditionale",
      header: (
        <div className="">
          {localReper1 || "Eroare"}
        </div>
      ),
      size: 100,
      cell: ({ getValue, row }) => {
        const isEditable = (row.original.id === selectedEdit && !row.original.whatIs);
        return (
          <TextAreaCell
            rowId={row.original.id}
            whatIs={row.original.whatIs || "Reteta"}
            initialValue={getValue() || ""}
            isEditable={isEditable}
            maxLines={2}
            onEdit={handleDetaliiChange}
            bold={false}
            fromTop={15}
            absoluteInput={true}
            translateXNegative={90}
            arrowPos={110}
          />
        );
      },
    },
    {
      accessorKey: "reper_plan",
      header:
        <div className="">
          {localReper2 || "Eroare"}
        </div>
      ,
      size: 100,
      cell: ({ getValue, row }) => {
        const isEditable = (row.original.id === selectedEdit && !row.original.whatIs);
        return (
          <TextAreaCell
            rowId={row.original.id}
            whatIs={row.original.whatIs || "Reteta"}
            initialValue={getValue() || ""}
            maxLines={2}
            isEditable={isEditable}
            onEdit={handleReperChange}
            bold={false}
            fromTop={15}
            absoluteInput={true}
            translateX={60}
            arrowPos={50}
          />
        );
      },
    },
    { accessorKey: "furnizor", header: "Furnizor", size: 80 },
    {
      accessorKey: "cod",
      header: "Cod",
      cell: ({ getValue }) => (
        <div className=' font-semibold'>{getValue() ? getValue() : ""}</div>
      ),
      size: 120
    },
    {
      accessorKey: "clasa",
      header: "Clasă",
      cell: ({ getValue }) => (
        <div className=''>{getValue() ? getValue() : ""}</div>
      ),
      size: 150
    },
    {
      accessorKey: "articol_client",
      header: "Articol Client",
      size: 150,
      cell: ({ getValue, row }) => {
        const isEditable = (row.original.id === selectedEdit && !row.original.whatIs);
        return (
          <TextAreaCell
            rowId={row.original.id}
            whatIs={row.original.whatIs || "Reteta"}
            initialValue={getValue() || ""}
            maxLines={2}
            isEditable={isEditable}
            onEdit={handleArticolClientChange}
            bold={false}
            absoluteWidth={"32rem"}
            absoluteInput={true}
            arrowPos={50}
            fromTop={15}
          />
        );
      },
    },
    {
      accessorKey: "articol",
      header: (
        <div className="flex items-center w-[95%]  justify-between text-black ">
          <span>Articol</span>
          <span className='flex items-center'>Limba:
            <span onClick={() => setLocalLimba(prev => prev == 'RO' ? 'FR' : 'RO')} className='ml-2 text-green-600 border-2 hover:text-green-500 hover:border-green-500 cursor-pointer border-green-600 rounded-full aspect-square min-w-[2rem] flex items-center justify-center'>
              {localLimba}
            </span>
          </span>
        </div>
      ),
      cell: ({ getValue, row }) => {
        return <OverflowPopover text={localLimba === 'RO' ? getValue() || "..." : row.original.articol_fr || "..."} maxLines={2} />;
      },
      size: 300
    },
    {
      accessorKey: "descriere",
      header: (
        <div className="flex items-center w-[95%] justify-between text-black ">
          <span>Descriere</span>
        </div>
      ),
      cell: ({ getValue, row }) => {
        return <OverflowPopover text={localLimba === 'RO' ? getValue() || "" : row.original.descriere_fr || ""} maxLines={2} />;
      },
      size: 200
    },
    {
      accessorKey: 'whatIs',
      header: 'Tip',
      size: 100,
      cell: ({ getValue, row }) => getValue() ? <div className='w-full overflow-hidden text-sm'>{row.original.whatIs == "Material" ? getValue() + " " + row.original.tip_material : getValue()}</div> : 'Rețetă', // Display default value if the value is empty or undefined
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
              className="h-[2.3rem] min-w-[2rem] max-w-28 object-cover"
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
        const isEditable = (row.original.id === selectedEdit && !row.original?.whatIs);

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
      },
      size: 70
    },
    {
      accessorKey: "cost",
      header: "Preț Unitar",
      cell: ({ getValue, row }) => {
        const isEditable = row.original.parentId && row.original.parentId == selectedEdit;

        return (
          <CostInputCell
            rowId={row.original.id}
            whatIs={row.original.whatIs || "Reteta"}
            initialValue={getValue()}
            isEditable={isEditable}
            onEdit={handleCostChange} // optional
            bold={true}
          />
        );
      },
      size: 80
    },
    {
      accessorKey: "pret_total",
      header: "Pret Total",
      cell: ({ getValue, row }) => {

        return (
          <span className='font-semibold'>{(row.original.cost * row.original.cantitate).toFixed(2)}</span>
        )
      },
      size: 80
    },
    {
      accessorKey: "threeDots",
      header: "Opțiuni",
      cell: ({ row }) => (
        row.original.whatIs == 'Manopera' || row.original.whatIs == 'Material' || row.original.whatIs == 'Utilaj' || row.original.whatIs == 'Transport' ?
          <div className=' dropdown-container h-full w-full relative flex '>
            <div className='text-xl relative h-full w-full select-none items-center justify-around gap-1 flex'>
              <FontAwesomeIcon onClick={(e) => setNextItemInList(e, row)} className='w-full text-green-500 hover:text-green-600 cursor-pointer dropdown-container' icon={faChevronDown} />
              {activeRowIndex != row.index ?
                <FontAwesomeIcon className='w-full text-red-500 hover:text-red-600 cursor-pointer dropdown-container' icon={faEllipsisVertical} />
                :
                <FontAwesomeIcon onClick={() => handleSaveNextItem(row.original)} className='w-full text-green-600 hover:text-green-700 cursor-pointer dropdown-container' icon={faSquareCheck} />
              }
            </div>
          </div>
          :
          <div className="absolute dropdown-container group w-full">
            {/* Trigger area: shows either Confirm or the ellipsis */}
            <div className="w-full select-none flex items-center justify-center">
              {(selectedEdit === row.original.id || selectedDelete === row.original.id || actualizareReteta === row.original.id) ? (
                <button
                  onClick={(e) => {
                    if (selectedDelete === row.original.id) {
                      // DELETE confirm -> use your existing delete
                      handleSelectedForDelete(e, row.original.id);
                    } else if (selectedEdit === row.original.id) {
                      // EDIT confirm -> use your existing edit
                      toggleDropdown(row.original.id, row.original.id);
                    }
                    else if (actualizareReteta === row.original.id) {
                      // ACTUALIZE confirm -> use your existing updateReteta
                      updateReteta(row.original.id);
                    }
                  }}
                  className="bg-green-500 text-sm hover:bg-green-600 text-white font-semibold px-2 py-2 rounded-lg"
                >
                  Confirm
                </button>
              ) : (
                <FontAwesomeIcon icon={faEllipsis} className="text-xl text-gray-600" />
              )}
            </div>

            {/* Hover dropdown ONLY when NOT in confirm mode */}
            {selectedDelete !== row.original.id &&
              selectedEdit !== row.original.id &&
              actualizareReteta !== row.original.id &&
              (
                <div className="absolute z-10 left-0 -translate-x-[60%] bg-white border shadow-lg rounded-md w-44 p-2
                      flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100
                      pointer-events-none group-hover:pointer-events-auto transition-all duration-200
                      text-lg font-semibold text-gray-700">

                  <div
                    onClick={() => {
                      toggleDropdown(row.original.id, row.original.id);
                    }}
                    className="cursor-pointer w-full flex justify-start items-center rounded-md px-2 py-2 hover:bg-green-100 hover:bg-opacity-90"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} className="mr-2 text-green-400" />
                    Edit
                  </div>
                  <div
                    onClick={(e) => {
                      updateReteta(row.original.id);
                    }}
                    className="cursor-pointer w-full flex justify-start items-center rounded-md px-2 py-2 hover:bg-purple-100 hover:bg-opacity-90"
                  >
                    <FontAwesomeIcon icon={faRotate} className="mr-2 text-purple-400" />
                    Actualizeazǎ
                  </div>
                  <div
                    onClick={(e) => {
                      handleSelectedForDelete(e, row.original.id);
                    }}
                    className="cursor-pointer w-full flex justify-start items-center rounded-md px-2 py-2 hover:bg-red-100 hover:bg-opacity-90"
                  >
                    <FontAwesomeIcon icon={faTrashCan} className="mr-2 text-red-400" />
                    Delete
                  </div>
                </div>
              )}
          </div>
      ),
      meta: {
        style: {
          textAlign: 'center',
          padding: '0',
        },
      },
    },
  ], [retete, ascendent, selectedEdit, selectedDelete, activeRowIndex, originalRow, localReper1, localReper2, actualizareReteta, localLimba]);

  const table = useReactTable({
    data: retete,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    state: {
      columnResizing: {},
    },
  });

  // The scrollable div that wraps your <table>
  const scrollParentRef = useRef(null);

  // All flat rows from TanStack (what you currently map)
  const allRows = table.getRowModel().rows;

  // Virtualizer: only render the visible slice
  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 40,   // ≈ row height in px; tweak to your actual row height (36–44)
    overscan: 10,             // render a few extra rows above/below viewport
  });

  // Spacers
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop =
    virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  // Number of visible columns (for spacer cells to span across the whole table)
  const visibleColCount = table.getVisibleLeafColumns().length;



  return (
    <>
      <div className=' w-full  flex flex-col h-full justify-between overflow-hidden '>
        {retete &&
          <div className="p-2 pb-4 pt-5 xxxl:text-sm text-base scrollbar-webkit w-full overflow-hidden text-white h-full flex flex-col justify-between">
            <div ref={scrollParentRef} className="scrollbar-webkit h-full overflow-auto relative">
              <DndContext
                sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={topLevelRows.map(r => r.sort_order.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  <table className="w-full border-separate text-sm xxxl:text-sm  xxxl:leading-tight leading-tight border-spacing-0 ">
                    <thead className='top-0 w-full sticky  z-10 '>
                      {/* <tr className='text-black'>
                                    <th className='border-b border-r border-black bg-white' colSpan={2}></th>
                                    <th className='border-b border-r bg-white border-black'>
                                        <input
                                            type="text"
                                            name="cod"
                                            value={filters.cod}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none py-3"
                                            placeholder="Filtru Cod"
                                        />
                                    </th>
                                    <th className='border-b border-r bg-white border-black'>
                                        <input
                                            type="text"
                                            name="clasa"
                                            value={filters.clasa}
                                            onChange={handleInputChange}
                                            className="p-2 w-full outline-none  py-3"
                                            placeholder="Filtru Clasă"
                                        />
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
                                    <th className=" bg-white border-b border-r border-black" colSpan={7}>
                                
                                    </th>
                                </tr> */}
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id} className="bg-white text-black text-left  font-bold select-none">
                          {headerGroup.headers.map(header => (

                            <th key={header.id} className={`relative border-b-2 border-r border-black   bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""} `}
                              style={{
                                width: header.column.id === "threeDots" ? '4.5rem' : header.column.id === "Dropdown" ? "35px" : header.column.id === "logo" ? "35px" : `${header.getSize()}px`, // Enforce width for "Options"
                                minWidth: header.column.id === "threeDots" ? '4.5rem' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px" : "35px" : '', // Ensure no shrinkage
                                maxWidth: header.column.id === "threeDots" ? '4.5rem' : header.column.id === "Dropdown" ? header.column.id === "logo" ? "35px" : "35px" : '', // Ensure no expansion
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
                    {retete.length === 0 ? (
                      <tbody className="relative z-0">
                        <tr>
                          <td className="bg-[rgb(255,255,255,0.75)] border-black border-r border-b text-black h-10" colSpan={visibleColCount}>
                            <div className="flex justify-center items-center w-full text-base font-semibold h-full">
                              Nimic Adăugat
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    ) : (
                      <tbody className="relative z-0">
                        {/* TOP spacer */}
                        {paddingTop > 0 && (
                          <tr>
                            <td colSpan={visibleColCount} style={{ height: `${paddingTop}px` }} />
                          </tr>
                        )}

                        {/* Only render the virtual slice */}
                        {virtualItems.map((vi) => {
                          const row = allRows[vi.index];
                          const index = vi.index; // in case you need it

                          return (row.original.whatIs === 'Manopera' ||
                            row.original.whatIs === 'Material' ||
                            row.original.whatIs === 'Utilaj' ||
                            row.original.whatIs === 'Transport') ? (
                            // --- your CHILD ROW rendering (unchanged) ---
                            <React.Fragment key={row.id}>
                              <tr className={`dropdown-container ${activeRowIndex === index ? 'active_nextItem' : ''} text-black`}>
                                {row.getVisibleCells().map((cell) =>
                                  cell.column.id === 'Dropdown' ? (
                                    <td key={cell.id} />
                                  ) : (
                                    <td
                                      key={cell.id}
                                      onClick={() => console.log(cell)}
                                      className={`${cell.column.id === 'whatIs'
                                        ? row.original.whatIs === 'Manopera'
                                          ? 'bg-green-300'
                                          : row.original.whatIs === 'Material'
                                            ? 'bg-amber-300'
                                            : row.original.whatIs === 'Utilaj'
                                              ? 'bg-violet-300'
                                              : row.original.whatIs === 'Transport'
                                                ? 'bg-pink-300'
                                                : 'bg-white'
                                        : row.index === activeRowIndex
                                          ? 'bg-blue-100'
                                          : row.original.definitie_id
                                            ? 'bg-blue-100'
                                            : 'bg-white'
                                        } border-b border-r break-words max-w-72 relative border-black px-3`}
                                    >
                                      <div className="h-full w-full overflow-hidden">
                                        <div className="max-h-10 h-10 grid grid-cols-1 break-words whitespace-pre-line items-center overflow-auto scrollbar-webkit">
                                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                      </div>
                                    </td>
                                  )
                                )}
                              </tr>
                            </React.Fragment>
                          ) : (
                            // --- your PARENT ROW rendering (SortableRow) unchanged ---
                            <React.Fragment key={row.id}>
                              <SortableRow
                                key={row.original.sort_order}        // consider changing to row.original.id for stability
                                row={row}
                                selectedDelete={selectedDelete}
                                selectedEdit={selectedEdit}
                                actualizareReteta={actualizareReteta}
                                // dublare
                                dubleazaRetete={dubleazaRetete}
                                selectedRowIds={selectedRowIds}
                                setSelectedRowIds={setSelectedRowIds}
                                onParentRowClick={onParentRowClick}
                                // delete
                                deleteRetete={deleteRetete}
                                setSelectedRowIdsDelete={setSelectedRowIdsDelete}
                                selectedRowIdsDelete={selectedRowIdsDelete}
                                onParentRowClickDelete={onParentRowClickDelete}
                                onAnchorChosen={onAnchorChosen}
                                anchorId={anchorId}
                                chooseAnchor={chooseAnchor}
                                onMoveSelectClick={onMoveSelectClick}
                                moveSelectedIds={moveSelectedIds}
                              />
                            </React.Fragment>
                          );
                        })}

                        {/* BOTTOM spacer */}
                        {paddingBottom > 0 && (
                          <tr>
                            <td colSpan={visibleColCount} style={{ height: `${paddingBottom}px` }} />
                          </tr>
                        )}
                      </tbody>
                    )}
                  </table>
                </SortableContext>
              </DndContext>
            </div>
            <div onClick={() => setIsPopupOpen(true)} className='bg-white mt-2 mb-3 p-2 px-3 hover:bg-[rgb(255,255,255,0.9)] cursor-pointer border-t border-black select-none text-black' colSpan={14}>
              <div className='flex font-bold   text-center justify-center items-center gap-2'>
                <p className=' text-center'>Adauga Retete</p>
                <FontAwesomeIcon className='text-green-500  text-center text-xl' icon={faPlus} />
              </div>
            </div>
            {/* Pagination Controls */}
            <div className="mt-auto text-xs  gap-4 flex containerZ p-4  items-center">
              <table className=''>
                <thead>
                  <tr className='select-none'>
                    <th className='border font-medium w-40 text-left  border-black p-2 bg-blue-300 text-black'>Ore Manopera</th>
                    <th className='border font-medium w-32 text-left  border-black p-2 bg-green-300 text-black'>Manopera</th>
                    <th className='border font-medium w-32 text-left border-black p-2 bg-amber-300 text-black'>Materiale</th>
                    <th className='border font-medium w-32 text-left border-black p-2 bg-pink-300 text-black'>Transport</th>
                    <th className='border font-medium w-32 text-left border-black p-2 bg-violet-300 text-black'>Utilaje</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className='font-semibold '>
                    <td className='border  border-black p-2 bg-white text-black'>{finalData.oreManopera.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{finalData.manopera.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{finalData.materiale.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{finalData.transport.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{finalData.utilaje.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <table className=''>
                <tbody>
                  <tr className='font-medium select-none'>
                    <td className='border  border-black p-2 bg-blue-30 w-32 bg-blue-300 text-black'>Cheltuieli directe</td>
                    <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faPlus} /></td>
                    <td className='border border-black p-2  bg-blue-300 text-black'>Recapitulații
                      <input
                        maxLength={2}
                        value={recapitulatii}
                        type="text"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+(\.\d{1,2})?$/.test(val)) {
                            setRecapitulatii(val);
                          }
                        }}
                        onBlur={() => {
                          if (recapitulatii === '') {
                            setRecapitulatii('1');
                          }
                        }}
                        className='mx-2 max-w-10 font-normal outline-none text-center px-2 border border-black rounded-lg' />%</td>
                    <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faEquals} /></td>
                    <td className='border border-black p-2 w-32 bg-blue-300 text-black'>Valoare</td>
                    <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faPlus} /></td>
                    <td className='border border-black p-2  bg-blue-300 text-black'>TVA
                      <input
                        maxLength={2}
                        value={TVA}
                        type="text"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+(\.\d{1,2})?$/.test(val)) {
                            setTVA(val);
                          }
                        }}
                        onBlur={() => {
                          if (TVA === '') {
                            setTVA('1');
                          }
                        }}
                        className='mx-2 max-w-10 font-normal outline-none text-center px-2 border border-black rounded-lg' />%</td>
                    <td rowSpan={2} className='p-2 text-center'><FontAwesomeIcon icon={faEquals} /></td>
                    <td className='border border-black p-2 w-32  bg-blue-300 text-black'>
                      <div className='flex items-center gap-2'>
                        <p>Total</p>
                      </div>
                    </td>
                  </tr>
                  <tr className='font-semibold'>
                    <td className='border  border-black p-2 bg-white text-black'>{finalData.cheltuieliDirecte.toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{(recapitulatii / 100 * finalData.cheltuieliDirecte).toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{(finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte).toFixed(2)}</td>
                    <td className='border border-black p-2 bg-white text-black'>{(TVA / 100 * (finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte)).toFixed(2)}</td>
                    <td className='border font-bold tracking-wide  border-black p-2 bg-white text-black'>{((finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte) + TVA / 100 * (finalData.cheltuieliDirecte + recapitulatii / 100 * finalData.cheltuieliDirecte)).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <button onClick={() => setIsGenerareOpen(true)} className='bg-green-500 cursor-pointer flex gap-2 justify-center font-medium items-center p-2 mt-6 text-sm tracking-wide hover:bg-green-600 h-10 text-black rounded-lg flex-grow'><FontAwesomeIcon icon={faFileExport} />Genereaza</button>
            </div>
          </div>

        }
        {/* div that prevents clicks outside */}
        {isPopupOpen && (
          <>
            <div className=" absolute top-0 left-0 right-0 bottom-0 h-full w-full z-[100]"></div>
            <div className='w-full top-0 left-0 right-0 bottom-0 absolute h-full items-center justify-center flex z-[200]'>
              <div className=' relative rounded-xl bg-[#002a54] h-[97%] w-[96%]'>
                <SantiereAddReteteTable  {...parentProps} reper1={localReper1} reper2={localReper2} />
              </div>
            </div>
          </>
        )}
        {isGenerareOpen && (
          <>
            <div className=" absolute top-0 left-0 right-0 bottom-0 h-full w-full z-[100]"></div>
            <div className='w-full top-0 left-0 right-0 bottom-0 absolute h-full items-center justify-center flex z-[200]'>
              <div className=' relative rounded-xl border-2 shadow-md shadow-gray-400 bg-[#002a54] h-1/2 w-1/2'>
                <PDF_Popup oferta_part_id={mainOfertaPartID} setIsGenerareOpen={setIsGenerareOpen} TVA={TVA} recapitulatii={recapitulatii} reper1={localReper1} reper2={localReper2} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}


function SortableRow({
  row,
  selectedDelete,
  selectedEdit,
  actualizareReteta,
  chooseAnchor,
  anchorId,
  onAnchorChosen,
  dubleazaRetete,
  selectedRowIds,
  onParentRowClick,
  onMoveSelectClick,
  moveSelectedIds,
  onParentRowClickDelete,
  deleteRetete,
  selectedRowIdsDelete
}) {
  // use sortorder (not id) as the dnd‐kit key:
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.original.sort_order.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    background: isDragging ? "rgba(200, 200, 200, 0.4)" : undefined,
  };

  const isParent = !row.original.parentId;
  const isAnchor = anchorId === row.original.id;
  const isDupSelected = dubleazaRetete && isParent && selectedRowIds.includes(row.original.id);
  const isDeleteSelected = isParent && selectedRowIdsDelete?.includes(row.original.id);
  const isMoveSelected = isParent && moveSelectedIds?.includes(row.original.id);

  const rowClass = `
    dropdown-container text-black
    ${isAnchor ? "bg-blue-300" :
      isDupSelected ? "bg-amber-300" :
        isDeleteSelected ? "bg-red-300" :
          isMoveSelected ? "bg-sky-200" :
            row.original.id === selectedDelete ? "bg-red-300 " :
              row.original.id === selectedEdit ? "bg-green-300 " :
                row.original.id === actualizareReteta ? "bg-purple-300 " :
                  "bg-[rgb(255,255,255,0.80)] hover:bg-[rgb(255,255,255,0.60)]"}
  `.trim();


  const handleRowClick = (e) => {
    // 1) mereu disponibil: Shift/Ctrl/Cmd pentru selecția de MUTARE
    if (!dubleazaRetete && !deleteRetete && isParent && !isDragging && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      onMoveSelectClick?.(row.original.id, e);
      return; // nu continuăm cu alte moduri pe același click
    }

    // 2) modurile tale existente
    if (chooseAnchor) {
      if (isParent && !isDragging) onAnchorChosen?.(row.original.id);
      return;
    }
    if (!dubleazaRetete && !deleteRetete || !isParent) return;
    if (isDragging) return;
    if (dubleazaRetete) {
      onParentRowClick?.(row.original.id, e);
      return;
    }
    if (deleteRetete) {
      onParentRowClickDelete?.(row.original.id, e);
      return;
    }

  };

  const cells = row.getVisibleCells();
  const optionsCell =
    // if you have a stable id for the options column, prefer this:
    cells.find(c => c.column.id === 'options')
    // fallback: assume the last visible cell is the options cell
    ?? cells[cells.length - 1];
  const otherCellsCount = Math.max(0, cells.length - (optionsCell ? 1 : 0));


  return (
    row.original.articol === "Blank" ? (
      <tr
        onClick={handleRowClick}
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`text-black ${rowClass} relative`}
      >
        {/* Big "Blank" cell spanning all but the options column */}
        <td
          className="border-b border-r border-black bg-white p-1 px-3"
          colSpan={otherCellsCount}
        >
          <div className="flex justify-center items-center h-full w-full">{row.original?.detalii_aditionale || "Nimic"}</div>
        </td>

        {/* Options cell (same rendering as normal rows) */}
        {optionsCell && (
          <td
            key={optionsCell.id}
            className="border-b border-r break-words max-w-72 relative border-black p-1 px-3"
            style={optionsCell.column.columnDef.meta?.style}
          >
            <div className="h-full w-full overflow-hidden">
              <div className="max-h-9 h-9 w-full grid grid-cols-1 items-center break-words whitespace-pre-line overflow-auto scrollbar-webkit">
                {flexRender(optionsCell.column.columnDef.cell, optionsCell.getContext())}
              </div>
            </div>
          </td>
        )}
      </tr>
    ) : (
      <tr
        onClick={handleRowClick}
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={rowClass}
      >
        {cells.map(cell => (
          <td
            key={cell.id}
            className="border-b border-r break-words max-w-72 relative border-black p-1 px-3"
            style={cell.column.columnDef.meta?.style}
          >
            <div className="h-full w-full overflow-hidden">
              <div className="max-h-9 h-9 w-full grid grid-cols-1 items-center break-words whitespace-pre-line overflow-auto scrollbar-webkit">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            </div>
          </td>
        ))}
      </tr>
    )
  );
}
