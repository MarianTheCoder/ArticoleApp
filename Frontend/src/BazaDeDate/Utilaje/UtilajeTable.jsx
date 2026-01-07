import React, { useEffect, useMemo, useState } from "react";
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
  faCancel,
  faChevronRight,
  faCopy,
  faEllipsis,
  faFileCirclePlus,
  faL,
  faLanguage,
  faPenToSquare,
  faPlus,
  faSort,
  faSortDown,
  faSortUp,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import photoApi from "../../api/photoAPI";
import { useRef } from "react";
import defaultPhoto from "../../assets/no-image-icon.png";
import TextAreaCell from "../Santiere/Ofertare/TextareaCell";
import CostInputCell from "../Santiere/Ofertare/CostCell";
import { OverflowPopover } from "../Santiere/OverflowPopover";

export default function ManoperaTable({
  reloadKey,
  selectedDouble,
  cancelDouble,
  setSelectedDouble,
  setSelectedFile,
  setPreview,
  selectedDelete,
  setSelectedDelete,
  setSelectedEdit,
  setFormData,
  selectedEdit,
  cancelEdit,
  cancelDelete,
}) {
  const [utilaje, setUtilaje] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [ascendent, setAscendent] = useState(false);
  const [ascendentTime, setAscendentTime] = useState(null);

  // sa vedem ce utilaje au limba schimbata
  const [localLimba, setLocalLimba] = useState("RO");
  const [open, setOpen] = useState([]);

  const [filters, setFilters] = useState({
    limba: "",
    cod_utilaj: "",
    descriere_utilaj: "",
    utilaj: "",
    clasa_utilaj: "",
  });

  const [selectedFileInterior, setSelectedFileInterior] = useState(null);
  const [previewInterior, setPreviewInterior] = useState(defaultPhoto);

  //editare smechere
  const [furnizor, setFurnizor] = useState(0);
  const [costUtilaj, setCostUtilaj] = useState(0);
  const [costAmortizareUtilaj, setCostAmortizareUtilaj] = useState(0);
  const [statusUtilaj, setStatusUtilaj] = useState("Ca nou");
  const [codUtilaj, setCodUtilaj] = useState(0);
  const [descriereUtilaj, setDescriereUtilaj] = useState("");
  const [descriereUtilajFR, setDescriereUtilajFR] = useState("");
  const [cantitateUtilaj, setCantitateUtilaj] = useState(0);

  const editedFurnizorRef = useRef(furnizor);
  const editedCostsRef = useRef(costUtilaj);
  const editedCodRef = useRef(codUtilaj);
  const editedDescriereRef = useRef(descriereUtilaj);
  const editedDescriereFRRef = useRef(descriereUtilajFR);
  const editedCostAmortizareRef = useRef(costAmortizareUtilaj);
  const editedStatusRef = useRef(statusUtilaj);
  const cantitateRef = useRef(cantitateUtilaj);

  // State for selected interior
  const [selectedEditInterior, setSelectedEditInterior] = useState(null);
  const [selectedDeleteInterior, setSelectedDeleteInterior] = useState(null);
  // const [selectedDoubleInterior, setSelectedDoubleInterior] = useState(null);

  const fileInputRef = useRef(null);

  //to see the updated cantitate and costs in the function
  useEffect(() => {
    editedFurnizorRef.current = furnizor;
  }, [furnizor]);

  useEffect(() => {
    editedCostsRef.current = costUtilaj;
  }, [costUtilaj]);

  useEffect(() => {
    editedCodRef.current = codUtilaj;
  }, [codUtilaj]);

  useEffect(() => {
    editedDescriereRef.current = descriereUtilaj;
  }, [descriereUtilaj]);

  useEffect(() => {
    editedDescriereFRRef.current = descriereUtilajFR;
  }, [descriereUtilajFR]);

  useEffect(() => {
    editedCostAmortizareRef.current = costAmortizareUtilaj;
  }, [costAmortizareUtilaj]);

  useEffect(() => {
    editedStatusRef.current = statusUtilaj;
  }, [statusUtilaj]);

  useEffect(() => {
    cantitateRef.current = cantitateUtilaj;
  }, [cantitateUtilaj]);
  //
  //

  const handleFurnizorChange = (id, whatIs, value) => {
    setFurnizor(value);
  };
  const handleCostChange = (id, whatIs, value) => {
    setCostUtilaj(value);
  };
  const handleCodChange = (id, whatIs, value) => {
    setCodUtilaj(value);
  };
  const handleDescriereChange = (id, whatIs, value) => {
    setDescriereUtilaj(value);
  };
  const handleDescriereFRChange = (id, whatIs, value) => {
    setDescriereUtilajFR(value);
  };
  const handleCostAmortizareChange = (id, whatIs, value) => {
    setCostAmortizareUtilaj(value);
  };
  const handleStatusChange = (id, whatIs, value) => {
    // console.log(value);
    setStatusUtilaj(value);
  };
  const handleCantitateChange = (id, whatIs, value) => {
    setCantitateUtilaj(value);
  };

  const fetchManopere = async (offset, limit) => {
    setOpen([]);
    try {
      const response = await api.get("/Utilaje/api/utilajeDef", {
        params: {
          offset,
          limit,
          cod: filters.cod_utilaj,
          limba: filters.limba,
          descriere_utilaj: filters.descriere_utilaj, // Pass cod_COR as a query parameter
          utilaj: filters.utilaj, // Add any other filters here
          clasa_utilaj: filters.clasa_utilaj, // Add any other filters here
          asc_utilaj: ascendent,
          dateOrder: ascendentTime,
        },
      });
      if (response.data.data.length == 0) {
        setUtilaje([]);
        setTotalItems(0);
        setCurrentOffset(0);
        return;
      }
      if (offset >= Math.ceil(response.data.totalItems / limit)) {
        fetchManopere(0, limit);
      } else {
        setUtilaje(response.data.data);
        setTotalItems(response.data.totalItems);
        setCurrentOffset(response.data.currentOffset);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchManopere(currentOffset, limit);
  }, [reloadKey]);

  useEffect(() => {
    const getData = setTimeout(() => {
      if (limit == "" || limit == 0) fetchManopere(0, 10);
      else fetchManopere(0, limit);
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
      // Call fetchManopere with the new offset
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

  //handle selected edit/delete
  const handleAcceptDelete = async (row) => {
    try {
      const response = await api.delete(`/Utilaje/api/utilaj/${row.id}`);
      // console.log("Deleted:", response.data);

      // Update state to remove the deleted row from UI
      setUtilaje((prev) =>
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
      console.error("Error deleting Material:", err);
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
    const pret_utilaj = parseFloat(editedCostsRef.current);
    const codUtilaj = editedCodRef.current;
    const descriere = editedDescriereRef.current;
    const descriere_fr = editedDescriereFRRef.current;
    const furnizor = editedFurnizorRef.current;
    const cost_amortizare = parseFloat(editedCostAmortizareRef.current);
    const status_utilaj = editedStatusRef.current;
    const cantitate_utilaj = cantitateRef.current;

    const formData = new FormData();

    formData.append("id", row.id);
    formData.append("definitie_id", row.definitie_id);
    formData.append("pret_utilaj", pret_utilaj);
    formData.append("cod_utilaj", codUtilaj);
    formData.append("furnizor", furnizor);
    formData.append("descriere", descriere);
    formData.append("descriere_fr", descriere_fr);
    formData.append("status_utilaj", status_utilaj);
    formData.append("cost_amortizare", cost_amortizare);
    formData.append("cantitate", cantitate_utilaj);

    // ✅ Dacă a fost selectată o poză nouă, o trimitem
    if (selectedFileInterior) {
      formData.append("poza", selectedFileInterior);
    }

    try {
      const response = await api.put("/Utilaje/api/editUtilaj", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newPhoto = response.data.photoUrl || row.photoUrl;

      setUtilaje((prev) =>
        prev.map((item) =>
          item.id === row.id && item.definitie_id != null
            ? {
              ...item,
              pret_utilaj: pret_utilaj.toFixed(3),
              cost_amortizare: cost_amortizare.toFixed(3),
              cod_utilaj: codUtilaj,
              status_utilaj: status_utilaj,
              furnizor,
              descriere,
              descriere_fr,
              photoUrl: newPhoto,
              cantitate: cantitate_utilaj,
            }
            : item
        )
      );
    } catch (err) {
      console.error("Error updating Material row:", err);
    } finally {
      setSelectedEditInterior(null);
      setSelectedFileInterior(null); // Reset the selected file after upload
      setPreviewInterior(defaultPhoto); // Reset the preview image
    }
  };

  const handleSelectedForEdit = (e, passedRow) => {
    e.stopPropagation();
    // setSelectedDoubleInterior(null);
    setSelectedDeleteInterior(null);
    cancelDelete(e);
    cancelDouble(e);
    if (passedRow.definitie_id != null) {
      setPreviewInterior(`${photoApi}/${passedRow.photoUrl}`);
      setSelectedFileInterior(null);
      setSelectedEditInterior(passedRow.id);
      //selectedEditInterior is used to show the edit input
      setCodUtilaj(passedRow.cod_utilaj);
      setCantitateUtilaj(passedRow.cantitate);
      setFurnizor(passedRow.furnizor);
      setCostUtilaj(passedRow.pret_utilaj);
      setStatusUtilaj(passedRow.status_utilaj);
      setCodUtilaj(passedRow.cod_utilaj);
      setDescriereUtilaj(passedRow.descriere);
      setDescriereUtilajFR(passedRow.descriere_fr);

      return;
    }

    setSelectedEdit(passedRow.id); // Toggle the dropdown based on the current state
    setFormData({
      limba: passedRow.limba,
      clasa_utilaj: passedRow.clasa_utilaj,
      cod_definitie: passedRow.cod_definitie,
      utilaj: passedRow.utilaj,
      utilaj_fr: passedRow.utilaj_fr,
      descriere: passedRow.descriere,
      descriere_fr: passedRow.descriere_fr,
      unitate_masura: passedRow.unitate_masura,
      cost_amortizare: passedRow.cost_amortizare,
      pret_utilaj: passedRow.pret_utilaj,
    });
    setPreview(`${photoApi}/${passedRow.photoUrl}`);
    setSelectedFile(null);
    setSelectedDelete(null);
  };

  const handleSelectedDouble = async (e, passedRow) => {
    e.stopPropagation();
    setSelectedEditInterior(null);
    setSelectedDeleteInterior(null);
    cancelDelete(e);
    cancelEdit(e);
    try {
      const imageUrl = `${photoApi}/${passedRow.photoUrl}`;
      const response = await api.get(imageUrl, { responseType: "blob" });

      const mimeType = response.data.type; // ex: image/jpeg
      const extension = mimeType === "image/png" ? ".png" : ".jpg";

      const fileName = passedRow.photoUrl.split("/").pop();
      const baseName = fileName.substring(0, 20).replace(/\.[^/.]+$/, ""); // elimină extensia existentă

      const finalName = baseName + extension;

      const file = new File([response.data], finalName, {
        type: mimeType,
      });

      if (passedRow.definitie_id != null) {
        setSelectedFileInterior(null); // Reset the selected file after upload
        setPreviewInterior(defaultPhoto); // Reset the preview image
        const data = {
          cod_utilaj: passedRow.cod_utilaj,
          furnizor: passedRow.furnizor,
          pret_utilaj: passedRow.pret_utilaj,
          cost_amortizare: passedRow.cost_amortizare,
          descriere: passedRow.descriere,
          descriere_fr: passedRow.descriere_fr,
          status_utilaj: passedRow.status_utilaj,
          cantitate: passedRow.cantitate,
        };
        // console.log("passedRow", passedRow.definitie_id);
        handleSubmit(e, passedRow, passedRow.definitie_id, data, file);

        return;
      }

      setSelectedDouble(passedRow.id); // Toggle the dropdown based on the current state
      setFormData({
        limba: passedRow.limba,
        clasa_utilaj: passedRow.clasa_utilaj,
        cod_definitie: passedRow.cod_definitie,
        utilaj: passedRow.utilaj,
        utilaj_fr: passedRow.utilaj_fr,
        descriere: passedRow.descriere,
        descriere_fr: passedRow.descriere_fr,
        unitate_masura: passedRow.unitate_masura,
        cost_amortizare: passedRow.cost_amortizare,
        pret_utilaj: passedRow.pret_utilaj,
      });
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    } catch (error) {
      console.log("Error in duplicating", error);
    }
  };

  const delPreviewUtilaj = (id) => {
    if (utilaje) {
      // console.log(open, id)
      setOpen((prev) => prev.filter((item) => item !== id));
      const updatedUtilaje = [...utilaje];
      const utilajIndex = updatedUtilaje.findIndex(
        (item) => item.id === id && item.cod_definitie != null
      ); // sa fie diferit de materiale/material etc
      const addButtonIndex = updatedUtilaje.findIndex(
        (item) => item.id === `addButton-${id}`
      );
      // console.log("reteIDX ", utilajIndex, "btnIDX ", addButtonIndex);
      if (
        addButtonIndex !== -1 &&
        utilajIndex !== -1 &&
        addButtonIndex > utilajIndex
      ) {
        updatedUtilaje.splice(utilajIndex + 1, addButtonIndex - utilajIndex);
        setUtilaje([...updatedUtilaje]);
      }
      return [updatedUtilaje, utilajIndex];
    }
  };

  const fetchPreviewUtilaj = async (id, index, utilajeParam, row) => {
    try {
      const response = await api.get(`/Utilaje/api/getSpecificUtilaj/${id}`);
      const children = response.data.map((item) => ({
        ...item,
        limba: row.limba,
        clasa_utilaj: row.clasa_utilaj,
        utilaj: row.utilaj,
        utilaj_fr: row.utilaj_fr,
        unitate_masura: row.unitate_masura,
      }));
      // console.log(children, "and", open, id, index)

      // console.log(children)
      const addButton = {
        id: `addButton-${id}`,
        definitieIdForFetch: id,
      };

      const updatedUtilaje = utilajeParam ? [...utilajeParam] : [...utilaje];
      updatedUtilaje.splice(index + 1, 0, ...children, addButton);

      setOpen((prev) => [...prev, id]);
      setUtilaje(updatedUtilaje);
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
      delPreviewUtilaj(id);
      return;
    }
    fetchPreviewUtilaj(id, index, null, row);
  };

  const handleSubmit = async (e, row, parentId, data = null, file = null) => {
    e.preventDefault();
    // console.log(parentId);
    const form = {};
    // console.log(data);
    if (!data) {
      form.cod_utilaj = "000000";
      form.furnizor = "Inexistent";
      form.descriere = "";
      form.descriere_fr = "";
      form.pret_utilaj = "0.000";
      form.cost_amortizare = "0.0000";
      form.status_utilaj = "Ca nou";
      form.cantitate = "0.000";
    } else {
      form.cod_utilaj = data.cod_utilaj || "000000";
      form.furnizor = data.furnizor || "Inexistent";
      form.descriere = data.descriere || "";
      form.descriere_fr = data.descriere_fr || "";
      form.pret_utilaj = data.pret_utilaj || "0.000";
      form.cost_amortizare = data.cost_amortizare || "0.0000";
      form.status_utilaj = data.status_utilaj || "Ca nou";
      form.cantitate = data.cantitate || "0.000";
    }
    try {

      const parent = utilaje.find(
        (item) => item.id == parentId && item.cod_definitie != null
      );
      if (!parent) return;

      const formData = new FormData();

      // 🧠 Adaugă toți câmpii în formData
      formData.append("id", parentId);
      formData.append("cod_utilaj", form.cod_utilaj);
      formData.append("furnizor", form.furnizor);
      formData.append("descriere", form.descriere);
      formData.append("descriere_fr", form.descriere_fr);
      formData.append("pret_utilaj", form.pret_utilaj);
      formData.append("cost_amortizare", form.cost_amortizare);
      formData.append("status_utilaj", form.status_utilaj);
      formData.append("cantitate", form.cantitate);

      if (file != null && data) {
        formData.append("poza", file);
        setSelectedFileInterior(file);
        setPreviewInterior(URL.createObjectURL(file));
      }
      else {
        setPreviewInterior(`${photoApi}/${parent.photoUrl.replace(/\\/g, "/")}`);
      }

      const response = await api.post("/Utilaje/api/setUtilaj", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const insertedId = response.data.id;

      const newChild = {
        id: insertedId,
        definitie_id: parentId,
        cod_utilaj: form.cod_utilaj,
        furnizor: form.furnizor,
        descriere: form.descriere,
        descriere_fr: form.descriere_fr,
        pret_utilaj: form.pret_utilaj,
        cost_amortizare: form.cost_amortizare,
        photoUrl: response.data.photoUrl, // Use the parent's photoUrl
        limba: parent.limba,
        clasa_utilaj: parent.clasa_utilaj,
        utilaj: parent.utilaj,
        utilaj_fr: parent.utilaj_fr,
        cantitate: form.cantitate,
        unitate_masura: parent.unitate_masura,
        status_utilaj: form.status_utilaj,
      };
      const updated = [...utilaje];
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

      setUtilaje(updated);
      setSelectedEditInterior(insertedId); // Set the selectedEditInterior to the new child's id
      setCodUtilaj(form.cod_utilaj);
      setFurnizor(form.furnizor);
      setCostUtilaj(form.pret_utilaj);
      setCantitateUtilaj(form.cantitate);
      setCostAmortizareUtilaj(form.cost_amortizare);
      setDescriereUtilaj(form.descriere);
      setDescriereUtilajFR(form.descriere_fr);
      setStatusUtilaj(form.status_utilaj);
      //
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  //Handle Photo preview and saving
  const handleFileChange = (e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    // console.log(file);
    if (file) {
      setSelectedFileInterior(file);
      setPreviewInterior(URL.createObjectURL(file)); // Show image preview
    }
  };

  const handleDrop = (e) => {
    // console.log("dropped");
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    // console.log("Dropped file:", file);
    // console.log(file);
    if (file && file.type.startsWith("image/")) {
      setSelectedFileInterior(file);
      setPreviewInterior(URL.createObjectURL(file));
    }
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  //copy mechanics
  const [selectedRows, setSelectedRows] = useState({});
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  //PASSING WITH ROWID . NOT ORIGINAL
  const handleRowClick = (row, event, rows) => {
    // Check if Shift key is pressed
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
                                                ${open.includes(
                cell.row.original.id
              )
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
            {" "}
            {getValue()}
          </div>
        ), // Display default value if the value is empty or undefined
        size: 80,
      },
      {
        accessorKey: "photoUrl",
        header: "Poză",
        cell: ({ getValue, row }) => {
          const isEditable =
            row.original.id == selectedEditInterior &&
            row.original.definitie_id != null;

          return !isEditable ? (
            <div className="flex justify-center overflow-hidden w-full h-full items-center">
              <img
                src={`${photoApi}/${getValue()}`}
                alt="Product"
                className="h-full w-auto max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex justify-center overflow-hidden w-full h-full items-center">
              <img
                onClick={(e) => handleButtonClick(e)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e)}
                className="h-full w-auto max-h-full cursor-pointer max-w-full object-contain"
                src={previewInterior == null ? "" : previewInterior}
              ></img>

              <input
                ref={fileInputRef}
                id="hiddenFileInput"
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          );
        },
        size: 100,
      },
      { accessorKey: "clasa_utilaj", header: "Clasă", size: 100 },
      {
        accessorKey: "furnizor",
        header: (
          <div
            onClick={() => console.log(utilaje)}
            className="flex items-center w-[95%] justify-between text-black "
          >
            <span>Furnizor</span>
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
              initialValue={getValue() || row.original.furnizor || ""}
              isEditable={isEditable}
              onEdit={handleFurnizorChange}
              bold={true}
              rows={1}
              padding={true}
            />
          );
        },
        size: 120,
      },
      {
        accessorKey: "cod_definitie",
        header: (
          <div
            // onClick={() => console.log(manopere)}
            className="flex items-center w-[95%] justify-between text-black "
          >
            <span>Cod</span>
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
              initialValue={getValue() || row.original.cod_utilaj || ""}
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
      {
        accessorKey: "utilaj",
        header: (
          <div className="flex items-center w-[95%] justify-between text-black ">
            <span>Utilaj</span>
            <FontAwesomeIcon
              onClick={() =>
                setAscendent((prev) => (prev == false ? true : false))
              }
              className="text-base border border-black p-2  rounded-full  cursor-pointer"
              icon={!ascendent ? faArrowUpAZ : faArrowDownAZ}
            />
          </div>
        ),
        cell: ({ getValue, row }) => (
          row.original.cod_definitie ?
            <OverflowPopover text={localLimba === 'RO' ? row.original.denumire : row.original.denumire_fr} maxLines={4} />
            :
            <OverflowPopover text={localLimba === 'RO' ? row.original.denumire_fr : row.original.denumire} maxLines={3} />
        ),
        size: 200,
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

          if (localLimba === 'FR' && !isEditable) {
            return (
              <div className="flex items-center gap-2">
                <OverflowPopover text={row.original.descriere_fr || "..."} maxLines={row.original.cod_definitie ? 4 : 3} />
              </div>
            );
          }

          return (
            <TextAreaCell
              maxLines={3}
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
      {
        accessorKey: "status_utilaj",
        header: (
          <div
            // onClick={() => console.log(manopere)}
            className="flex items-center w-[95%] justify-between text-black "
          >
            <span>Status</span>
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
              initialValue={getValue() || row.original.status_utilaj || ""}
              isEditable={isEditable}
              onEdit={handleStatusChange}
              bold={true}
              rows={1}
              padding={true}
            />
          );
        },
        size: 100,
      },
      { accessorKey: "unitate_masura", header: "Unitate", size: 20 },
      {
        accessorKey: "cost_amortizare",
        header: "Cost Amortizare",
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
              onEdit={handleCostAmortizareChange} // optional
              bold={true}
            />
          );
        },
        size: 70,
      },
      {
        accessorKey: "pret_utilaj",
        header: "Pret Utilaj",
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
        accessorKey: "cantitate",
        header: "Cantitate",
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
              onEdit={handleCantitateChange} // optional
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
                <div className="absolute z-10 left-0 -translate-x-[60%] bg-white border shadow-lg rounded-md w-40 p-2 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 text-lg font-semibold text-gray-700">
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
      utilaje,
      selectedFileInterior,
      previewInterior,
    ]
  );

  const table = useReactTable({
    data: utilaje,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    state: {
      columnResizing: {},
    },
  });

  return (
    <>
      {utilaje && (
        <div className="px-6 pb-4 scrollbar-webkit text-white h-full flex flex-col justify-between">
          <div className="overflow-auto h-full scrollbar-webkit">
            <table className="w-full text-sm leading-tight border-separate border-spacing-0 ">
              <thead className="top-0 w-full sticky  z-10 ">
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
                  <th className="border-b border-r border-black bg-white"></th>
                  <th className="border-b border-r bg-white border-black">
                    <select
                      id="clasa_utilaj"
                      name="clasa_utilaj"
                      value={filters.clasa_utilaj}
                      onChange={handleInputChange}
                      className=" p-2 w-full cursor-pointer outline-none py-3"
                    >
                      <option value="">Toate</option>
                      <option value="Regie">Regie</option>
                      <option value="Dezafectare">Dezafectare</option>
                      <option value="Amenajări interioare">
                        Amenajări interioare
                      </option>
                      <option value="Electrice">Electrice</option>
                      <option value="Sanitare">Sanitare</option>
                      <option value="Termice">Termice</option>
                      <option value="Climatizare Ventilație">
                        Climatizare Ventilație
                      </option>
                      <option value="Amenajări exterioare">
                        Amenajări exterioare
                      </option>
                      <option value="Tâmplărie">Tâmplărie</option>
                      <option value="Mobilă">Mobilă</option>
                      <option value="Confecții Metalice">
                        Confecții Metalice
                      </option>
                      <option value="Prelucrări Ceramice/Piatră Naturală">
                        Prelucrări Ceramice/Piatră Naturală
                      </option>
                      <option value="Ofertare/Devizare">
                        Ofertare/Devizare
                      </option>
                      <option value="Management de proiect">
                        Management de proiect
                      </option>
                      <option value="Reparații">Reparații</option>
                      <option value="Gros œuvre - maçonnerie">
                        Gros œuvre - maçonnerie
                      </option>
                      <option value="Plâtrerie (plaque de plâtre)">
                        Plâtrerie (plaque de plâtre)
                      </option>
                      <option value="Vrd">Vrd</option>
                      <option value="Espace vert - aménagement extérieur">
                        Espace vert - aménagement extérieur
                      </option>
                      <option value="Charpente - bardage et couverture métallique">
                        Charpente - bardage et couverture métallique
                      </option>
                      <option value="Couverture - zinguerie">
                        Couverture - zinguerie
                      </option>
                      <option value="Étanchéité">Étanchéité</option>
                      <option value="Plomberie - sanitaire">
                        Plomberie - sanitaire
                      </option>
                      <option value="Chauffage">Chauffage</option>
                      <option value="Ventilation">Ventilation</option>
                      <option value="Climatisation">Climatisation</option>
                      <option value="Électricité">Électricité</option>
                      <option value="Charpente et ossature bois">
                        Charpente et ossature bois
                      </option>
                      <option value="Menuiserie extérieure">
                        Menuiserie extérieure
                      </option>
                      <option value="Menuiserie agencement intérieur">
                        Menuiserie agencement intérieur
                      </option>
                      <option value="Métallerie (acier - aluminium)">
                        Métallerie (acier - aluminium)
                      </option>
                      <option value="Store et fermeture">
                        Store et fermeture
                      </option>
                      <option value="Peinture - revêtement intérieur">
                        Peinture - revêtement intérieur
                      </option>
                      <option value="Ravalement peinture - revêtement extérieur">
                        Ravalement peinture - revêtement extérieur
                      </option>
                      <option value="Vitrerie - miroiterie">
                        Vitrerie - miroiterie
                      </option>
                      <option value="Carrelage et revêtement mural">
                        Carrelage et revêtement mural
                      </option>
                      <option value="Revêtement de sol (sauf carrelage)">
                        Revêtement de sol (sauf carrelage)
                      </option>
                      <option value="Ouvrages communs TCE">
                        Ouvrages communs TCE
                      </option>
                      <option value="Rénovation énergétique">
                        Rénovation énergétique
                      </option>
                    </select>
                  </th>
                  <th
                    className="border-b border-r border-black bg-white"
                    colSpan={1}
                  ></th>
                  <th className="border-b bg-white  border-r border-black">
                    <input
                      type="text"
                      name="cod_utilaj"
                      value={filters.cod_utilaj}
                      onChange={handleInputChange}
                      className="p-2 w-full outline-none  py-3"
                      placeholder="Filtru Cod"
                    />
                  </th>
                  <th className="border-b bg-white  border-r border-black">
                    <input
                      type="text"
                      name="utilaj"
                      value={filters.utilaj}
                      onChange={handleInputChange}
                      className="p-2 w-full outline-none  py-3"
                      placeholder="Filtru Utilaj"
                    />
                  </th>
                  <th className="border-b bg-white  border-r border-black">
                    <input
                      type="text"
                      name="descriere_utilaj"
                      value={filters.descriere_utilaj}
                      onChange={handleInputChange}
                      className="p-2 w-full outline-none  py-3"
                      placeholder="Filtru Descriere"
                    />
                  </th>
                  <th className="border-b bg-white border-r border-black">
                    <select
                      id="status_utilaj"
                      name="status_utilaj"
                      value={filters.status_utilaj}
                      onChange={handleInputChange}
                      className="p-2 w-full cursor-pointer outline-none py-3 "
                    >
                      <option value="">Toate</option>
                      <option value="Nou">Nou</option>
                      <option value="Ca Nou">Ca Nou</option>
                      <option value="Bun">Bun</option>
                      <option value="Recondiționat">Recondiționat</option>
                      <option value="Utilizat">Utilizat</option>
                      <option value="Defect">Defect</option>
                      <option value="Nouveau">Nouveau</option>
                      <option value="Comme neuf">Comme neuf</option>
                      <option value="Bien">Bien</option>
                      <option value="Remis à neuf">Remis à neuf</option>
                      <option value="Utilisé">Utilisé</option>
                      <option value="Défectueux">Défectueux</option>
                    </select>
                  </th>
                  <th
                    className=" bg-white border-b border-r border-black"
                    colSpan={4}
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
                            className="text-white text-base"
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
                    className="bg-white text-black text-left  font-bold"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`relative border-b-2 border-r border-black   bg-white p-2 py-4 ${header.column.id === "threeDots" ? "text-center" : ""
                          } `}
                        style={{
                          width:
                            header.column.id === "threeDots"
                              ? "5rem"
                              : header.column.id === "Dropdown"
                                ? "4rem"
                                : header.column.id === "logo"
                                  ? "3rem"
                                  : `${header.getSize()}px`, // Enforce width for "Options"
                          minWidth:
                            header.column.id === "threeDots"
                              ? "5rem"
                              : header.column.id === "Dropdown"
                                ? header.column.id === "logo"
                                  ? "35px"
                                  : "4rem"
                                : "", // Ensure no shrinkage
                          maxWidth:
                            header.column.id === "threeDots"
                              ? "5rem"
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
              {utilaje.length == 0 ? (
                <tbody className="relative z-0">
                  <tr>
                    <td className="bg-white text-black h-12" colSpan={14}>
                      <div className=" flex justify-center items-center w-full text-base font-semibold h-full">
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
                          colSpan={13}
                        >
                          <div className="flex font-bold text-center justify-center items-center gap-2">
                            <p className=" text-center">Adauga Obiecte</p>
                            <FontAwesomeIcon
                              className="text-black  text-center text-base"
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
                                                                                                                                             border-b border-r break-words max-w-72 whitespace-pre-line   relative border-black p-1 px-3 `}
                              >
                                <div className="h-full w-full overflow-hidden ">
                                  <div className="max-h-[3.7rem] h-[3.7rem]   grid grid-cols-1 items-center  break-words whitespace-pre-line   overflow-auto  scrollbar-webkit">
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
                                ? "bg-blue-300 hover:bg-blue-400"
                                : "bg-[rgb(255,255,255,0.80)] hover:bg-[rgb(255,255,255,0.6)]"
                          }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={`max-w-72 ${cell.column.id == "limba" ? "only-copy select-none " : ""}  border-b border-r break-words whitespace-pre-line relative border-black p-1 px-3`}
                            style={cell.column.columnDef.meta?.style} // Apply the custom style
                          >
                            <div className="h-full w-full overflow-hidden ">
                              <div className="max-h-20 h-20 w-full  grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
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
