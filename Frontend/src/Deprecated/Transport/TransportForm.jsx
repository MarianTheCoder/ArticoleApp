import {
  faArrowRightArrowLeft,
  faCancel,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useRef, useState } from "react";
import api from "../../api/axiosAPI";
import TransportTable from "./TransportTable";

export default function TransportForm() {
  const [formData, setFormData] = useState({
    limba: "RO",
    cod_definitie: "",
    clasa_transport: "",
    transport: "",
    transport_fr: "",
    descriere: "",
    descriere_fr: "",
    unitate_masura: "h",
    cost_unitar: "",
  });

  const [itIsFR, setItIsFR] = useState(false); // State to toggle between FR and RO
  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setReloadKey((prevKey) => prevKey + 1); // Trigger child re-render by changing the key
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = {
      limba: formData.limba.trim(),
      cod_definitie: formData.cod_definitie.trim(),
      clasa_transport: formData.clasa_transport.trim(),
      transport: formData.transport.trim(),
      transport_fr: formData.transport_fr ? formData.transport_fr.trim() : "",
      descriere: formData.descriere ? formData.descriere.trim() : "",
      descriere_fr: formData.descriere_fr ? formData.descriere_fr.trim() : "",
      cost_unitar: formData.cost_unitar.trim(),
      unitate_masura: formData.unitate_masura.trim(),
    };
    if (
      form.limba === "" ||
      form.cod_definitie === "" ||
      form.transport === "" ||
      form.cost_unitar === "" ||
      form.clasa_transport === "" ||
      form.unitate_masura === ""
    ) {
      alert(
        "Toate campurile sunt obligatorii (fara FR daca nu e selectata limba FR)"
      );
      return;
    }
    if (form.limba === "FR" && form.transport_fr === "") {
      alert("Toate campurile sunt obligatorii (cu FR)");
      return;
    }
    try {
      if (selectedEdit != null) {
        await api.post("/Transport/EditTransportDef", {
          form: form,
          id: selectedEdit,
        });
        // console.log('Transport edited');
        setSelectedEdit(null);
      } else {
        await api.post("/Transport/SetTransportDef", { form: form, childs: selectedDouble });
        // console.log('Transport added');
        if (selectedDouble != null) {
          setSelectedDouble(null);
        }
      }
      setFormData({
        limba: formData.limba,
        cod_definitie: "",
        clasa_transport: "",
        transport: "",
        transport_fr: "",
        descriere: "",
        descriere_fr: "",
        cost_unitar: "",
        unitate_masura: "h",
      });
      firstInputRef.current.focus();
      handleReload();
    } catch (error) {
      console.error("Upload error:", error);
      firstInputRef.current.focus();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "cost_unitar") {
      if (/^\d*\.?\d{0,3}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
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
      clasa_transport: "",
      transport: "",
      transport_fr: "",
      descriere: "",
      descriere_fr: "",
      cost_unitar: "",
      unitate_masura: "h",
    });
  };

  const cancelDouble = (e) => {
    e.preventDefault();
    setSelectedDouble(null);
    setFormData({
      limba: "RO",
      cod_definitie: "",
      clasa_transport: "",
      transport: "",
      transport_fr: "",
      descriere: "",
      descriere_fr: "",
      cost_unitar: "",
      unitate_masura: "h",
    });
  };

  const deleteRow = async (e) => {
    e.preventDefault();
    try {
      const response = await api.delete(
        `/Transport/DeleteTransportDef/${selectedDelete}`
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

  return (
    <>
      <div className="w-full containerWhiter">
        <div className="flex justify-center items-center text-black  ">
          <form
            onSubmit={handleSubmit}
            className="w-full p-6 pt-4 px-12 rounded-xl shadow-xl"
          >
            <div className="grid grid-cols-[auto_auto_auto_1fr_auto_auto_auto] xxxl:gap-8 md:gap-4 xl:gap-6 items-center">
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
                  className=" px-2 py-2 rounded-lg outline-none shadow-sm "
                >
                  <option value="RO">RO</option>
                  <option value="FR">FR</option>
                </select>
              </div>
              {/* photourl */}
              <div className="flex flex-col items-center ">
                <label htmlFor="code" className=" font-medium text-black">
                  Cod
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  id="cod_definitie"
                  name="cod_definitie"
                  value={formData.cod_definitie}
                  onChange={handleChange}
                  maxLength={12}
                  className="px-2 outline-none text-center py-2 max-w-48  rounded-lg shadow-sm "
                  placeholder=""
                />
              </div>
              <div className="flex flex-col items-center ">
                <label htmlFor="code" className=" font-medium text-black">
                  Clasă
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  id="clasa_transport"
                  name="clasa_transport"
                  value={formData.clasa_transport}
                  onChange={handleChange}
                  maxLength={55}
                  className="px-2 outline-none text-center py-2 max-w-64  rounded-lg shadow-sm "
                />
              </div>
              {/* container smecher pentru RO/FR */}
              <div className=" grid grid-cols-[auto_1fr_2fr] gap-4 border p-2 rounded-lg border-black">
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
                        Transport
                      </label>
                      <textarea
                        rows={1}
                        type="text"
                        id="transport"
                        name="transport"
                        value={formData.transport}
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
                        rows={1}
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
                        Transport FR
                      </label>
                      <textarea
                        type="text"
                        rows={1}
                        id="transport_fr"
                        name="transport_fr"
                        value={formData.transport_fr}
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
                        rows={1}
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
              <div className="flex flex-col items-center">
                {/* Unit Dropdown */}
                <label
                  htmlFor="unit"
                  className="col-span-1 font-medium text-black"
                >
                  Unitate
                </label>
                <select
                  id="unitate_masura"
                  name="unitate_masura"
                  value={formData.unitate_masura}
                  onChange={handleChange}
                  className="px-4 py-2 border  rounded-lg outline-none shadow-sm "
                >
                  <option value="h">h</option>
                  <option value="m³">m³</option>
                  <option value="kg">kg</option>
                  <option value="Tonă">Tonă</option>
                  <option value="ens">ens</option>
                  <option value="j">j</option>
                </select>
              </div>
              <div className="flex flex-col items-center">
                <label
                  htmlFor="description"
                  className=" font-medium text-black"
                >
                  Cost Unitar
                </label>
                <input
                  type="text"
                  id="cost_unitar"
                  name="cost_unitar"
                  maxLength={8}
                  value={formData.cost_unitar}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-32 w-full outline-none rounded-lg shadow-sm "
                />
              </div>
              {!selectedDelete && !selectedEdit && !selectedDouble ? (
                <div className="flex gap-2 items-center ">
                  <button
                    type="submit"
                    className="bg-green-400 hover:bg-green-500 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"
                  >
                    <FontAwesomeIcon icon={faPlus} className="pr-3" />
                    Încarcă
                  </button>
                </div>
              ) : selectedDelete ? (
                <div className="flex gap-2 items-center ">
                  <button
                    onClick={(e) => deleteRow(e)}
                    className="bg-red-500 hover:bg-red-500 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg"
                  >
                    <FontAwesomeIcon icon={faCancel} className="pr-3" />
                    Șterge
                  </button>
                  <button
                    onClick={(e) => cancelDelete(e)}
                    className="bg-green-400 hover:bg-green-500 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg"
                  >
                    Anulează
                  </button>
                </div>
              ) : selectedDouble ? (
                <div className="flex gap-2 items-center ">
                  <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-500 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"
                  >
                    <FontAwesomeIcon icon={faPlus} className="pr-3" />
                    Dublează
                  </button>
                  <button
                    onClick={(e) => cancelDouble(e)}
                    className="bg-red-400 hover:bg-red-500 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"
                  >
                    {" "}
                    Anulează
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-center ">
                  <button
                    type="submit"
                    className="bg-green-400 hover:bg-green-500 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"
                  >
                    <FontAwesomeIcon icon={faPlus} className="pr-3" />
                    Editează
                  </button>
                  <button
                    onClick={(e) => cancelEdit(e)}
                    className="bg-red-400 hover:bg-red-500 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"
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
        <TransportTable
          selectedDouble={selectedDouble}
          cancelDouble={cancelDouble}
          setSelectedDouble={setSelectedDouble}
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
