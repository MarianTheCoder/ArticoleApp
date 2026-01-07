import {
    faClone,
    faForwardFast,
    faPlusCircle,
    faX,
    faTrash,
    faUser,
    faTrowelBricks,
    faTruck,
    faCar,
    faFolder,
    faFolderPlus,
    faFilePdf,
    faFileImage,
    faFile,
    faRotate,
    faChevronLeft,
    faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useMemo, useState, useRef, useEffect } from "react";
import SarciniReteteOfertaModal from "./AdaugaSarcina/SarciniReteteOfertaModal";
import { OverflowPopover } from "../OverflowPopover";
import SarciniReteteModal from "./AdaugaSarcina/SarciniReteteModal";
import SarciniRapideModal from "./AdaugaSarcina/SarciniRapideModal";
import api from "../../../api/axiosAPI";
import photoAPI from "../../../api/photoAPI";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from "react-datepicker";
import { format } from "date-fns";

// Icon based on tip (whatIs)

function TipIcon({ what }) {
    if (what === "Manopera")
        return <FontAwesomeIcon icon={faUser} className="text-green-600" />;
    if (what === "Material")
        return <FontAwesomeIcon icon={faTrowelBricks} className="text-amber-600" />;
    if (what === "Utilaj")
        return <FontAwesomeIcon icon={faTruck} className="text-violet-600" />;
    if (what === "Transport")
        return <FontAwesomeIcon icon={faCar} className="text-pink-600" />;
    return <FontAwesomeIcon icon={faFolder} className="text-blue-600" />;
}

