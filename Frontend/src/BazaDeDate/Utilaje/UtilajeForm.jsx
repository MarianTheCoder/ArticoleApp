import {
  faArrowRightArrowLeft,
  faCancel,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useRef, useState } from "react";
import api from "../../api/axiosAPI";
import defaultPhoto from "../../assets/no-image-icon.png";
import UtilajeTable from "./UtilajeTable";

export default function UtilajeForm() {
  const [formData, setFormData] = useState({
    limba: "RO",
    cod_definitie: "",
    clasa_utilaj: "Regie",
    utilaj: "",
    utilaj_fr: "",
    descriere: "",
    descriere_fr: "",
    cost_amortizare: "",
    pret_utilaj: "",
    unitate_masura: "h",
  });

  //Photo handlers
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(defaultPhoto);

  const [reloadKey, setReloadKey] = useState(0);

  const [itIsFR, setItIsFR] = useState(false);

  const handleReload = () => {
    setReloadKey((prevKey) => prevKey + 1); // Trigger child re-render by changing the key
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataSend = new FormData();
    formDataSend.append("limba", formData.limba.trim());
    formDataSend.append("cod_definitie", formData.cod_definitie.trim());
    formDataSend.append("clasa_utilaj", formData.clasa_utilaj.trim());
    formDataSend.append("utilaj", formData.utilaj.trim());
    formDataSend.append(
      "utilaj_fr",
      formData.utilaj_fr ? formData.utilaj_fr.trim() : ""
    );
    formDataSend.append(
      "descriere",
      formData.descriere ? formData.descriere.trim() : ""
    );
    formDataSend.append(
      "descriere_fr",
      formData.descriere_fr ? formData.descriere_fr.trim() : ""
    );
    formDataSend.append("cost_amortizare", formData.cost_amortizare.trim());
    formDataSend.append("pret_utilaj", formData.pret_utilaj.trim());
    formDataSend.append("unitate_masura", formData.unitate_masura.trim());
    formDataSend.append("poza", selectedFile);
    if (selectedDouble != null) {
      formDataSend.append("childs", selectedDouble);
    }
    if (
      formData.limba.trim() === "" ||
      formData.cod_definitie.trim() === "" ||
      formData.clasa_utilaj.trim() === "" ||
      formData.utilaj.trim() === "" ||
      formData.cost_amortizare.trim() === "" ||
      formData.pret_utilaj.trim() === ""
    ) {
      alert(
        "Toate campurile sunt obligatorii (fara FR daca nu e selectata limba FR)"
      );
      return;
    }
    if (formData.limba === "FR" && formData.utilaj_fr.trim() === "") {
      alert("Toate campurile sunt obligatorii (cu FR)");
      return;
    }
    // console.log(formDataSend)
    try {
      if (selectedEdit != null) {
        await api.put(
          `/Utilaje/api/editUtilajDef/${selectedEdit}`,
          formDataSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        // console.log('Utilaj edited');
        setSelectedEdit(null);
      } else {
        console.log("Adding new utilaj");
        await api.post("/Utilaje/api/setUtilajDef", formDataSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        // console.log("Utilaj added");
        if (selectedDouble != null) setSelectedDouble(null);
      }
      setFormData({
        limba: formData.limba,
        cod_definitie: "",
        clasa_utilaj: formData.clasa_utilaj,
        utilaj: "",
        utilaj_fr: "",
        descriere: "",
        descriere_fr: "",
        cost_amortizare: "",
        pret_utilaj: "",
        unitate_masura: formData.unitate_masura,
      });
      setSelectedFile(null);
      setPreview(defaultPhoto);
      handleReload();
    } catch (error) {
      console.error("Upload error:", error);
      firstInputRef.current.focus();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "cost_amortizare") {
      if (/^\d*\.?\d{0,3}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name === "pret_utilaj") {
      if (/^\d*\.?\d{0,3}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name === "cantitate") {
      if (/^\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name == "limba") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (value == "RO") {
        setFormData((prev) => ({ ...prev, ["clasa_utilaj"]: "Dezafectare" }));
        setFormData((prev) => ({ ...prev, ["status_utilaj"]: "Ca Nou" }));
      } else {
        setFormData((prev) => ({ ...prev, ["clasa_utilaj"]: "Vrd" }));
        setFormData((prev) => ({ ...prev, ["status_utilaj"]: "Nouveau" }));
      }
    } else setFormData((prev) => ({ ...prev, [name]: value }));
  };

  //
  // STATES FOR DELETE, EDIT
  //

  const [selectedDelete, setSelectedDelete] = useState(null);
  const [selectedEdit, setSelectedEdit] = useState(null);
  const [selectedDouble, setSelectedDouble] = useState(null);

  const cancelDelete = (e) => {
    e.preventDefault();
    setSelectedDelete(null);
  };

  const cancelEdit = (e) => {
    e.preventDefault();
    setSelectedEdit(null);
    setFormData({
      limba: "RO",
      cod_definitie: "",
      clasa_utilaj: "Regie",
      utilaj: "",
      utilaj_fr: "",
      descriere: "",
      descriere_fr: "",
      cost_amortizare: "",
      pret_utilaj: "",
      unitate_masura: "h",
    });
    setPreview(defaultPhoto);
    setSelectedFile(null);
  };

  const cancelDouble = (e) => {
    e.preventDefault();
    setSelectedDouble(null);
    setFormData({
      limba: "RO",
      cod_definitie: "",
      clasa_utilaj: "Regie",
      utilaj: "",
      utilaj_fr: "",
      descriere: "",
      descriere_fr: "",
      cost_amortizare: "",
      pret_utilaj: "",
      unitate_masura: "h",
    });
    setPreview(defaultPhoto);
    setSelectedFile(null);
  };

  const deleteRow = async (e) => {
    e.preventDefault();
    try {
      const response = await api.delete(
        `/Utilaje/api/deleteUtilajDef/${selectedDelete}`
      );
      // console.log(response);
      setSelectedDelete(null);
      handleReload();
    } catch (error) {
      console.error("Error deleting data:", error);
    }
  };

  //Refernce to focus back on first input after submiting
  const firstInputRef = useRef(null);

  //Handle Photo preview and saving
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file)); // Show image preview
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleButtonClick = () => {
    const fileInput = document.getElementById("hiddenFileInput");
    fileInput.value = ""; // Reset the value of the file input
    fileInput.click(); // Trigger the file input click manually
  };

  return (
    <>
      <div className="w-full text-sm containerWhiter">
        <div className="flex justify-center items-center text-black  ">
          <form
            onSubmit={handleSubmit}
            className="w-full p-4 px-6 rounded-lg shadow-xl"
          >
            <div className="grid grid-cols-[auto_auto_auto_auto_1fr_auto_auto_auto_auto] xxxl:gap-4 md:gap-2 xl:gap-3 items-center">
              {/* Limba Dropdown */}
              <div className="flex flex-col items-center">
                <label
                  htmlFor="unit"
                  className="col-span-1 font-medium text-black"
                >
                  Limbă
                </label>
                <select
                  id="limba"
                  name="limba"
                  value={formData.limba}
                  onChange={handleChange}
                  className=" px-1 py-2 rounded-lg outline-none shadow-sm "
                >
                  <option value="RO">RO</option>
                  <option value="FR">FR</option>
                </select>
              </div>

              {/* photourl */}
              <div className="flex flex-col items-center ">
                <div className=" items-center gap-4 flex w-full">
                  <div className="w-10 sm:w-12  md:w-12 lg:w-14 xl:w-16 xxl:w-20 xxxl:w-24 aspect-square">
                    <img
                      onClick={handleButtonClick}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className="rounded-xl  cursor-pointer object-contain w-full h-full "
                      src={preview == null ? "" : preview}
                    ></img>
                  </div>
                  <input
                    id="hiddenFileInput"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Clasa Utilaj */}
              {formData.limba == "RO" ? (
                <div className="flex flex-col items-center">
                  <label
                    htmlFor="unit"
                    className="col-span-1 font-medium text-black"
                  >
                    Clasă
                  </label>
                  <select
                    id="clasa_utilaj"
                    name="clasa_utilaj"
                    value={formData.clasa_utilaj}
                    onChange={handleChange}
                    className="py-2 text-center max-w-64 rounded-lg outline-none shadow-sm "
                  >
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
                    <option value="Ofertare/Devizare">Ofertare/Devizare</option>
                    <option value="Management de proiect">
                      Management de proiect
                    </option>
                    <option value="Reparații">Reparații</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <label
                    htmlFor="unit"
                    className="col-span-1 font-medium text-black"
                  >
                    Clasă
                  </label>
                  <select
                    id="clasa_utilaj"
                    name="clasa_utilaj"
                    value={formData.clasa_utilaj}
                    onChange={handleChange}
                    className=" px-1 py-2 rounded-lg max-w-64 outline-none shadow-sm "
                  >
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
                </div>
              )}
              {/* cod material */}
              <div className="flex flex-col items-center ">
                <label htmlFor="code" className=" font-medium text-black">
                  Cod Produs
                </label>
                <input
                  type="text"
                  id="cod_definitie"
                  name="cod_definitie"
                  value={formData.cod_definitie}
                  onChange={handleChange}
                  className="px-2 outline-none text-center py-2 max-w-32  rounded-lg shadow-sm "
                />
              </div>
              {/* div de schimbat unde pun datele!! ro si fr pentru ca spatiul e mic rau */}
              <div className=" grid grid-cols-[auto_1fr_1.5fr] gap-2 border p-2 rounded-lg border-black">
                <div className="flex  justify-center gap-1 font-medium select-none items-center">
                  <p
                    className={`${itIsFR ? "text-green-400 font-bold" : "text-black"
                      }`}
                  >
                    FR
                  </p>
                  <FontAwesomeIcon
                    icon={faArrowRightArrowLeft}
                    onClick={() => setItIsFR((prev) => (prev ? false : true))}
                    className=" text-green-400 border-green-400 hover:text-green-500 hover:border-green-500 cursor-pointer border-2 p-2 rounded-full text-xl"
                  />
                  <p
                    className={`${itIsFR ? "text-black" : "text-green-400  font-boold"
                      }`}
                  >
                    RO
                  </p>
                </div>
                {/* Denumire Input for RO*/}
                {!itIsFR ? (
                  <>
                    <div className="flex flex-col items-center">
                      <label className=" font-medium text-black">Utilaj</label>
                      <textarea
                        rows={3}
                        type="text"
                        id="utilaj"
                        name="utilaj"
                        value={formData.utilaj}
                        onChange={handleChange}
                        className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <label className=" font-medium text-black">
                        Descriere
                      </label>
                      <textarea
                        type="text"
                        rows={3}
                        id="descriere"
                        name="descriere"
                        value={formData.descriere}
                        onChange={handleChange}
                        className="px-2 w-full resize-none outline-none py-2  rounded-lg shadow-sm "
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center">
                      <label className=" font-medium text-black">
                        Utilaj FR
                      </label>
                      <textarea
                        rows={3}
                        type="text"
                        id="utilaj_fr"
                        name="utilaj_fr"
                        value={formData.utilaj_fr}
                        onChange={handleChange}
                        className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <label className=" font-medium text-black">
                        Descriere FR
                      </label>
                      <textarea
                        type="text"
                        rows={3}
                        id="descriere_fr"
                        name="descriere_fr"
                        value={formData.descriere_fr}
                        onChange={handleChange}
                        className="px-2 w-full resize-none outline-none py-2  rounded-lg shadow-sm "
                      />
                    </div>
                  </>
                )}
              </div>
              {/* Status Input */}
              {/* {formData.limba == "RO" ? (
                <div className="flex flex-col items-center">
                  <label htmlFor="unit" className="font-medium text-black">
                    Status
                  </label>
                  <select
                    id="status_utilaj"
                    name="status_utilaj"
                    value={formData.status_utilaj}
                    onChange={handleChange}
                    className=" py-2 border text-center  rounded-lg outline-none shadow-sm "
                  >
                    <option value="Nou">Nou</option>
                    <option value="Ca Nou">Ca Nou</option>
                    <option value="Bun">Bun</option>
                    <option value="Recondiționat">Recondiționat</option>
                    <option value="Utilizat">Utilizat</option>
                    <option value="Defect">Defect</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <label htmlFor="unit" className="font-medium text-black">
                    Status
                  </label>
                  <select
                    id="status_utilaj"
                    name="status_utilaj"
                    value={formData.status_utilaj}
                    onChange={handleChange}
                    className=" py-2 border text-center  rounded-lg outline-none shadow-sm "
                  >
                    <option value="Nouveau">Nouveau</option>
                    <option value="Comme neuf">Comme neuf</option>
                    <option value="Bien">Bien</option>
                    <option value="Remis à neuf">Remis à neuf</option>
                    <option value="Utilisé">Utilisé</option>
                    <option value="Défectueux">Défectueux</option>
                  </select>
                </div>
              )} */}
              <div className="flex flex-col items-center">
                <label htmlFor="unit" className="font-medium text-black">
                  Unitate
                </label>
                <select
                  id="unitate_masura"
                  name="unitate_masura"
                  value={formData.unitate_masura}
                  onChange={handleChange}
                  className="px-4 py-2 border  rounded-lg outline-none shadow-sm "
                >
                  <option value="U">U</option>
                  <option value="m">m</option>
                  <option value="m²">m²</option>
                  <option value="m³">m³</option>
                  <option value="kg">kg</option>
                  <option value="t">t</option>
                  <option value="l">l</option>
                  <option value="h">h</option>
                  <option value="ens">ens</option>
                  <option value="j">j</option>
                </select>
              </div>
              {/* cost amortizare */}
              <div className="flex flex-col items-center">
                <label className=" font-medium text-black">
                  Cost Amortizare
                </label>
                <input
                  type="text"
                  id="cost_amortizare"
                  name="cost_amortizare"
                  maxLength={8}
                  value={formData.cost_amortizare}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-36 w-full outline-none rounded-lg shadow-sm "
                />
              </div>

              {/* Pret */}
              <div className="flex flex-col items-center">
                <label className=" font-medium text-black">Preț</label>
                <input
                  type="text"
                  id="pret_utilaj"
                  name="pret_utilaj"
                  maxLength={8}
                  value={formData.pret_utilaj}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-28 w-full outline-none rounded-lg shadow-sm "
                />
              </div>

              {/* Cantitate */}

              {!selectedDelete && !selectedEdit && !selectedDouble ? (
                <div className="flex text-base xxxl:text-[0.8rem]  justify-center items-center ">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-2 py-2 flex justify-center  items-center rounded-lg"
                  >
                    <FontAwesomeIcon icon={faPlus} className="pr-2" /> Încarcă
                  </button>
                </div>
              ) : selectedDelete ? (
                <div className="flex gap-2 text-base justify-center xxxl:text-[0.8rem] items-center ">
                  <button
                    onClick={(e) => deleteRow(e)}
                    className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"
                  >
                    <FontAwesomeIcon icon={faCancel} className="pr-2" />
                    Șterge
                  </button>
                  <button
                    onClick={(e) => cancelDelete(e)}
                    className="bg-green-500 hover:bg-green-600 text- text mt-6 px-4 py-2 flex  items-center rounded-lg"
                  >
                    Anulează
                  </button>
                </div>
              ) : selectedDouble ? (
                <div className="flex gap-2 items-center ">
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"
                  >
                    <FontAwesomeIcon icon={faPlus} className="pr-3" />
                    Dublează
                  </button>
                  <button
                    onClick={(e) => cancelDouble(e)}
                    className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"
                  >
                    {" "}
                    Anulează
                  </button>
                </div>
              ) : (
                <div className="flex gap-2  text-base justify-center items-center xxxl:text-[0.8rem] ">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-2 py-2 flex  items-center rounded-lg"
                  >
                    <FontAwesomeIcon icon={faPlus} className="pr-2" /> Editează
                  </button>
                  <button
                    onClick={(e) => cancelEdit(e)}
                    className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-2 py-2 flex  items-center rounded-lg"
                  >
                    {" "}
                    Anulează
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
      {/* AICI JOS E TABELUL */}
      <div className="w-full h-full scrollbar-webkit overflow-hidden mt-6">
        <UtilajeTable
          selectedDouble={selectedDouble}
          cancelDouble={cancelDouble}
          setSelectedDouble={setSelectedDouble}
          setSelectedFile={setSelectedFile}
          setPreview={setPreview}
          cancelEdit={cancelEdit}
          cancelDelete={cancelDelete}
          reloadKey={reloadKey}
          selectedDelete={selectedDelete}
          setFormData={setFormData}
          setSelectedDelete={setSelectedDelete}
          selectedEdit={selectedEdit}
          setSelectedEdit={setSelectedEdit}
        />
      </div>
    </>
  );
}
