import { faArrowRightArrowLeft, faCancel, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useRef, useState } from 'react'
import api from '../../api/axiosAPI';
import ManoperaTable from './ManoperaTable';

export default function PopupAddManopera({
    setIsPopupOpen,
    isPopupOpen,
    open,
    setOpen,
    delPreviewManopera,
    fetchPreviewManopera
}) {

    const [formData, setFormData] = useState({
        cod_manopera: "",
        descriere: "",
        descriere_fr: "",
        cost_unitar: "0",
        cantitate: "0",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = {
            cod_manopera: formData.cod_manopera.trim(),
            descriere: formData.descriere.trim(),
            descriere_fr: formData.descriere_fr.trim(),
            cost_unitar: parseFloat(formData.cost_unitar.trim()),
            cantitate: parseFloat(formData.cantitate.trim()) || 0,
        };
        if (form.cod_manopera === "" || isNaN(form.cost_unitar) || form.cost_unitar < 0 || isNaN(form.cantitate) || form.cantitate < 0) {
            alert("Toate campurile sunt obligatorii");
            return;
        }
        try {
            await api.post("/Manopera/SetManopera", { form: form, parentId: isPopupOpen });
            const [updatedManopere, manoperaIndex] = await delPreviewManopera(isPopupOpen);
            // console.log("aici", updatedManopere);
            // const parentIndex = updatedManopere.findIndex((row) => row.id == isPopupOpen && row.cod_definitie != null);
            await fetchPreviewManopera(isPopupOpen, manoperaIndex, updatedManopere);

        } catch (error) {
            console.error('Upload error:', error);
        }
        finally {
            setIsPopupOpen(null);
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "cantitate") {
            if (/^\d*$/.test(value)) {
                setFormData((prev) => ({ ...prev, [name]: value }));
            }
        }
        else if (name === "cost_unitar") {
            if (/^\d*\.?\d{0,3}$/.test(value)) {
                setFormData((prev) => ({ ...prev, [name]: value }));
            }
        }
        else if (name === "cod") {
            if (/^\d*$/.test(value)) {
                setFormData((prev) => ({ ...prev, [name]: value }));
            }
        }
        else setFormData((prev) => ({ ...prev, [name]: value }));
    };



    return (
        <>
            <div className='w-full containerZ'>
                <div className="flex justify-center items-center text-black  ">
                    <form onSubmit={handleSubmit} className="w-full p-6 pt-4 md:px-4 xl:px-8 rounded-xl ">
                        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] xxxl:gap-12 md:gap-6 xl:gap-8 items-center">

                            <div className="flex flex-col items-center ">
                                <label htmlFor="code" className=" font-medium text-black">
                                    Cod
                                </label>
                                <input
                                    type="text"
                                    id="cod_manopera"
                                    name="cod_manopera"
                                    value={formData.cod_manopera}
                                    onChange={handleChange}
                                    maxLength={8}
                                    className="px-2 outline-none text-center py-2 max-w-32  rounded-lg shadow-sm "
                                />
                            </div>


                            <div className="flex flex-col items-center">
                                <label

                                    className=" font-medium text-black"
                                >
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


                            <div className="flex flex-col items-center">
                                <label
                                    className=" font-medium text-black"
                                >
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


                            <div className="flex flex-col items-center">
                                <label
                                    htmlFor="cost_unitar"
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
                            <div className="flex flex-col items-center">
                                <label
                                    htmlFor="cantitate"
                                    className=" font-medium text-black"
                                >
                                    Cantitate
                                </label>
                                <input
                                    type="text"
                                    id="cantitate"
                                    name="cantitate"
                                    maxLength={8}
                                    value={formData.cantitate}
                                    onChange={handleChange}
                                    className=" px-2 py-2  text-center max-w-32 w-full outline-none rounded-lg shadow-sm "
                                />
                            </div>
                            <div className="flex gap-2 items-center ">
                                <button type="submit" className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3" />Încarcă</button>
                            </div>

                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
