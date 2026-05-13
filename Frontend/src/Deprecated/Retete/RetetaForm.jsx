import { faArrowDown, faCancel, faL, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useContext, useRef, useState } from 'react'
import api from '../../api/axiosAPI';
import RetetaTable from './RetetaTable.jsx';


export default function ManoperaForm() {


  const [formData, setFormData] = useState({
    clasa: "Regie",
    cod: "",
    articol: "",
    articol_fr: "",
    descriere_reteta: "",
    descriere_reteta_fr: "",
    unitate_masura: "U",
    limba: "RO",
  });

  const [reloadKey, setReloadKey] = useState(0);


  const handleReload = () => {
    setReloadKey(prevKey => prevKey + 1);  // Trigger child re-render by changing the key
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log(formData)
    const formDataToSend = {
      formFirst: {
        cod: formData.cod.trim(),
        clasa: formData.clasa.trim(),
        unitate_masura: formData.unitate_masura.trim(),
        articol: formData.articol.trim(),
        articol_fr: formData.articol_fr.trim(),
        descriere_reteta: formData.descriere_reteta.trim(),
        descriere_reteta_fr: formData.descriere_reteta_fr.trim(),
        limba: formData.limba.trim(),
      }
    };

    if (formDataToSend.formFirst.cod == '' || formDataToSend.formFirst.articol == '' || formDataToSend.formFirst.unitate_masura == '' || formDataToSend.formFirst.clasa == '' || formDataToSend.formFirst.descriere_reteta == '' || formDataToSend.formFirst.limba == '') {
      alert("Toate campurile sunt obligatorii (fara FR daca nu e selectata limba FR)");
      return;
    }
    if (formDataToSend.formFirst.limba === "FR" && (formDataToSend.formFirst.articol_fr == '' || formDataToSend.formFirst.descriere_reteta_fr == '')) {
      alert("Toate campurile sunt obligatorii (cu FR)");
      return;
    }
    if (formDataToSend.formFirst.cod.length < 18) {
      alert("Codul de definiție trebuie să aibă 18 caractere.");
      return;
    }
    try {
      if (selectedEdit != null) {
        await api.put(`/Retete/editReteta/${selectedEdit}`, formDataToSend);
        // console.log('Reteta edited');
        setSelectedEdit(null);
      }
      else if (selectedDouble != null) {
        await api.post(`/Retete/doubleReteta/${selectedDouble}`, formDataToSend);
        // console.log('Reteta doubled');
        setSelectedDouble(null);
      }
      else {
        await api.post("/Retete/addReteta", formDataToSend);
      }
      setFormData({
        clasa: formData.clasa,
        cod: "",
        articol: "",
        articol_fr: "",
        descriere_reteta: "",
        descriere_reteta_fr: "",
        unitate_masura: formData.unitate_masura,
        limba: formData.limba,
      });
      handleReload();
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "cod") {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    }
    else if (name == "limba") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (value == "RO") {
        setFormData((prev) => ({ ...prev, ["clasa"]: "Dezafectare" }));
      }
      else {
        setFormData((prev) => ({ ...prev, ["clasa"]: "Terrassement" }));
      }
    }
    else setFormData((prev) => ({ ...prev, [name]: value }));
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
  }

  const cancelEdit = (e) => {
    e.preventDefault();
    setSelectedEdit(null);
    setFormData({
      clasa: "Regie",
      cod: "",
      articol: "",
      articol_fr: "",
      descriere_reteta: "",
      descriere_reteta_fr: "",
      unitate_masura: "U",
      limba: "RO",
    });
  }

  const cancelDouble = (e) => {
    e.preventDefault();
    setSelectedDouble(null);
    setFormData({
      clasa: "Regie",
      cod: "",
      articol: "",
      articol_fr: "",
      descriere_reteta: "",
      descriere_reteta_fr: "",
      unitate_masura: "U",
      limba: "RO",
    });
  }


  const deleteRow = async (e) => {
    e.preventDefault();
    console.log(selectedDelete);
    try {
      const response = await api.delete(`/Retete/deleteReteta/${selectedDelete}`);
      console.log(response);
      setSelectedDelete(null);
      handleReload();

    } catch (error) {
      console.error('Error deleting data:', error);
    }
  }

  return (

    <div className='h-screen w-full flex items-center justify-center'>
      <div className="containerZ h-90h w-[97%] relative flex overflow-hidden  flex-col items-center rounded-lg">
        <div className='w-full containerWhiter '>
          <div className="flex justify-center flex-col items-center text-black  ">
            <form onSubmit={handleSubmit} className="w-full p-4 pt-4 px-2 md:px-4 xl:px-6 rounded-xl">
              <div onClick={(console.log(selectedDelete, selectedEdit, selectedDouble))} className={`grid text-sm ${"grid-cols-[auto_auto_auto_1fr_1fr_1fr_1fr_auto_auto]"} gap-2 md:gap-4 items-center`}>
                {/* FR sau nu */}
                <div className="flex flex-col items-center">
                  <label htmlFor="unit" className="col-span-1 font-medium text-black">
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
                <div className="flex flex-col items-center ">
                  <label className=" font-medium text-black">
                    Cod
                  </label>
                  <input
                    type="text"
                    id="cod"
                    name="cod"
                    value={formData.cod}
                    onChange={handleChange}
                    maxLength={18}
                    className="px-2 outline-none text-center py-2 max-w-40  rounded-lg shadow-sm "
                  />
                </div>

                {
                  formData.limba === "RO" ?
                    <div className="flex flex-col items-center">
                      <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Clasă
                      </label>
                      <select
                        id="clasa"
                        name="clasa"
                        value={formData.clasa}
                        onChange={handleChange}
                        className=" px-1 py-2 rounded-lg max-w-96 outline-none shadow-sm "
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
                    :
                    <div className="flex flex-col items-center">
                      <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Clasă
                      </label>
                      <select
                        id="clasa"
                        name="clasa"
                        value={formData.clasa}
                        onChange={handleChange}
                        className=" px-1 py-2 rounded-lg outline-none shadow-sm "
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
                }
                <div className="flex flex-col items-center">
                  <label
                    className=" font-medium text-black"
                  >
                    Articol
                  </label>
                  <textarea
                    rows={3}
                    type="text"
                    id="articol"
                    name="articol"
                    value={formData.articol}
                    onChange={handleChange}
                    className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "

                  />
                </div>
                <div className="flex flex-col items-center">
                  <label
                    className=" font-medium text-black"
                  >
                    Descriere
                  </label>
                  <textarea
                    rows={3}
                    type="text"
                    id="descriere_reteta"
                    name="descriere_reteta"
                    value={formData.descriere_reteta}
                    onChange={handleChange}
                    className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "

                  />
                </div>
                {/* PENTRU FRANCEZA SELECTED */}
                <div className="flex flex-col items-center">
                  <label
                    className=" font-medium text-black"
                  >
                    Articol FR
                  </label>
                  <textarea
                    rows={3}
                    type="text"
                    id="articol_fr"
                    name="articol_fr"
                    value={formData.articol_fr}
                    onChange={handleChange}
                    className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "

                  />
                </div>
                <div className="flex flex-col items-center">
                  <label
                    className=" font-medium text-black"
                  >
                    Descriere FR
                  </label>
                  <textarea
                    rows={3}
                    type="text"
                    id="descriere_reteta_fr"
                    name="descriere_reteta_fr"
                    value={formData.descriere_reteta_fr}
                    onChange={handleChange}
                    className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "

                  />
                </div>
                {/* input form */}
                <div className="flex flex-col items-center">
                  <label htmlFor="unit" className=" font-medium text-black">
                    Unitate
                  </label>
                  <select
                    id="unitate_masura"
                    name="unitate_masura"
                    value={formData.unitate_masura}
                    onChange={handleChange}
                    className=" px-2 py-2   rounded-lg outline-none shadow-sm "
                  >
                    <option value="U">U</option>
                    <option value="m">m</option>
                    <option value="m²">m²</option>
                    <option value="m³">m³</option>
                    <option value="kg">kg</option>
                    <option value="t">t</option>
                    <option value="l">l</option>
                    <option value="Set">Set</option>
                    <option value="Rolă">Rolă</option>
                    <option value="ens">ens</option>
                    <option value="j">j</option>
                  </select>
                </div>

                {
                  !selectedDelete && !selectedEdit && !selectedDouble ?

                    <div className="flex gap-2 items-center ">
                      <button type="submit" className="bg-green-500 hover:bg-green-600 text-black mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3" /> Încarcă</button>
                    </div>
                    :
                    selectedDelete ?
                      <div className="flex gap-2 items-center ">
                        <button onClick={(e) => deleteRow(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-3" /> Șterge</button>
                        <button onClick={(e) => cancelDelete(e)} className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg">Anulează</button>
                      </div>
                      :
                      selectedDouble ?

                        <div className="flex gap-2 items-center ">
                          <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3" />Dublează</button>
                          <button onClick={(e) => cancelDouble(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"> Anulează</button>
                        </div>
                        :
                        <div className="flex gap-2 items-center ">
                          <button type="submit" className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3" />Editează</button>
                          <button onClick={(e) => cancelEdit(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"> Anulează</button>
                        </div>
                }

              </div>
            </form>
          </div>
        </div>
        {/* AICI JOS E TABELUL */}
        <div className="w-full h-full scrollbar-webkit overflow-hidden mt-6">
          <RetetaTable cancelEdit={cancelEdit} cancelDelete={cancelDelete} selectedDouble={selectedDouble} cancelDouble={cancelDouble} setSelectedDouble={setSelectedDouble} reloadKey={reloadKey} selectedDelete={selectedDelete} setFormData={setFormData} setSelectedDelete={setSelectedDelete} selectedEdit={selectedEdit} setSelectedEdit={setSelectedEdit} />
        </div>
      </div>
    </div>
  );
}
