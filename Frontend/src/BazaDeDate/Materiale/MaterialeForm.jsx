import {
  faArrowRightArrowLeft,
  faCancel,
  faL,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useRef, useState } from "react";
import api from "../../api/axiosAPI";
import defaultPhoto from "../../assets/no-image-icon.png";
import MaterialeTable from "./MaterialeTable";

export default function MaterialeForm() {
  const [itIsFR, setItIsFR] = useState(false);

  const [formData, setFormData] = useState({
    limba: "RO",
    tip_material: "De Bază",
    clasa_material: "Dezafectare",
    cod_definitie: "",
    denumire: "",
    denumire_fr: "",
    descriere: "",
    descriere_fr: "",
    unitate_masura: "U",
    cost_unitar: "0",
    cost_preferential: "0",
    pret_vanzare: "0",
  });

  //Photo handlers
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(defaultPhoto);

  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setReloadKey((prevKey) => prevKey + 1); // Trigger child re-render by changing the key
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataSend = new FormData();
    // console.log(formData)
    formDataSend.append("limba", formData.limba.trim());
    formDataSend.append("tip_material", formData.tip_material.trim());
    formDataSend.append("clasa_material", formData.clasa_material.trim());
    formDataSend.append("cod_definitie", formData.cod_definitie.trim());
    formDataSend.append("denumire", formData.denumire.trim());
    formDataSend.append(
      "denumire_fr",
      formData.denumire_fr ? formData.denumire_fr.trim() : ""
    );
    formDataSend.append(
      "descriere",
      formData.descriere ? formData.descriere.trim() : ""
    );
    formDataSend.append(
      "descriere_fr",
      formData.descriere_fr ? formData.descriere_fr.trim() : ""
    );
    formDataSend.append("poza", selectedFile);
    formDataSend.append("unitate_masura", formData.unitate_masura.trim());
    formDataSend.append("cost_unitar", formData.cost_unitar.trim());
    formDataSend.append("cost_preferential", formData.cost_preferential.trim());
    formDataSend.append("pret_vanzare", formData.pret_vanzare.trim());
    if (selectedDouble) {
      formDataSend.append("childs", selectedDouble);
    }

    if (
      formData.limba.trim() === "" ||
      formData.clasa_material.trim() === "" ||
      formData.cod_definitie.trim() === "" ||
      formData.denumire.trim() === "" ||
      formData.unitate_masura.trim() === "" ||
      formData.cost_unitar.trim() === "" ||
      formData.cost_preferential.trim() === "" ||
      formData.pret_vanzare.trim() === "" ||
      formData.tip_material.trim() === ""
    ) {
      alert(
        "Toate campurile sunt obligatorii (fara FR daca nu e selectata limba FR)"
      );
      return;
    }
    if (formData.limba === "FR" && formData.denumire_fr.trim() === "") {
      alert("Toate campurile sunt obligatorii (cu FR)");
      return;
    }
    if (formData.cod_definitie.trim().length < 18) {
      alert("Codul de definiție trebuie să aibă 18 caractere.");
      return;
    }
    try {
      if (selectedEdit != null) {
        await api.put(
          `/Materiale/api/editMaterialDef/${selectedEdit}`,
          formDataSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        // console.log('Material edited');
        setSelectedEdit(null);
      } else {
        await api.post("/Materiale/api/setMaterialDef", formDataSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        // console.log("material added")
        if (selectedDouble != null) setSelectedDouble(null);
      }
      setFormData({
        limba: formData.limba,
        tip_material: formData.tip_material,
        clasa_material: formData.clasa_material,
        cod_definitie: "",
        denumire: "",
        denumire_fr: "",
        descriere_fr: "",
        descriere: "",
        unitate_masura: formData.unitate_masura,
        cost_unitar: "0",
        cost_preferential: "0",
        pret_vanzare: "0",
      });
      setSelectedFile(null);
      setPreview(defaultPhoto);
      handleReload();
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "cost_preferential") {
      if (/^\d*\.?\d{0,3}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name === "cost_unitar") {
      if (/^\d*\.?\d{0,3}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name === "pret_vanzare") {
      if (/^\d*\.?\d{0,3}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name == "limba") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      // console.log(value)
      if (value == "RO") {
        setFormData((prev) => ({ ...prev, ["clasa_material"]: "Dezafectare" }));
        setFormData((prev) => ({ ...prev, ["tip_material"]: "De Bază" }));
      } else {
        // console.log("aici")
        setFormData((prev) => ({ ...prev, ["clasa_material"]: "Terrassement" }));
        setFormData((prev) => ({ ...prev, ["tip_material"]: "Basique" }));
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
      tip_material: "De Bază",
      clasa_material: "Dezafectare",
      cod_definitie: "",
      denumire: "",
      denumire_fr: "",
      descriere: "",
      descriere_fr: "",
      unitate_masura: "U",
      cost_unitar: "0",
      cost_preferential: "0",
      pret_vanzare: "0",
    });
    setPreview(defaultPhoto);
    setSelectedFile(null);
  };

  const cancelDouble = (e) => {
    e.preventDefault();
    setSelectedDouble(null);
    setFormData({
      limba: "RO",
      tip_material: "De Bază",
      clasa_material: "Dezafectare",
      cod_definitie: "",
      denumire: "",
      denumire_fr: "",
      descriere: "",
      descriere_fr: "",
      unitate_masura: "U",
      cost_unitar: "0",
      cost_preferential: "0",
      pret_vanzare: "0",
    });
    setPreview(defaultPhoto);
    setSelectedFile(null);
  };

  const deleteRow = async (e) => {
    e.preventDefault();
    try {
      const response = await api.delete(
        `/Materiale/api/deleteMaterialDef/${selectedDelete}`
      );
      // console.log(response);
      setSelectedDelete(null);
      handleReload();
    } catch (error) {
      console.error("Error deleting data:", error);
    }
  };

  //Handle Photo preview and saving
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    // console.log(file);
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file)); // Show image preview
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    // console.log(file);
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleButtonClick = () => {
    // document.getElementById('hiddenFileInput').click();
    const fileInput = document.getElementById("hiddenFileInput");
    fileInput.value = ""; // Reset the value of the file input
    fileInput.click(); // Trigger the file input click manually
  };

  return (
    <>
      <div className="w-full containerWhiter">
        <div className="flex justify-center items-center text-black  ">
          <form
            onSubmit={handleSubmit}
            className="w-full text-sm xxxl:text-[0.8rem] p-4 py-2  rounded-lg shadow-xl"
          >
            <div className="grid grid-cols-[auto_auto_auto_auto_auto_1fr_auto_auto_auto_auto_auto]  md:gap-2 xl:gap-3 items-center">
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
                  <div className="w-10 sm:w-12 relative   md:w-12 lg:w-14 xl:w-16 xxl:w-20 xxxl:w-24 aspect-square">
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
              {/* clasa materiale */}
              {formData.limba == "RO" ? (
                <div className="flex flex-col items-center">
                  <label
                    htmlFor="unit"
                    className="col-span-1 font-medium text-black"
                  >
                    Clasă
                  </label>
                  <select
                    id="clasa_material"
                    name="clasa_material"
                    value={formData.clasa_material}
                    onChange={handleChange}
                    className="py-2 text-center max-w-96 px-2 rounded-lg outline-none shadow-sm "
                  >
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
                    id="clasa_material"
                    name="clasa_material"
                    value={formData.clasa_material}
                    onChange={handleChange}
                    className=" px-1 py-2 rounded-lg max-w-64 outline-none shadow-sm "
                  >
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
                </div>
              )}
              {formData.limba == "RO" ? (
                <div className="flex flex-col items-center">
                  <label htmlFor="unit" className="font-medium text-black">
                    Tip
                  </label>
                  <select
                    id="tip_material"
                    name="tip_material"
                    value={formData.tip_material}
                    onChange={handleChange}
                    className=" py-2 border text-center  rounded-lg outline-none shadow-sm "
                  >
                    <option value="De Bază">De Bază</option>
                    <option value="Auxiliar">Auxiliare</option>
                    <option value="Consumabil">Consumabile</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <label htmlFor="unit" className="font-medium text-black">
                    Tip
                  </label>
                  <select
                    id="tip_material"
                    name="tip_material"
                    value={formData.tip_material}
                    onChange={handleChange}
                    className=" py-2 border text-center  rounded-lg outline-none shadow-sm "
                  >
                    <option value="Basique">Basique</option>
                    <option value="Soutien">Soutien</option>
                    <option value="Fournitures">Fournitures</option>
                  </select>
                </div>
              )}

              {/* cod produs */}
              <div className="flex flex-col items-center ">
                <label htmlFor="code" className=" font-medium text-black">
                  Cod Produs
                </label>
                <input
                  type="text"
                  id="cod_definitie"
                  name="cod_definitie"
                  value={formData.cod_definitie}
                  maxLength={18}
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
                      <label className=" font-medium text-black">
                        Denumire
                      </label>
                      <textarea
                        rows={3}
                        type="text"
                        id="denumire"
                        name="denumire"
                        value={formData.denumire}
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
                        Denumire FR
                      </label>
                      <textarea
                        rows={3}
                        type="text"
                        id="denumire_fr"
                        name="denumire_fr"
                        value={formData.denumire_fr}
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
              {/* Unit Dropdown */}
              <div className="flex flex-col items-center">
                <label htmlFor="unit" className="font-medium text-black">
                  Unitate
                </label>
                <select
                  id="unitate_masura"
                  name="unitate_masura"
                  value={formData.unitate_masura}
                  onChange={handleChange}
                  className=" py-2 border text-center  rounded-lg outline-none shadow-sm "
                >
                  <option value="U">U</option>
                  <option value="m">m</option>
                  <option value="m²">m²</option>
                  <option value="m³">m³</option>
                  <option value="kg">kg</option>
                  <option value="t">t</option>
                  <option value="Set">Set</option>
                  <option value="Rola">Rola</option>
                  <option value="ens">ens</option>
                  <option value="j">j</option>
                </select>
              </div>

              {/* cost unitar */}
              <div className="flex flex-col items-center">
                <label className=" font-medium text-black">Cost</label>
                <input
                  type="text"
                  id="cost_unitar"
                  name="cost_unitar"
                  maxLength={8}
                  value={formData.cost_unitar}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-24 w-full outline-none rounded-lg shadow-sm "
                  placeholder="Unitar"
                />
              </div>

              {/* cost unitar */}
              <div className="flex flex-col items-center">
                <label className=" font-medium text-black">Cost</label>
                <input
                  type="text"
                  id="cost_preferential"
                  name="cost_preferential"
                  maxLength={8}
                  value={formData.cost_preferential}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-24 w-full outline-none rounded-lg shadow-sm "
                  placeholder="Preferential"
                />
              </div>

              {/* cost unitar */}
              <div className="flex flex-col items-center">
                <label className=" font-medium text-black">Preț</label>
                <input
                  type="text"
                  id="pret_vanzare"
                  name="pret_vanzare"
                  maxLength={8}
                  value={formData.pret_vanzare}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-24 w-full outline-none rounded-lg shadow-sm "
                />
              </div>
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
        <MaterialeTable
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