const fmtQty = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(3) : "0.000";
};
const fmtMoney = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};
const fmtHHMM = (hoursFloat) => {
    if (!Number.isFinite(hoursFloat) || hoursFloat <= 0) return "00:00";
    const h = Math.floor(hoursFloat);
    const m = Math.round((hoursFloat - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// helper: calc timp (ore) și cost pentru un array
const calcTimeCost = (rows) => {
    let totalHours = 0;
    let totalCost = 0;
    for (const r of rows) {
        const qty = Number(r.alloc_input ?? r.cantitate ?? 0);
        const manop = Number(r.manopera_qty ?? r.manopera_cantitate ?? 0);
        const unitCost = Number(r.cost ?? 0);
        totalHours += manop * qty;
        totalCost += qty * unitCost;
    }
    return { hours: totalHours, cost: totalCost };
};

export default function SarcinaAdauga({ setModalSarcinaAdauga }) {
    const [reteteOfertaModal, setReteteOfertaModal] = useState(false);
    const [reteteModal, setReteteModal] = useState(false);
    const [sarciniRapideModal, setSarciniRapideModal] = useState(false);

    const [selectedRetete, setSelectedRetete] = useState([]);
    const [selectedRetete2, setSelectedRetete2] = useState([]);
    const [sarciniRapide, setSarciniRapide] = useState([]);

    const [selectedLimba, setSelectedLimba] = useState("RO");
    // Controlled filters (persist across modal open/close)
    const [ofertaId, setOfertaId] = useState(null);
    const [ofertaPartId, setOfertaPartId] = useState(null);

    //files states
    const [dragActive, setDragActive] = useState(false);
    const [images, setImages] = useState([]); // File[]
    const [docs, setDocs] = useState([]);     // File[]


    //textarea and datepicker 
    const [selectedDate, setSelectedDate] = useState(null);
    const [notes, setNotes] = useState("");


    // 🔹 NEW: materiale (grouped) returned by backend
    const [neededMaterials, setNeededMaterials] = useState([]); // [{ furnizor, cod, denumire, descriere, photoUrl, pret_vanzare, unitate_masura, total_qty }]

    const fileInputRef = useRef(null);

    // merged rows pentru afișare + tag sursă
    const mergedRows = useMemo(
        () => [
            ...selectedRetete.map((r) => ({ ...r, __from: "oferta" })),
            ...selectedRetete2.map((r) => ({ ...r, __from: "retete" })),
        ],
        [selectedRetete, selectedRetete2]
    );

    // calc separat: ofertă, db, total – returnăm ca stringuri pentru UI
    const totals = useMemo(() => {
        const oferta = calcTimeCost(selectedRetete);
        const db = calcTimeCost(selectedRetete2);
        const total = { hours: oferta.hours + db.hours, cost: oferta.cost + db.cost };

        return {
            timeOfertaHHMM: fmtHHMM(oferta.hours),
            timeDbHHMM: fmtHHMM(db.hours),
            timeTotalHHMM: fmtHHMM(total.hours),
            costOfertaStr: fmtMoney(oferta.cost),
            costDbStr: fmtMoney(db.cost),
            costTotalStr: fmtMoney(total.cost),
        };
    }, [selectedRetete, selectedRetete2]);

    // remove by id din ambele liste
    const removeSelected = (id) => {
        setSelectedRetete((prev) => prev.filter((r) => r.id !== id));
        setSelectedRetete2((prev) => prev.filter((r) => r.id !== id));
    };

    // returnează true dacă e png/jpeg
    const isImage = (f) => /^image\/(png|jpe?g)$/.test(f.type.toLowerCase());

    // adaugă fișierele în state respectând limita de 3 imagini
    const handleFiles = (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        const newImgs = [];
        const newDocs = [];

        for (const f of files) {
            if (isImage(f)) newImgs.push(f);
            else newDocs.push(f);
        }

        // cap imagini: 3 total
        setImages((prev) => {
            const remaining = Math.max(0, 3 - prev.length);
            const toAdd = remaining > 0 ? newImgs.slice(0, remaining) : [];
            return [...prev, ...toAdd];
        });

        // docs nelimitat
        setDocs((prev) => [...prev, ...newDocs]);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer?.files?.length) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const onSelectClick = () => {
        fileInputRef.current?.click();
    };

    const onFileInputChange = (e) => {
        handleFiles(e.target.files);
        e.target.value = "";
    };

    const removeImageAt = (idx) => {
        setImages((prev) => prev.filter((_, i) => i !== idx));
    };
    const removeDocAt = (idx) => {
        setDocs((prev) => prev.filter((_, i) => i !== idx));
    };

    const fetchMaterialeForSelectedRetete = async () => {
        try {
            const db = selectedRetete2.map(r => ({ id: r.id, qty: r.alloc_input }));
            const oferta = selectedRetete.map(r => ({ id: r.id, qty: r.alloc_input }));
            const response = await api.post('/Sarcini/getMaterialeForSelectedRetete', { db, oferta });
            // 🔹 keep plain rows if ever needed: response.data.rows
            // 🔹 we use grouped_all for the visual "Materiale necesare"
            setNeededMaterials(response.data?.grouped_all || []);
            // console.log("Materiale for selected retete:", response.data);
        } catch (error) {
            console.log("Error fetching materiale for selected retete:", error);
            setNeededMaterials([]);
        }
    };

    useEffect(() => {
        if (selectedRetete.length > 0 || selectedRetete2.length > 0) {
            fetchMaterialeForSelectedRetete();
        } else {
            setNeededMaterials([]);
        }
    }, [selectedRetete, selectedRetete2]);

    // Lightbox state
    const [lbOpen, setLbOpen] = useState(false);
    const [lbIndex, setLbIndex] = useState(0);
    const [lbSlides, setLbSlides] = useState([]);

    // keep track of object URLs to revoke when closing
    const lbUrlCacheRef = useRef([]);

    // open lightbox for a list of srcs, focusing startIndex
    const openLightbox = (srcList, startIndex = 0) => {
        setLbSlides(
            srcList.map((src) => ({ src }))
        );
        setLbIndex(startIndex);
        setLbOpen(true);
    };

    // close & cleanup
    const closeLightbox = () => {
        setLbOpen(false);
    };

    // open from local File[] (creates object URLs)
    const openLightboxFromFiles = (files, startIndex) => {
        const urls = files.map((f) => {
            const u = URL.createObjectURL(f);
            return u;
        });
        openLightbox(urls, startIndex);
    };

    // download a File (pdf/anything non-image)
    const downloadFile = (file) => {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name || "document";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <div className="w-3/4 h-5/6 containerAdauga text-base flex flex-col bg-white rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-300">
                    <h2 className="font-semibold">Adaugă sarcină</h2>
                    <button
                        onClick={() => setModalSarcinaAdauga(false)}
                        className="rounded-lg p-2 bg-red-500 text-white hover:bg-red-600"
                    >
                        <FontAwesomeIcon icon={faX} />
                    </button>
                </div>

                {/* Selected rețete table (read-only, minimal columns) */}
                <div className="flex-1 flex-col flex gap-4 overflow-hidden p-4">
                    <div className="h-full overflow-y-auto overflow-x-hidden min-w-0 flex flex-col gap-4">
                        <div className="w-full gap-6 flex">
                            <textarea
                                rows={4}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notă sarcină..."
                                className="w-full p-3 border  border-gray-400 rounded-lg resize-none focus:outline-blue-400"
                            />
                            <div className="flex flex-col items-center justify-center gap-2">
                                <label className="font-medium flex w-full justify-between  items-center gap-2 pr-2">Dată limită <FontAwesomeIcon icon={faRotate} onClick={() => setSelectedDate(null)} className="text-blue-500 text-lg hover:text-blue-600 cursor-pointer hover:rotate-180 transition-transform duration-300" /></label>
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    dateFormat="yyyy-MM-dd"
                                    className="p-2 border border-gray-400 rounded-lg"
                                    calendarStartDay={1}
                                    minDate={new Date()}
                                    renderCustomHeader={({
                                        date,
                                        decreaseMonth,
                                        increaseMonth,
                                        prevMonthButtonDisabled,
                                        nextMonthButtonDisabled,
                                    }) => (
                                        <div className="flex items-center justify-between px-3 ">
                                            <button
                                                type="button"
                                                onClick={decreaseMonth}
                                                disabled={prevMonthButtonDisabled}
                                                className="p-2 rounded hover:bg-gray-100 disabled:opacity-40"
                                            >
                                                <FontAwesomeIcon icon={faChevronLeft} />
                                            </button>
                                            <div className="font-semibold">
                                                {format(date, "MMMM yyyy")}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={increaseMonth}
                                                disabled={nextMonthButtonDisabled}
                                                className="p-2 rounded hover:bg-gray-100 disabled:opacity-40"
                                            >
                                                <FontAwesomeIcon icon={faChevronRight} />
                                            </button>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="flex mt-4 w-full">
                            <div
                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={onDrop}
                                onClick={onSelectClick}
                                className={` flex items-center justify-center w-full h-48 outline-dashed outline-2 transition-all  rounded-lg ${dragActive ? 'outline-offset-[-12px] bg-blue-100 outline-blue-300' : 'bg-blue-200 cursor-pointer hover:bg-blue-100 -outline-offset-8 outline-blue-400'}`}
                            >
                                <div className={`flex flex-col ${dragActive ? 'pointer-events-none' : ''}`}>
                                    <FontAwesomeIcon icon={faFolderPlus} className={`text-6xl ${dragActive ? 'text-blue-400' : 'text-blue-600'} mb-4 mx-auto`} />
                                    <span><span className="font-semibold">Alege un fișier</span> sau trage un fișier aici</span>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/png,image/jpeg,application/pdf,*/*"
                                    className="hidden"
                                    onChange={onFileInputChange}
                                />
                            </div>
                        </div>
                        <div className="flex mt-2 gap-12">
                            {/* Previews imagini */}
                            {images.length > 0 && (
                                <div className="">
                                    <div className="text-sm font-semibold mb-1">
                                        Poze ({images.length}/3)
                                    </div>
                                    <div className="flex  gap-3">
                                        {images.map((f, idx) => {
                                            const url = URL.createObjectURL(f);
                                            return (
                                                <div className="relative w-24 h-24" key={`img-${idx}`}>
                                                    <div
                                                        className="relative mt-3 w-full h-full border-2 rounded-2xl cursor-pointer overflow-hidden bg-white "
                                                        onClick={() => openLightboxFromFiles(images, idx)}
                                                        title="Previzualizează"
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={f.name}
                                                            className="w-full h-full object-contain"
                                                            onLoad={() => URL.revokeObjectURL(url)}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeImageAt(idx); }}
                                                        className="absolute top-1 -right-3 bg-rose-500 hover:bg-rose-600 text-white text-xs p-[6px] rounded-full"
                                                        title="Șterge"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Lista documente */}
                            {docs.length > 0 && (
                                <div className="">
                                    <div className="text-sm font-semibold mb-1">Documente ({docs.length})</div>
                                    <div className="flex flex-wrap gap-3">
                                        {docs.map((f, idx) => {
                                            const isPdf = f.type.toLowerCase() === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
                                            const isImg = isImage(f);
                                            const icon = isPdf ? faFilePdf : (isImg ? faFileImage : faFile);
                                            return (
                                                <div className="relative w-24 h-24" key={`doc-${idx}`}>
                                                    <div className="relative w-full h-full mt-3 flex flex-col bg-white">
                                                        <div className="flex-1 cursor-pointer flex items-center border-2 rounded-t-2xl justify-center"
                                                            onClick={() => {
                                                                downloadFile(f);
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={icon} className={` ${isPdf ? "text-red-600" : (isImg ? "text-blue-600" : "text-gray-600")} text-3xl`} />
                                                        </div>
                                                        <div className=" bg-black/50 relative p-2 rounded-b-2xl text-white text-xs text-center w-full max-w-full " title={f.name}>
                                                            <OverflowPopover maxLines={1} text={f.name} />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeDocAt(idx); }}
                                                        className="absolute top-1 -right-3 bg-rose-500 hover:bg-rose-600 text-white text-xs p-[6px] rounded-full"
                                                        title="Șterge"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        {mergedRows.length === 0 || reteteOfertaModal ? (
                            <div className="w-full h-full min-h-60 flex items-center justify-center text-gray-500 italic">
                                Nicio rețetă selectată încă.
                            </div>
                        ) : (
                            <div className="mt-6 bg-blue-100 p-4 rounded-xl">
                                <div className="mb-2 text-base font-semibold">Rețete selectate</div>
                                <table className="w-full table-fixed  text-sm border border-gray-300">
                                    <thead className="sticky top-0 bg-gray-200 text-black z-10">
                                        <tr className="h-14">
                                            <th className="border border-gray-300 p-2 text-center w-[3rem]">Logo</th>
                                            <th className="border border-gray-300 p-2 text-center w-[6rem]">Reper 1</th>
                                            <th className="border border-gray-300 p-2 text-center w-[6rem]">Reper 2</th>
                                            <th className="border border-gray-300 p-2 text-center w-[7rem]">Cod</th>
                                            <th className="border border-gray-300 p-2 text-center w-[30%]">
                                                <div className="flex justify-between items-center">Articol
                                                    <span onClick={() => setSelectedLimba((prev) => prev === 'RO' ? 'FR' : 'RO')} className="mr-4 h-9 w-9 font-semibold  flex items-center justify-center select-none cursor-pointer rounded-full text-green-600 border-green-600 hover:border-green-700 hover:text-green-700 border">{selectedLimba}</span>
                                                </div>
                                            </th>
                                            <th className="border border-gray-300 p-2 text-center w-[20%]">Descriere</th>
                                            <th className="border border-gray-300 p-2 text-center w-[7ch]">U.M.</th>
                                            <th className="border border-gray-300 p-2 text-center w-[10ch]">Cantitate</th>
                                            <th className="border border-gray-300 p-2 text-center w-[10ch]">Preț unitar</th>
                                            <th className="border border-gray-300 p-2 text-center w-[10ch]">Total</th>
                                            <th className="border border-gray-300 p-2 text-center w-[4rem]">Șterge</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mergedRows.map((r) => {
                                            const qty = Number(r.alloc_input ?? r.cantitate ?? 0);
                                            const cost = Number(r.cost ?? 0);
                                            const total = qty * cost;

                                            const blue = r.__from === "retete"; // din baza de date
                                            const rowTextClass = blue ? "text-blue-600" : "";

                                            return (
                                                <tr key={r.id} className={`bg-white hover:bg-gray-50 h-[3.75rem] ${rowTextClass}`}>
                                                    <td className="border border-gray-300 text-lg p-2 text-center">
                                                        <TipIcon what={r?.whatIs} />
                                                    </td>
                                                    <td className="border border-gray-300 p-2">
                                                        <div className="truncate" >{r?.detalii_aditionale || r?.reper1 || ""}</div>
                                                    </td>
                                                    <td className="border border-gray-300 p-2">
                                                        <div className="truncate" >{r?.reper_plan || r?.reper2 || ""}</div>
                                                    </td>
                                                    <td className="border border-gray-300 p-2">
                                                        <div className="truncate" title={r?.cod || ""}>{r?.cod || ""}</div>
                                                    </td>
                                                    <td className="border relative border-gray-300 p-2">
                                                        <OverflowPopover text={selectedLimba === 'RO' ? r?.articol || "" : r?.articol_fr || ""} />
                                                    </td>
                                                    <td className="border relative border-gray-300 p-2">
                                                        <OverflowPopover text={selectedLimba === 'RO' ? r?.descriere || r?.descriere_reteta || "" : r?.descriere_fr || r?.descriere_reteta_fr || ""} />
                                                    </td>
                                                    <td className="border border-gray-300 p-2 text-center">{r?.unitate_masura || ""}</td>
                                                    <td className="border border-gray-300 p-2 text-right font-semibold">{fmtQty(qty)}</td>
                                                    <td className="border border-gray-300 p-2 text-right font-semibold">{fmtMoney(cost)}</td>
                                                    <td className="border border-gray-300 p-2 text-right font-semibold">{fmtMoney(total)}</td>
                                                    <td className="border border-gray-300 p-2 text-center">
                                                        <button
                                                            onClick={() => removeSelected(r.id)}
                                                            className="px-2 py-1 rounded text-white bg-rose-500 hover:bg-rose-600"
                                                            title="Elimină rețeta din selecție"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 🔹 NEW: Materiale necesare (grouped) */}
                        {neededMaterials.length > 0 && (
                            <div className="mt-6 p-4 bg-blue-100 rounded-xl">
                                <div className="mb-2 text-base font-semibold">Materiale necesare</div>
                                <table className="w-full table-fixed text-sm border border-gray-300">
                                    <thead className="bg-gray-200 text-black">
                                        <tr className="h-12">
                                            <th className="border border-gray-300 p-2 text-center w-[14%]">Furnizor</th>
                                            <th className="border border-gray-300 p-2 text-center w-[10%]">Cod</th>
                                            <th className="border border-gray-300 p-2 text-center   w-[24%]">Denumire</th>
                                            <th className="border border-gray-300 p-2 text-center   w-[28%]">Descriere</th>
                                            <th className="border border-gray-300 p-2 text-center w-[7ch]">U.M.</th>

                                            <th className="border border-gray-300 p-2 text-center w-[7rem]">Poză</th>
                                            <th className="border border-gray-300 p-2 text-center w-[12ch]">Preț Unitar</th>
                                            <th className="border border-gray-300 p-2 text-center w-[12ch]">Preț Total</th>

                                            <th className="border border-gray-300 p-2 text-center w-[12ch]">Cantitate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {neededMaterials.map((m, i) => (
                                            <tr key={`mat-${i}`} className="bg-white hover:bg-gray-50">
                                                <td className="border border-gray-300 p-2 text-center">
                                                    {m.furnizor || "-"}
                                                </td>
                                                <td className="border border-gray-300 p-2 text-center">
                                                    <div className="truncate" title={m.cod || ""}>{m.cod || ""}</div>
                                                </td>
                                                <td className="border border-gray-300 p-2">
                                                    <OverflowPopover text={selectedLimba == "RO" ? m.denumire || "" : m.denumire_fr || ""} maxLines={2} />
                                                </td>
                                                <td className="border border-gray-300 p-2">
                                                    <OverflowPopover text={selectedLimba == "RO" ? m.descriere || "" : m.descriere_fr || ""} maxLines={2} />
                                                </td>
                                                <td className="border border-gray-300 p-2 text-center">
                                                    {m.unitate_masura || ""}
                                                </td>
                                                <td className="border border-gray-300 p-2">
                                                    <div className="flex items-center justify-center h-full">
                                                        {m.photoUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={photoAPI + "/" + m.photoUrl}
                                                                alt=""
                                                                className="h-8 w-12 object-contain rounded"
                                                            />
                                                        ) : (
                                                            ""
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="border border-gray-300 p-2 text-right font-semibold">
                                                    {fmtMoney(m.pret_vanzare)}
                                                </td>
                                                <td className="border border-gray-300 p-2 text-right font-semibold">
                                                    {fmtMoney(m.pret_vanzare * m.total_qty)}
                                                </td>
                                                <td className="border border-gray-300 p-2 text-right font-semibold">
                                                    {fmtQty(m.total_qty)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 mt-2">
                        {/* număr total + split */}
                        <div onClick={() => console.log(selectedRetete2, selectedRetete)} className="flex justify-center items-center gap-2 p-3 bg-gray-200 rounded-full px-6">
                            Rețete selectate:{" "}
                            <span className="font-semibold">
                                {selectedRetete.length} + <span className="text-blue-500">{selectedRetete2.length}</span> = <span className="text-orange-500">{selectedRetete.length + selectedRetete2.length}</span>
                            </span>
                        </div>

                        {/* timp: ofertă + db = total */}
                        <div className="flex justify-center items-center gap-2 p-3 bg-gray-200 rounded-full px-6">
                            Timp estimat:{" "}
                            <span className="font-semibold">
                                {totals.timeOfertaHHMM} + <span className="text-blue-500">{totals.timeDbHHMM}</span> = <span className="text-orange-500">{totals.timeTotalHHMM}</span>
                            </span>
                        </div>

                        {/* cost: ofertă + db = total */}
                        <div className="flex justify-center items-center gap-2 p-3 bg-gray-200 rounded-full px-6">
                            Cost estimat:{" "}
                            <span className="font-semibold">
                                {totals.costOfertaStr} + <span className="text-blue-500">{totals.costDbStr}</span> = <span className="text-orange-500">{totals.costTotalStr}</span>
                            </span>
                        </div>

                        <div className="flex justify-center items-center gap-2 p-3 bg-gray-200 rounded-full px-6">
                            Săptămâna limită:{" "}
                            <span className="font-semibold">
                                {selectedDate ? format(selectedDate, 'w') : 'Nicio dată selectată'}
                            </span>
                        </div>

                        <div className="flex-1" />
                    </div>

                </div>

                {/* Footer summary + actions */}
                <div className="w-full text-base items-center bg-gray-200 flex gap-4 p-4">
                    <button
                        onClick={() => setReteteOfertaModal(true)}
                        className="border bg-blue-500 flex-1 hover:bg-blue-600 hover:outline-gray-300 hover:outline outline-offset-0 p-2 flex items-center justify-center gap-2 py-3 rounded-full text-white font-semibold"
                    >
                        <FontAwesomeIcon className="text-lg" icon={faClone} />
                        Adaugă Rețetă din Ofertă
                    </button>
                    <button onClick={() => setReteteModal(true)} className="border bg-blue-500 flex-1 hover:bg-blue-600 hover:outline-gray-300 hover:outline outline-offset-0 p-2 flex items-center justify-center gap-2 py-3 rounded-full text-white font-semibold">
                        <FontAwesomeIcon className="text-xl" icon={faPlusCircle} />
                        Adaugă Rețetă din Baza de Date
                    </button>
                </div>
            </div>
            <Lightbox
                open={lbOpen}
                close={closeLightbox}
                index={lbIndex}
                slides={lbSlides}
                plugins={[Zoom, Thumbnails]}
                controller={{ closeOnBackdropClick: true }}
            />

            {/* Child modal (fully functional) — controlled oferta filters are passed down */}
            {reteteOfertaModal && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-[60]">
                    <SarciniReteteOfertaModal
                        setReteteOfertaModal={setReteteOfertaModal}
                        selectedRetete={selectedRetete}
                        onSelectionChange={setSelectedRetete}
                        ofertaId={ofertaId}
                        setOfertaId={setOfertaId}
                        ofertaPartId={ofertaPartId}
                        setOfertaPartId={setOfertaPartId}
                    />
                </div>
            )}
            {reteteModal && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-[60]">
                    <SarciniReteteModal
                        setReteteModal={setReteteModal}
                        selectedRetete={selectedRetete2}
                        onSelectionChange={setSelectedRetete2}
                    />
                </div>
            )}
            {/* {sarciniRapideModal && (
                <div className="fixed top-0 left-0 w-full bg-black/30  h-full flex items-center justify-center z-[60]">
                    <SarciniRapideModal
                        setSarciniRapideModal={setSarciniRapideModal}
                        selectedSarcini={sarciniRapide}
                        onSelectionChange={setSarciniRapide}
                    />
                </div>
            )} */}
        </>
    );
}