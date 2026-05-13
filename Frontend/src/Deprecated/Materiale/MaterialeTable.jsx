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
  faCancel,
  faChevronRight,
  faCopy,
  faEllipsis,
  faFileCirclePlus,
  faL,
  faLanguage,
  faPenToSquare,
  faPlus,
  faRepeat,
  faSort,
  faSortDown,
  faSortUp,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import photoApi from "../../api/photoAPI";
import TextAreaCell from "../Santiere/Ofertare/TextareaCell";
import CostInputCell from "../Santiere/Ofertare/CostCell";
import defaultPhoto from "../../assets/no-image-icon.png";
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
  const [materiale, setMateriale] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [ascendent, setAscendent] = useState(false);
  const [ascendentTime, setAscendentTime] = useState(null);
  // sa vedem ce meteriale au limba schimbata
  const [open, setOpen] = useState([]);

  const [selectedFileInterior, setSelectedFileInterior] = useState(null);
  const [previewInterior, setPreviewInterior] = useState(defaultPhoto);

  const fileInputRef = useRef(null);

  const [filters, setFilters] = useState({
    tip_material: "",
    cod_definitie: "",
    denumire: "",
    descriere: "",
    furnizor: "",
    clasa_material: "",
    limba: "",
  });

  //editare smechere
  const [furnizor, setFurnizor] = useState(0);
  const [costMaterial, setCostMaterial] = useState(0);
  const [costPreferentialMaterial, setCostPreferentialMaterial] = useState(0);
  const [pretVanzareMaterial, setPretVanzareMaterial] = useState(0);
  const [codMaterial, setCodMaterial] = useState(0);
  const [descriereMaterial, setDescriereMaterial] = useState("");
  const [descriereMaterialFR, setDescriereMaterialFR] = useState("");

  const editedFurnizorRef = useRef(furnizor);
  const editedCostsRef = useRef(costMaterial);
  const editedCodRef = useRef(codMaterial);
  const editedDescriereRef = useRef(descriereMaterial);
  const editedDescriereFRRef = useRef(descriereMaterialFR);
  const editedCostsPreferentialRef = useRef(costPreferentialMaterial);
  const editedPretVanzareRef = useRef(pretVanzareMaterial);

  // State for selected interior
  const [selectedEditInterior, setSelectedEditInterior] = useState(null);
  const [selectedDeleteInterior, setSelectedDeleteInterior] = useState(null);
  // const [selectedDoubleInterior, setSelectedDoubleInterior] = useState(null);

  //to see the updated cantitate and costs in the function
  useEffect(() => {
    editedFurnizorRef.current = furnizor;
  }, [furnizor]);

  useEffect(() => {
    editedCostsRef.current = costMaterial;
  }, [costMaterial]);

  useEffect(() => {
    editedCodRef.current = codMaterial;
  }, [codMaterial]);

  useEffect(() => {
    editedDescriereRef.current = descriereMaterial;
  }, [descriereMaterial]);

  useEffect(() => {
    editedDescriereFRRef.current = descriereMaterialFR;
  }, [descriereMaterialFR]);

  useEffect(() => {
    editedCostsPreferentialRef.current = costPreferentialMaterial;
  }, [costPreferentialMaterial]);

  useEffect(() => {
    editedPretVanzareRef.current = pretVanzareMaterial;
  }, [pretVanzareMaterial]);
  //
  //

  const handleFurnizorChange = (id, whatIs, value) => {
    setFurnizor(value);
  };
  const handleCostChange = (id, whatIs, value) => {
    setCostMaterial(value);
  };
  const handleCodChange = (id, whatIs, value) => {
    setCodMaterial(value);
  };
  const handleDescriereChange = (id, whatIs, value) => {
    setDescriereMaterial(value);
  };
  const handleDescriereFRChange = (id, whatIs, value) => {
    setDescriereMaterialFR(value);
  };
  const handleCostPreferentialChange = (id, whatIs, value) => {
    setCostPreferentialMaterial(value);
  };
  const handlePretVanzareChange = (id, whatIs, value) => {
    setPretVanzareMaterial(value);
  };

  const [localLimba, setLocalLimba] = useState("RO");

  const fetchmateriale = async (offset, limit) => {
    setOpen([]);
    try {
      const response = await api.get("/Materiale/api/materialeDef", {
        params: {
          offset,
          limit,
          cod: filters.cod_definitie, // Pass cod_definitie_COR as a query parameter
          tip_material: filters.tip_material,
          denumire: filters.denumire, // Add any other filters here
          descriere: filters.descriere, // Add any other filters here
          clasa_material: filters.clasa_material,
          // furnizor: filters.furnizor,
          limba: filters.limba,
          asc_denumire: ascendent,
          dateOrder: ascendentTime,
        },
      });
      if (response.data.data.length == 0) {
        setMateriale([]);
        setTotalItems(0);
        setCurrentOffset(0);
        return;
      }
      if (offset >= Math.ceil(response.data.totalItems / limit)) {
        fetchmateriale(0, limit);
      } else {
        setMateriale(response.data.data);
        setTotalItems(response.data.totalItems);
        setCurrentOffset(response.data.currentOffset);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchmateriale(currentOffset, limit);
  }, [reloadKey]);

  useEffect(() => {
    const getData = setTimeout(() => {
      if (limit == "" || limit == 0) fetchmateriale(0, 10);
      else fetchmateriale(0, limit);
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
      // Call fetchmateriale with the new offset
      if (limit == 0) fetchmateriale(newOffset, 10);
      else fetchmateriale(newOffset, limit);
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
      const response = await api.delete(`/Materiale/api/material/${row.id}`);
      // console.log("Deleted:", response.data);

      // Update state to remove the deleted row from UI
      setMateriale((prev) =>
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
    const cost_unitar = parseFloat(editedCostsRef.current);
    const codMaterial = editedCodRef.current;
    const descriere = editedDescriereRef.current;
    const descriere_fr = editedDescriereFRRef.current;
    const furnizor = editedFurnizorRef.current;
    const pret_vanzare = parseFloat(editedPretVanzareRef.current);
    const cost_preferential = parseFloat(editedCostsPreferentialRef.current);

    const formData = new FormData();

    formData.append("id", row.id);
    formData.append("definitie_id", row.definitie_id);
    formData.append("cost_unitar", cost_unitar);
    formData.append("cod_material", codMaterial);
    formData.append("furnizor", furnizor);
    formData.append("descriere", descriere);
    formData.append("descriere_fr", descriere_fr);
    formData.append("pret_vanzare", pret_vanzare);
    formData.append("cost_preferential", cost_preferential);

    // ✅ Dacă a fost selectată o poză nouă, o trimitem
    if (selectedFileInterior) {
      formData.append("poza", selectedFileInterior);
    }

    try {
      const response = await api.put("/Materiale/api/editMaterial", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newPhoto = response.data.photoUrl || row.photoUrl;

      setMateriale((prev) =>
        prev.map((item) =>
          item.id === row.id && item.definitie_id != null
            ? {
              ...item,
              cost_unitar: cost_unitar.toFixed(3),
              cost_preferential: cost_preferential.toFixed(3),
              pret_vanzare: pret_vanzare.toFixed(3),
              cod_material: codMaterial,
              furnizor,
              descriere,
              descriere_fr,
              photoUrl: newPhoto,
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
      setCodMaterial(passedRow.cod_material);
      setFurnizor(passedRow.furnizor);
      setCostMaterial(passedRow.cost_unitar);
      setCostPreferentialMaterial(passedRow.cost_preferential);
      setPretVanzareMaterial(passedRow.pret_vanzare);
      setDescriereMaterial(passedRow.descriere);
      setDescriereMaterialFR(passedRow.descriere_fr);

      return;
    }

    setSelectedEdit(passedRow.id); // Toggle the dropdown based on the current state
    setFormData({
      limba: passedRow.limba,
      tip_material: passedRow.tip_material,
      clasa_material: passedRow.clasa_material,
      cod_definitie: passedRow.cod_definitie,
      denumire: passedRow.denumire,
      denumire_fr: passedRow.denumire_fr,
      descriere: passedRow.descriere,
      descriere_fr: passedRow.descriere_fr,
      unitate_masura: passedRow.unitate_masura,
      cost_unitar: passedRow.cost_unitar,
      cost_preferential: passedRow.cost_preferential,
      pret_vanzare: passedRow.pret_vanzare,
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
          cod_material: passedRow.cod_material,
          furnizor: passedRow.furnizor,
          cost_unitar: passedRow.cost_unitar,
          cost_preferential: passedRow.cost_preferential,
          pret_vanzare: passedRow.pret_vanzare,
          descriere: passedRow.descriere,
          descriere_fr: passedRow.descriere_fr,
        };
        // console.log("passedRow", passedRow.definitie_id);
        handleSubmit(e, passedRow, passedRow.definitie_id, data, file);

        return;
      }

      setSelectedDouble(passedRow.id); // Toggle the dropdown based on the current state
      setFormData({
        limba: passedRow.limba,
        tip_material: passedRow.tip_material,
        clasa_material: passedRow.clasa_material,
        cod_definitie: passedRow.cod_definitie,
        denumire: passedRow.denumire,
        denumire_fr: passedRow.denumire_fr,
        descriere: passedRow.descriere,
        descriere_fr: passedRow.descriere_fr,
        unitate_masura: passedRow.unitate_masura,
        cost_unitar: passedRow.cost_unitar,
        cost_preferential: passedRow.cost_preferential,
        pret_vanzare: passedRow.pret_vanzare,
      });
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    } catch (error) {
      console.log("Error in duplicating", error);
    }
  };

  const delPreviewMaterial = (id) => {
    if (materiale) {
      // console.log(open, id)
      setOpen((prev) => prev.filter((item) => item !== id));
      const updatedmateriale = [...materiale];
      const materialIndex = updatedmateriale.findIndex(
        (item) => item.id === id && item.cod_definitie != null
      ); // sa fie diferit de materiale/material etc
      const addButtonIndex = updatedmateriale.findIndex(
        (item) => item.id === `addButton-${id}`
      );
      // console.log("reteIDX ", materialIndex, "btnIDX ", addButtonIndex);
      if (
        addButtonIndex !== -1 &&
        materialIndex !== -1 &&
        addButtonIndex > materialIndex
      ) {
        updatedmateriale.splice(
          materialIndex + 1,
          addButtonIndex - materialIndex
        );
        setMateriale([...updatedmateriale]);
      }
      return [updatedmateriale, materialIndex];
    }
  };

  const fetchPreviewMaterial = async (id, index, materialeParam, row) => {
    try {
      const response = await api.get(
        `/Materiale/api/getSpecificMaterial/${id}`
      );
      const children = response.data.map((item) => ({
        ...item,
        limba: row.limba,
        tip_material: row.tip_material,
        clasa_material: row.clasa_material,
        denumire: row.denumire,
        denumire_fr: row.denumire_fr,
        unitate_masura: row.unitate_masura,
      }));
      // console.log(children, "and", open, id, index)

      // console.log(children)
      const addButton = {
        id: `addButton-${id}`,
        definitieIdForFetch: id,
      };

      const updatedMateriale = materialeParam
        ? [...materialeParam]
        : [...materiale];
      updatedMateriale.splice(index + 1, 0, ...children, addButton);

      setOpen((prev) => [...prev, id]);
      setMateriale(updatedMateriale);
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
      delPreviewMaterial(id);
      return;
    }
    fetchPreviewMaterial(id, index, null, row);
  };

  const handleSubmit = async (e, row, parentId, data = null, file = null) => {
    e.preventDefault();
    // console.log(parentId);
    const form = {};
    if (!data) {
      form.cod_material = "000000";
      form.furnizor = "Inexistent";
      form.descriere = "";
      form.descriere_fr = "";
      form.cost_unitar = "0.000";
      form.cost_preferential = "0.000";
      form.pret_vanzare = "0.000";
    } else {
      form.cod_material = data.cod_material || "000000";
      form.furnizor = data.furnizor || "Inexistent";
      form.descriere = data.descriere || "";
      form.descriere_fr = data.descriere_fr || "";
      form.cost_unitar = data.cost_unitar || "0.000";
      form.cost_preferential = data.cost_preferential || "0.000";
      form.pret_vanzare = data.pret_vanzare || "0.000";
    }
    try {

      const parent = materiale.find(
        (item) => item.id == parentId && item.cod_definitie != null
      );
      if (!parent) return;

      const formData = new FormData();

      // 🧠 Adaugă toți câmpii în formData
      formData.append("id", parentId);
      formData.append("cod_material", form.cod_material);
      formData.append("furnizor", form.furnizor);
      formData.append("descriere", form.descriere);
      formData.append("descriere_fr", form.descriere_fr);
      formData.append("cost_unitar", form.cost_unitar);
      formData.append("cost_preferential", form.cost_preferential);
      formData.append("pret_vanzare", form.pret_vanzare);
      // ✅ Dacă există poză nouă, o adaugăm
      if (file != null && data) {
        formData.append("poza", file);
        setSelectedFileInterior(file);
        setPreviewInterior(URL.createObjectURL(file));
      }
      else {
        setPreviewInterior(`${photoApi}/${parent.photoUrl.replace(/\\/g, "/")}`);
      }

      const response = await api.post("/Materiale/api/setMaterial", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const insertedId = response.data.id;


      const newChild = {
        id: insertedId,
        definitie_id: parentId,
        cod_material: form.cod_material,
        furnizor: form.furnizor,
        descriere: form.descriere,
        descriere_fr: form.descriere_fr,
        cost_unitar: parseFloat(form.cost_unitar).toFixed(3),
        cost_preferential: parseFloat(form.cost_preferential).toFixed(3),
        pret_vanzare: parseFloat(form.pret_vanzare).toFixed(3),
        photoUrl: response.data.photoUrl, // Use the parent's photoUrl
        limba: parent.limba,
        tip_material: parent.tip_material,
        clasa_material: parent.clasa_material,
        denumire: parent.denumire,
        denumire_fr: parent.denumire_fr,
        unitate_masura: parent.unitate_masura,
      };
      const updated = [...materiale];
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

      setMateriale(updated);
      setSelectedEditInterior(insertedId); // Set the selectedEditInterior to the new child's id
      setCodMaterial(form.cod_material);
      setFurnizor(form.furnizor);
      setCostMaterial(form.cost_unitar);
      setCostPreferentialMaterial(form.cost_preferential);
      setPretVanzareMaterial(form.pret_vanzare);
      setDescriereMaterial(form.descriere);
      setDescriereMaterialFR(form.descriere_fr);
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
    console.log("Dropped file:", file);
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

  useEffect(() => {
    document.addEventListener("keydown", handleCtrlC);
    return () => {
      document.removeEventListener("keydown", handleCtrlC);
    };
  }, [selectedRows]);

  //Handle Click Outside!
  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleClickOutside = (event) => {
    if (!event.target.closest(".only-copy")) {
      setSelectedRows({}); // Close the dropdown if click is outside
      setLastSelectedIndex(null);
    }
    if (!event.target.closest(".dropdown-container")) {
      setSelectedFileInterior(null); // Close the edit input if click is outside
      setPreviewInterior(defaultPhoto); // Reset the preview image
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
            {" "}
            {getValue()}
          </div>
        ), // Display default value if the value is empty or undefined
        size: 30,
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
      { accessorKey: "clasa_material", header: "Clasă", size: 120 },
      { accessorKey: "tip_material", header: "Tip", size: 80 },
      {
        accessorKey: "furnizor",
        header: (
          <div
            onClick={() => console.log(materiale)}
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
              initialValue={getValue() || row.original.cod_material || ""}
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
        accessorKey: "denumire",
        header: (
          <div className="flex items-center w-[95%] justify-between text-black ">
            <span>Denumire</span>
            <FontAwesomeIcon
              onClick={() =>
                setAscendent((prev) => (prev == false ? true : false))
              }
              className="text-base border border-black p-2  rounded-full  cursor-pointer"
              icon={!ascendent ? faArrowUpAZ : faArrowDownAZ}
            />
          </div>
        ),
        cell: ({ getValue, row }) =>
        (
          row.original.cod_definitie ?
            <OverflowPopover text={localLimba === 'RO' ? getValue() : row.original.denumire_fr} maxLines={4} />
            :
            <OverflowPopover text={localLimba === 'RO' ? getValue() : row.original.denumire_fr} maxLines={3} />
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
      { accessorKey: "unitate_masura", header: "Unitate", size: 50 },
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
        accessorKey: "cost_preferential",
        header: "Cost Preferențial",
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
              onEdit={handleCostPreferentialChange} // optional
              bold={true}
            />
          );
        },
        size: 70,
      },
      {
        accessorKey: "pret_vanzare",
        header: "Preț Vânzare",
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
              onEdit={handlePretVanzareChange} // optional
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
      materiale,
      selectedFileInterior,
      previewInterior,
      localLimba,
    ]
  );

  const table = useReactTable({
    data: materiale,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    state: {
      columnResizing: {},
    },
  });

  return (
    <>
      {materiale && (
        <div className="px-6 pb-4 scrollbar-webkit text-white leading-tight h-full flex flex-col overflow-hidden justify-between">
          <div className="overflow-auto h-full scrollbar-webkit">
            <table className="w-full border-separate text-sm border-spacing-0 ">
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
                      id="clasa_material"
                      name="clasa_material"
                      value={filters.clasa_material}
                      onChange={handleInputChange}
                      className=" p-2 w-full cursor-pointer outline-none py-3"
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
                  <th className="border-b bg-white border-r border-black">
                    <select
                      id="tip_material"
                      name="tip_material"
                      value={filters.tip_material}
                      onChange={handleInputChange}
                      className="p-2 w-full cursor-pointer outline-none py-3 "
                    >
                      <option value="">Toate</option>
                      <option value="De Bază">De Bază</option>
                      <option value="Auxiliar">Auxiliare</option>
                      <option value="Consumabil">Consumabile</option>
                      <option value="Basique">Basique</option>
                      <option value="Soutien">Soutien</option>
                      <option value="Fournitures">Fournitures</option>
                    </select>
                  </th>
                  <th className="border-b bg-white border-r border-black">
                    <input
                      type="text"
                      name="furnizor"
                      value={filters.furnizor}
                      onChange={handleInputChange}
                      className="p-2 w-full outline-none py-3"
                      placeholder="Filtru Furnizor "
                    />
                  </th>

                  <th className="border-b bg-white border-r border-black">
                    <input
                      type="text"
                      name="cod_definitie"
                      value={filters.cod_definitie}
                      onChange={handleInputChange}
                      className="p-2 w-full outline-none py-3"
                      placeholder="Filtru Cod "
                    />
                  </th>
                  <th className="border-b bg-white border-r border-black">
                    <input
                      type="text"
                      name="denumire"
                      value={filters.denumire}
                      onChange={handleInputChange}
                      className="p-2 w-full outline-none  py-3"
                      placeholder="Filtru Denumire"
                    />
                  </th>
                  <th className="bg-white border-b border-r border-black">
                    <input
                      type="text"
                      name="descriere"
                      value={filters.descriere}
                      onChange={handleInputChange}
                      className="p-2 w-full  h-full outline-none  py-3"
                      placeholder="Filtru Descriere"
                    />
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
                            className="text-white"
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
              {materiale.length == 0 ? (
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
                <tbody className=" dropdown-container relative z-0">
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
                          className="bg-green-400 p-1 px-3 hover:bg-green-500 cursor-pointer border-b border-r border-black  text-black"
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
                                ? "bg-blue-200 hover:bg-blue-300"
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
                              <div className="max-h-20 h-20 w-full   grid grid-cols-1 items-center  overflow-auto  scrollbar-webkit">
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
              className="p-2 min-w-24 bg-white text-black  rounded-lg"
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
              className="p-2 min-w-24 bg-white text-black m rounded"
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
