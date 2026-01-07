import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axiosAPI";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDownAZ,
  faArrowUpAZ,
  faChevronRight,
  faEllipsis,
  faFileCirclePlus,
  faLanguage,
  faPenToSquare,
  faPlus,
  faSort,
  faSortDown,
  faSortUp,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import TextAreaCell from "../Santiere/Ofertare/TextareaCell";
import CostInputCell from "../Santiere/Ofertare/CostCell";

export default function TransportTable({
  reloadKey,
  cancelDouble,
  selectedDouble,
  setSelectedDouble,
  selectedDelete,
  setSelectedDelete,
  setSelectedEdit,
  setFormData,
  selectedEdit,
  cancelEdit,
  cancelDelete,
}) {
  const [transport, setTransport] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [ascendent, setAscendent] = useState(false);
  const [ascendentTime, setAscendentTime] = useState(null);
  //
  const [open, setOpen] = useState([]);

  //editare smechere
  const [costTransport, setCostTransport] = useState(0);
  const [codTransport, setCodTransport] = useState(0);
  const [descriereTransport, setDescriereTransport] = useState("");
  const [descriereTransportFR, setDescriereTransportFR] = useState("");

  const editedCostsRef = useRef(costTransport);
  const editedCodRef = useRef(codTransport);
  const editedDescriereRef = useRef(descriereTransport);
  const editedDescriereFRRef = useRef(descriereTransportFR);

  // State for selected interior
  const [selectedEditInterior, setSelectedEditInterior] = useState(null);
  const [selectedDeleteInterior, setSelectedDeleteInterior] = useState(null);
  // const [selectedDoubleInterior, setSelectedDoubleInterior] = useState(null);

  const [localLimba, setLocalLimba] = useState("RO");

  //to see the updated cantitate and costs in the function
  useEffect(() => {
    editedCostsRef.current = costTransport;
  }, [costTransport]);

  useEffect(() => {
    editedCodRef.current = codTransport;
  }, [codTransport]);

  useEffect(() => {
    editedDescriereRef.current = descriereTransport;
  }, [descriereTransport]);

  useEffect(() => {
    editedDescriereFRRef.current = descriereTransportFR;
  }, [descriereTransportFR]);
  //
  //

  const handleCostChange = (id, whatIs, value) => {
    setCostTransport(value);
  };
  const handleCodChange = (id, whatIs, value) => {
    setCodTransport(value);
  };
  const handleDescriereChange = (id, whatIs, value) => {
    setDescriereTransport(value);
  };
  const handleDescriereFRChange = (id, whatIs, value) => {
    setDescriereTransportFR(value);
  };

  const [filters, setFilters] = useState({
    limba: "",
    cod_transport: "",
    clasa_transport: "",
    transport: "",
  });


  const fetchTransport = async (offset, limit) => {
    setOpen([]);
    try {
      const response = await api.get("/Transport/FetchTransportDef", {
        params: {
          offset,
          limit,
          limba: filters.limba,
          cod_transport: filters.cod_transport,
          clasa_transport: filters.clasa_transport,
          transport: filters.transport,
          asc_transport: ascendent,
          dateOrder: ascendentTime,
        },
      });
      if (response.data.data.length == 0) {
        setTransport([]);
        setTotalItems(0);
        setCurrentOffset(0);
        return;
      }
      if (offset >= Math.ceil(response.data.totalItems / limit)) {
        fetchTransport(0, limit);
      } else {
        setTransport(response.data.data);
        setTotalItems(response.data.totalItems);
        setCurrentOffset(response.data.currentOffset);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchTransport(currentOffset, limit);
  }, [reloadKey]);

  useEffect(() => {
    const getData = setTimeout(() => {
      if (limit == "" || limit == 0) fetchTransport(0, 10);
      else fetchTransport(0, limit);
    }, 500);
    return () => clearTimeout(getData);
  }, [filters, limit, ascendent, ascendentTime]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
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
  };

  const handleLimit = (e) => {
    if (/^[0-9]{0,2}$/.test(e.target.value)) {
      setLimit(e.target.value);
    }
  };

  //States for dropDown/edit/delete/copy

  const handleAcceptDelete = async (row) => {
    try {
      const response = await api.delete(`/Transport/DeleteTransport/${row.id}`);
      // console.log("Deleted:", response.data);

      // Update state to remove the deleted row from UI
      setTransport((prev) =>
        prev.filter((item) => {
          // dacă itemul are același id
          if (item.id == row.id) {
            // îl păstrăm DOAR dacă e părinte (definitie_id === null)
            return item.definitie_id == null;
          }
          return true; // restul itemilor rămân
        })
      );

      // Reset selected delete state
      setSelectedDeleteInterior(null);
    } catch (err) {
      console.error("Error deleting Transport:", err);
    }
  };

  const handleSelectedForDelete = (e, passedRow) => {
    setSelectedEditInterior(null);
    // setSelectedDoubleInterior(null);
    cancelEdit(e);
    cancelDouble(e);
    //de pus interior double
    e.stopPropagation();
    if (passedRow.definitie_id != null) {
      setSelectedDeleteInterior(passedRow.id);
      return;
    }
    setSelectedDelete(passedRow.id); // Toggle the dropdown based on the current state
  };

  const handleAcceptEdit = async (row) => {
    const cost_unitar = parseFloat(editedCostsRef.current);
    const cod_transport = editedCodRef.current;
    const descriere = editedDescriereRef.current;
    const descriere_fr = editedDescriereFRRef.current;

    // console.log(cost_unitar, cantitate, cod_transport, descriere, descriere_fr, row);

    const form = {
      id: row.id, // must include for update
      definitie_id: row.definitie_id,
      cost_unitar,
      cod_transport,
      descriere,
      descriere_fr,
    };

    try {
      await api.put("/Transport/EditTransport", { form });

      setTransport((prev) =>
        prev.map((item) =>
          item.id === row.id && item.definitie_id != null // Ensure it's a child row
            ? {
              ...item,
              cost_unitar: cost_unitar.toFixed(3),
              cod_transport,
              descriere,
              descriere_fr,
            }
            : item
        )
      );
    } catch (err) {
      console.error("Error updating Transport row:", err);
    }
    setSelectedEditInterior(null);
  };

  const handleSelectedForEdit = (e, passedRow) => {
    e.stopPropagation();
    // setSelectedDoubleInterior(null);
    setSelectedDeleteInterior(null);
    cancelDelete(e);
    cancelDouble(e);

    if (passedRow.definitie_id != null) {
      setSelectedEditInterior(passedRow.id);
      //selectedEditInterior is used to show the edit input
      setCodTransport(passedRow.cod_transport);
      setCostTransport(passedRow.cost_unitar);
      setDescriereTransport(passedRow.descriere);
      setDescriereTransportFR(passedRow.descriere_fr);

      return;
    }
    setSelectedEdit(passedRow.id); // Toggle the dropdown based on the current state
    // console.log(passedRow.id, "selectedEdit");
    setFormData({
      cod_definitie: passedRow.cod_definitie,
      clasa_transport: passedRow.clasa_transport || "",
      transport: passedRow.transport || "",
      transport_fr: passedRow.transport_fr || "",
      descriere: passedRow.descriere || "",
      descriere_fr: passedRow.descriere_fr || "",
      unitate_masura: passedRow.unitate_masura,
      cost_unitar: passedRow.cost_unitar,
      limba: passedRow.limba,
    });
  };

  const handleSelectedDouble = (e, passedRow) => {
    e.stopPropagation();
    setSelectedEditInterior(null);
    setSelectedDeleteInterior(null);
    cancelDelete(e);
    cancelEdit(e);
    if (passedRow.definitie_id != null) {
      const data = {
        cod_transport: passedRow.cod_transport,
        cost_unitar: passedRow.cost_unitar,
        descriere: passedRow.descriere,
        descriere_fr: passedRow.descriere_fr,
      };
      console.log("passedRow", passedRow.definitie_id);
      handleSubmit(e, passedRow, passedRow.definitie_id, data);

      return;
    }
    setSelectedDouble(passedRow.id); // Toggle the dropdown based on the current state
    // console.log(passedRow.id, "selectedEdit");
    setFormData({
      cod_definitie: passedRow.cod_definitie,
      clasa_transport: passedRow.clasa_transport || "",
      transport: passedRow.transport || "",
      transport_fr: passedRow.transport_fr || "",
      descriere: passedRow.descriere || "",
      descriere_fr: passedRow.descriere_fr || "",
      unitate_masura: passedRow.unitate_masura,
      cost_unitar: passedRow.cost_unitar,
      limba: passedRow.limba,
    });
  };
  //copy mechanics
  const [selectedRows, setSelectedRows] = useState({});
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  //PASSING WITH ROWID . NOT ORIGINAL
  const handleRowClick = (row, event, rows) => {
    if (event.ctrlKey) {
      const newSelectedRows = { ...selectedRows };
      const rowId = row.index; // Assuming each row has an `id` field
      newSelectedRows[rowId] = !newSelectedRows[rowId]; // Toggle selection
      setSelectedRows(newSelectedRows);
    } else if (event.shiftKey && lastSelectedIndex !== null) {
      // Select all rows between the first selected and the current one
      const newSelectedRows = { ...selectedRows };
      const startIndex = Math.min(lastSelectedIndex, row.index);
      const endIndex = Math.max(lastSelectedIndex, row.index);
      for (let i = startIndex; i <= endIndex; i++) {
        const rowId = rows[i].index; // Assuming each row has an `id` field
        newSelectedRows[rowId] = true; // Mark the row as selected
      }
      setSelectedRows(newSelectedRows);
    } else {
      // If Shift key is not pressed, toggle the selected state of the clicked row
      const newSelectedRows = {};
      const rowId = row.index; // Assuming each row has an `id` field
      newSelectedRows[rowId] = !newSelectedRows[rowId]; // Toggle selection
      setSelectedRows(newSelectedRows);
    }
    setLastSelectedIndex(row.index);
  };

  const delPreviewTransport = (id) => {
    if (transport) {
      // console.log(open, id)
      setOpen((prev) => prev.filter((item) => item !== id));
      const updatedTransport = [...transport];
      const transportIndex = updatedTransport.findIndex(
        (item) => item.id === id && item.cod_definitie != null
      ); // sa fie diferit de manopere/material etc
      const addButtonIndex = updatedTransport.findIndex(
        (item) => item.id === `addButton-${id}`
      );
      // console.log("reteIDX ", manoperaIndex, "btnIDX ", addButtonIndex);
      if (
        addButtonIndex !== -1 &&
        transportIndex !== -1 &&
        addButtonIndex > transportIndex
      ) {
        updatedTransport.splice(
          transportIndex + 1,
          addButtonIndex - transportIndex
        );
        setTransport([...updatedTransport]);
      }
      return [updatedTransport, transportIndex];
    }
  };

  const fetchPreviewTransport = async (id, index, transportParam, row) => {
    try {
      const response = await api.get(`/Transport/getSpecificTransport/${id}`);
      const children = response.data.map((item) => ({
        ...item,
        limba: row.limba,
        transport: row.transport,
        transport_fr: row.transport_fr,
        unitate_masura: row.unitate_masura,
      }));
      // console.log(children, "and", open, id, index)

      // console.log(children)
      const addButton = {
        id: `addButton-${id}`,
        definitieIdForFetch: id,
      };

      const updatedTransport = transportParam
        ? [...transportParam]
        : [...transport];
      updatedTransport.splice(index + 1, 0, ...children, addButton);

      setOpen((prev) => [...prev, id]);
      setTransport(updatedTransport);
    } catch (err) {
      console.error("Failed to fetch children:", err);
    }
  };

  const toggleDropdown = (e, id, index, row) => {
    e.stopPropagation();
    setSelectedEditInterior(null);
    setSelectedDeleteInterior(null);
    // setSelectedDoubleInterior(null);
    // console.log("id ", id, "index ", index)
    if (open.includes(id)) {
      delPreviewTransport(id);
      return;
    }
    fetchPreviewTransport(id, index, null, row);
  };

  const handleSubmit = async (e, row, parentId, data = null) => {
    e.preventDefault();
    // console.log(parentId);
    const form = {};
    if (!data) {
      form.cod_transport = "000000";
      form.descriere = "";
      form.descriere_fr = "";
      form.cost_unitar = "0.000";
    } else {
      form.cod_transport = data.cod_transport;
      form.descriere = data.descriere;
      form.descriere_fr = data.descriere_fr;
      form.cost_unitar = data.cost_unitar;
    }
    try {
      const response = await api.post("/Transport/SetTransport", {
        form: form,
        parentId: parentId,
      });
      const insertedId = response.data.id; // Make sure backend returns { insertId }

      const parent = transport.find(
        (item) => item.id == parentId && item.cod_definitie != null
      );
      if (!parent) return;

      const newChild = {
        id: insertedId,
        definitie_id: parentId,
        cod_transport: form.cod_transport,
        descriere: form.descriere,
        descriere_fr: form.descriere_fr,
        cost_unitar: form.cost_unitar,
        limba: parent.limba,
        transport: parent.transport,
        transport_fr: parent.transport_fr,
        unitate_masura: parent.unitate_masura,
      };
      const updated = [...transport];
      if (!data) updated.splice(row.index, 0, newChild);
      // ⬅️ Insert right before the addButton
      else {
        const addButtonIndex = updated.findIndex(
          (item) => item.id === `addButton-${parentId}`
        );
        if (addButtonIndex !== -1) {
          updated.splice(addButtonIndex, 0, newChild);
        } else {
          updated.push(newChild); // If no add button found, just append
        }
      }
      setTransport(updated);
      setSelectedEditInterior(insertedId);
      setCodTransport(form.cod_transport);
      setCostTransport(form.cost_unitar);
      setDescriereTransport(form.descriere);
      setDescriereTransportFR(form.descriere_fr);
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const handleCopy = () => {
    const rows = table.getRowModel().rows; // Access rows directly from the table
    const selectedRowIds = Object.keys(selectedRows).filter(
      (rowId) => selectedRows[rowId]
    );

    if (selectedRowIds.length === 0) {
      return;
    }

    const copiedData = selectedRowIds
      .map((rowId) => {
        const row = rows.find((r) => r.index === parseInt(rowId)); // Find row by rowId
        if (!row) return ""; // If row not found, return empty string

        const rowData = columns.map((column) => {
          let cellValue = row.getValue(column.accessorKey) || ""; // Get the cell value
          // If the cell value is a string, escape double quotes and wrap in quotes if it contains line breaks
          if (typeof cellValue === "string") {
            cellValue = cellValue.replace(/"/g, '""'); // Escape double quotes
            if (cellValue.includes("\n")) {
              cellValue = `"${cellValue}"`; // Wrap in quotes if it contains line breaks
            }
          }
          return cellValue;
        });

        return rowData.join("\t"); // Join the row data with a tab
      })
      .join("\n"); // Join all rows with a newline

    // Copy the TSV formatted data to the clipboard
    navigator.clipboard
      .writeText(copiedData)
      .then(() => {
        console.log("Selected rows copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  const handleCtrlC = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "c") {
      console.log("Ctrl + C was pressed!");
      handleCopy();
    }
  };

  //Handle Click Outside!
  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleCtrlC);
    return () => {
      document.removeEventListener("keydown", handleCtrlC);
    };
  }, [selectedRows]);

  const handleClickOutside = (event) => {
    if (!event.target.closest(".only-copy")) {
      setSelectedRows({}); // Close the dropdown if click is outside
      setLastSelectedIndex(null);
    }
    if (!event.target.closest(".dropdown-container")) {
      setSelectedEditInterior(null); // Close the edit input if click is outside
      setSelectedDeleteInterior(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "Dropdown",
        header: "",
        cell: ({ row, getValue, cell }) => (
          <div
            onClick={(e) =>
              toggleDropdown(
                e,
                cell.row.original.id,
                cell.row.index,
                cell.row.original
              )
            } // Pass both id and index
            className="flex justify-center h-full overflow-hidden w-full cursor-pointer items-center"
          >
            <FontAwesomeIcon
              className={`text-center 
                                        ${open.includes(cell.row.original.id)
                  ? "rotate-90"
                  : ""
                } text-xl`}
              icon={faChevronRight}
            />
          </div>
        ),
      },
      {
        accessorKey: "limba",
        header: "Limba",
        cell: ({ getValue, row }) => (
          <div className="w-full flex justify-center  font-bold">
            {getValue()}
          </div>
        ), // Display default value if the value is empty or undefined
        size: 50,
      },
      {
        accessorKey: "cod_definitie",
        header: (
          <div
            onClick={() => console.log(transport)}
            className="flex items-center w-[95%] justify-between text-black "
          >
            <span>Cod</span>
            {/* <FontAwesomeIcon
            //   onClick={() =>
            //     setAscendent((prev) => (prev == false ? true : false))
            //   }
              className="text-xl border border-black p-2  rounded-full  cursor-pointer"
            //   icon={!ascendentCOR ? faArrowUpAZ : faArrowDownAZ}
            /> */}
          </div>
        ),
        cell: ({ getValue, row }) => {
          const isEditable =
            row.original.id == selectedEditInterior &&
            row.original.definitie_id != null;

          return (
            <TextAreaCell
              rowId={row.original.id}
              whatIs={row.original.whatIs || "Reteta"}
              initialValue={getValue() || row.original.cod_transport || ""}
              isEditable={isEditable}
              onEdit={handleCodChange}
              bold={true}
              rows={1}
              padding={true}
            />
          );
        },
        size: 100,
      },
      { accessorKey: "clasa_transport", header: "Clasă", size: 100 },
      {
        accessorKey: "transport",
        header: (
          <div className="flex items-center w-[95%] justify-between text-black ">
            <span>Transport</span>
            <FontAwesomeIcon
              onClick={() =>
                setAscendent((prev) => (prev == false ? true : false))
              }
              className="text-xl border border-black p-2  rounded-full  cursor-pointer"
              icon={!ascendent ? faArrowUpAZ : faArrowDownAZ}
            />
          </div>
        ),
        cell: ({ getValue, row }) =>
        (
          <div className="">{localLimba === "FR" ? row.original.transport_fr || "..." : row.original.transport || "..."}</div>
        ),
        size: 300,
      },
      {
        accessorKey: "descriere",
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
        cell: ({ getValue, row }) => {
          const isEditable =
            row.original.id === selectedEditInterior &&
            row.original.definitie_id != null;

          if (localLimba === "FR" && !isEditable) {
            return (
              <div className="flex items-center gap-2">
                {row.original.descriere_fr || "..."}
              </div>
            );
          }

          return (
            <TextAreaCell
              rowId={row.original.id}
              whatIs="descriere"
              isEditable={isEditable}
              onEdit={(id, field, val, lang) => {
                if (lang === "RO") {
                  handleDescriereChange(id, field, val);
                } else {
                  handleDescriereFRChange(id, field, val);
                }
              }}
              valueRO={row.original.descriere || ""}
              valueFR={row.original.descriere_fr || ""}
              showToggle={true}
            />
          );
        },
        size: 300,
      },
      { accessorKey: "unitate_masura", header: "Unitate", size: 100 },
      {
        accessorKey: "cost_unitar",
        header: "Cost unitar",
        cell: ({ getValue, row }) => {
          const isEditable =
            row.original.id == selectedEditInterior &&
            row.original.definitie_id != null;

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
        size: 70,
      },
      {
        accessorKey: "threeDots",
        header: "Opțiuni",
        cell: ({ row }) => (
          <div className="absolute group w-full">
            {/* Trigger sau Confirm */}
            <div className="w-full select-none flex items-center justify-center">
              {(selectedDeleteInterior === row.original.id ||
                selectedEditInterior === row.original.id) &&
                row.original.definitie_id != null ? (
                <button
                  onClick={() => {
                    if (selectedDeleteInterior === row.original.id)
                      handleAcceptDelete(row.original);
                    else if (selectedEditInterior === row.original.id)
                      handleAcceptEdit(row.original);
                  }}
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

            {/* Dropdown doar dacă NU e în confirm mode */}
            {selectedDeleteInterior !== row.original.id &&
              selectedEditInterior !== row.original.id && (
                <div className="absolute z-10 left-0 -translate-x-[40%] bg-white border shadow-lg rounded-md w-40 p-2 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 text-lg font-semibold text-gray-700">
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
                    onClick={(e) => handleSelectedForDelete(e, row.original)}
                    className="cursor-pointer w-full flex justify-start items-center rounded-md px-2 py-2 hover:bg-red-100 hover:bg-opacity-90"
                  >
                    <FontAwesomeIcon
                      icon={faTrashCan}
                      className="mr-2 text-red-400"
                    />
                    Delete
                  </div>
                </div>
              )}
          </div>
        ),
        meta: {
          style: {
            textAlign: "center", // Center the icon
            padding: "0", // Reduce padding to minimize the space
          },
        },
      },
    ],
    [
      selectedDelete,
      selectedDeleteInterior,
      selectedEdit,
      selectedEditInterior,
      selectedDouble,
      ascendent,
      open,
      localLimba,
      transport,
    ]
  );

  const table = useReactTable({
    data: transport,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    state: {
      columnResizing: {},
    },
  });

  return (
    <>
      {transport && (
        <div className="px-6 pb-4 scrollbar-webkit text-white h-full flex flex-col justify-between">
          <div className="overflow-auto h-full  scrollbar-webkit">
            <table className="w-full   border-separate border-spacing-0 ">
              <thead className="top-0 w-full sticky bg-white  z-10 ">
                <tr className="text-black">
                  <th
                    className="border-b border-r border-black bg-white"
                    colSpan={1}
                  ></th>
                  <th className="border-b border-r bg-white border-black">
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
                  <th className="border-b border-r bg-white border-black">
                    <input
                      type="text"
                      name="cod_transport"
                      value={filters.cod_transport}
                      onChange={handleInputChange}
                      className="p-2 w-full outline-none py-3
                                            
                                            "
                      placeholder="Filtru Cod"
                    />
                  </th>
                  <th className="border-b border-r bg-white border-black">
                    <input
                      type="text"
                      name="clasa_transport"
                      value={filters.clasa_transport}
                      onChange={handleInputChange}
                      className="p-2 w-full outline-none py-3
                                            
                                            "
                      placeholder="Filtru Clasă"
                    />
                  </th>
                  <th className="border-b border-r bg-white border-black">
                    <input
                      type="text"
                      name="transport"
                      value={filters.transport}
                      onChange={handleInputChange}
                      className="p-2 w-full outline-none  py-3"
                      placeholder="Filtru Transport"
                    />
                  </th>
                  <th
                    className=" bg-white border-b border-r border-black"
                    colSpan={3}
                  >
                    <div className=" flex  justify-evenly items-center">
                      <div className="flex items-center">
                        <p className="px-2">Arată</p>
                        <input
                          className="border border-black p-1 w-12 text-center rounded-lg"
                          type="text"
                          onChange={(e) => handleLimit(e)}
                          value={limit}
                          name=""
                          id=""
                        />
                        <p className="px-2">rânduri</p>
                      </div>
                      <div className="flex justify-center  items-center">
                        <div
                          onClick={() =>
                            setAscendentTime((prev) =>
                              prev == null ? true : prev == true ? false : null
                            )
                          }
                          className="bg-blue-500 rounded-xl px-4 hover:bg-blue-600 hover:cursor-pointer flex gap-2 p-2 items-center justify-center"
                        >
                          <span className="font-semibold">Data</span>
                          <FontAwesomeIcon
                            className="text-white text-lg"
                            icon={
                              ascendentTime == null
                                ? faSort
                                : ascendentTime == true
                                  ? faSortDown
                                  : faSortUp
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </th>
                  <th
                    className="border-b border-r border-black bg-white"
                    colSpan={1}
                  >
                  </th>
                </tr>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="bg-white text-black text-left  font-bold "
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`relative border-b-2 border-r border-black   bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""
                          } `}
                        style={{
                          width:
                            header.column.id === "threeDots"
                              ? "4rem"
                              : header.column.id === "Dropdown"
                                ? "4rem"
                                : header.column.id === "logo"
                                  ? "3rem"
                                  : `${header.getSize()}px`, // Enforce width for "Options"
                          minWidth:
                            header.column.id === "threeDots"
                              ? "4rem"
                              : header.column.id === "Dropdown"
                                ? header.column.id === "logo"
                                  ? "35px"
                                  : "4rem"
                                : "", // Ensure no shrinkage
                          maxWidth:
                            header.column.id === "threeDots"
                              ? "4rem"
                              : header.column.id === "Dropdown"
                                ? header.column.id === "logo"
                                  ? "35px"
                                  : "4rem"
                                : "", // Ensure no expansion
                        }}
                      >
                        <div
                          onMouseDown={header.getResizeHandler()}
                          className={`absolute top-0 right-0 h-full w-2 bg-blue-300 cursor-pointer opacity-0 active:opacity-100 hover:opacity-100 transition-opacity duration-200 ${header.column.id === "threeDots" ? "hidden" : ""
                            }`}
                        ></div>
                        {header.column.columnDef.header}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              {transport.length == 0 ? (
                <tbody className="relative z-0">
                  <tr>
                    <td className="bg-white text-black h-12" colSpan={9}>
                      <div className=" flex justify-center items-center w-full text-lg font-semibold h-full">
                        Nici un rezultat
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="dropdown-container relative z-0">
                  {table.getRowModel().rows.map((row, index, rows) =>
                    row.original.definitieIdForFetch != null ? (
                      <tr key={row.original.id}>
                        <td></td>
                        <td
                          onClick={(e) =>
                            handleSubmit(
                              e,
                              row,
                              row.original.definitieIdForFetch
                            )
                          }
                          className="bg-green-400 p-1 px-3 hover:bg-green-500 cursor-pointer border-b border-r border-black text-black"
                          colSpan={8}
                        >
                          <div className="flex font-bold text-center justify-center items-center gap-2">
                            <p className=" text-center">Adauga Obiecte</p>
                            <FontAwesomeIcon
                              className="text-black  text-center text-lg"
                              icon={faPlus}
                            />
                          </div>
                        </td>
                      </tr>
                    ) : row.original.cod_definitie == null ? (
                      <React.Fragment key={row.id}>
                        <tr
                          className={` 
                                                                             text-black ${selectedEditInterior ==
                              row
                                .original
                                .id
                              ? "dropdown-container"
                              : ""
                            }`}
                        >
                          {row.getVisibleCells().map((cell) =>
                            cell.column.id == "Dropdown" ? (
                              <td key={cell.id}></td>
                            ) : (
                              <td
                                style={cell.column.columnDef.meta?.style} // Apply the custom style
                                key={cell.id}
                                className={` 
                                                                                                     ${row
                                    .original
                                    .id ===
                                    selectedDeleteInterior
                                    ? "bg-red-300"
                                    : "bg-white"
                                  }
                                                                                                     border-b border-r break-words max-w-72 whitespace-pre-line   relative border-black p-2 px-3 `}
                              >
                                <div className="h-full w-full overflow-hidden ">
                                  <div className="max-h-12 h-12   grid grid-cols-1 items-center  break-words whitespace-pre-line   overflow-auto  scrollbar-webkit">
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </div>
                                </div>
                              </td>
                            )
                          )}
                        </tr>
                      </React.Fragment>
                    ) : (
                      <tr
                        key={row.id}
                        onClick={(event) => {
                          if (event.target.closest(".only-copy")) {
                            if (!selectedDelete && !selectedEdit) {
                              handleRowClick(row, event, rows);
                            }
                          }
                        }}
                        className={` text-black ${row.original.id === selectedDelete
                          ? "bg-red-300"
                          : row.original.id === selectedEdit
                            ? "bg-green-300"
                            : row.original.id === selectedDouble
                              ? "bg-amber-300"
                              : selectedRows[row.index]
                                ? "bg-blue-200 hover:bg-blue-300"
                                : "bg-[rgb(255,255,255,0.80)] hover:bg-[rgb(255,255,255,0.6)]"
                          }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={` ${cell.column.id == "limba" ? "only-copy select-none " : ""}  border-b border-r break-words max-w-72 whitespace-pre-line  relative border-black p-2 px-3`}
                            style={cell.column.columnDef.meta?.style} // Apply the custom style
                          >
                            <div className="h-full w-full overflow-hidden ">
                              <div className="max-h-12 h-12 w-full  grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                </tbody>
              )}
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="mt-4 flex items-center justify-between">
            <button
              className="p-2 min-w-24 bg-white text-black rounded-lg"
              onClick={() => setPage(-1)}
              disabled={currentOffset === 0}
            >
              Înapoi
            </button>
            <span className="">
              Pagina{" "}
              <span className=" font-semibold tracking-widest">
                {currentOffset + 1}/
                {Math.ceil(totalItems / limit) == Infinity
                  ? Math.ceil(totalItems / 10)
                  : Math.ceil(totalItems / limit)}
              </span>
            </span>
            <button
              className="p-2 min-w-24 bg-white text-black rounded-lg"
              onClick={() => setPage(1)}
              disabled={currentOffset + 1 >= Math.ceil(totalItems / limit)}
            >
              Înainte
            </button>
          </div>
        </div>
      )}
    </>
  );
}
