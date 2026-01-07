import { useContext, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowsSpin, faEye, faDatabase, faFilePen, faHelmetSafety, faHouse, faL, faNewspaper,
    faPeopleGroup, faPhone, faRightFromBracket, faUser, faUserPlus, faChevronRight, faFile,
    faH, faServer, faMinimize, faMinus, faScrewdriverWrench, faPerson, faTruck, faVanShuttle,
    faCar, faUserTie, faUsersGear, faGears, faRightToBracket, faFileShield, faUserTag, faPlus,
    faCancel, faMapLocationDot, faBars, faCircleXmark, faRectangleXmark, faCalendarDays, faCalendarDay, faLink
} from "@fortawesome/free-solid-svg-icons";
import photo from '../assets/no-user-image-square.jpg';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';
import Logo from '../assets/logo.svg';
import photoAPI from '../api/photoAPI';
import api from '../api/axiosAPI';
import "../assets/navbar.css";
import GradientFA from './GradientFA';

function Navbar() {
    const [navbarVisible, setNavbarVisible] = useState(false);
    const navbarRef = useRef(null);

    const [selectedBeneficiari, setSelectedBeneficiari] = useState([]);
    const [addSantier, setAddSantier] = useState(false);
    const [santierName, setSantierName] = useState("");

    const [bazaDeDateOpen, setBazaDeDateOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [prezOpen, setPrezOpen] = useState(false);
    const [usersOpen, setUsersOpen] = useState(false);
    const [santiereOpen, setSantiereOpen] = useState(false);

    let navigate = useNavigate();
    const { user, logout, getUsersForSantiere, beneficiari, santiere, connectedSantiereToUser, setConnectedSantiereToUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const photoStorage = localStorage.getItem("photoUser");

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navbarRef.current && !navbarRef.current.contains(event.target)) {
                setNavbarVisible(false);
            }
        };
        if (navbarVisible) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [navbarVisible]);

    useEffect(() => {
        getUsersForSantiere();
        setLoading(false);
    }, []);

    const handleBeneficiarClick = (beneficiarId) => {
        setSelectedBeneficiari((prevSelected) => {
            if (prevSelected.includes(beneficiarId)) {
                return prevSelected.filter((id) => id !== beneficiarId);
            } else {
                return [...prevSelected, beneficiarId];
            }
        });
    };

    const addSantierToUser = async () => {
        if (santierName.trim() === "") {
            alert("Numele santierului nu poate fi gol");
        }
        try {
            const response = await api.post(`/users/addSantier`, { userId: addSantier, name: santierName });
            setAddSantier(false);
            getUsersForSantiere();
        } catch (err) {
            console.error('Login failed:', err.response?.data?.message || err.message);
            return err;
        }
    };

    useEffect(() => {
        if (!Array.isArray(beneficiari) || beneficiari.length === 0) return;
        if (!Array.isArray(santiere)) return;

        const byUser = santiere.reduce((acc, s) => {
            (acc[s.user_id] ||= []).push(s);
            return acc;
        }, {});

        const usersWithSantiere = beneficiari.map(u => ({
            ...u,
            santiere: byUser[u.id] || [],
        }));

        const langRank = (l) => (l === 'RO' ? 0 : l === 'FR' ? 1 : 2);

        const sorted = [...usersWithSantiere].sort((a, b) => {
            const la = langRank(a.limba);
            const lb = langRank(b.limba);
            if (la !== lb) return la - lb;
            return (a.name || '').localeCompare(b.name || '');
        });

        const pin = 'Baly Energies SAS'.toLowerCase();
        const idx = sorted.findIndex(x => (x.name || '').toLowerCase().includes(pin));
        if (idx >= 0) {
            const [first] = sorted.splice(idx, 1);
            sorted.unshift(first);
        }

        setConnectedSantiereToUser(sorted);
    }, [beneficiari, santiere]);

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={() => setNavbarVisible(prev => !prev)}
                className={`fixed top-4 left-4 z-[150] bg-gradient-to-r from-emerald-500 to-green-500
        ${navbarVisible ? '-translate-x-24' : 'translate-x-0'} text-white px-3 py-2 rounded-xl shadow
        hover:shadow-emerald-200/50 transition-all duration-300`}
                aria-label="Toggle navigation"
            >
                <FontAwesomeIcon icon={faBars} />
            </button>

            {!loading && (
                <div
                    ref={navbarRef}
                    className={`
                        text-black
                        h-full fixed top-0 left-0 z-[200] max-w-[22rem] w-full
                        transform transition-transform duration-300 ease-in-out
                        ${navbarVisible ? 'translate-x-0' : '-translate-x-full'}
                        bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-xl
                        border-r border-slate-200/70 shadow-2xl
                        flex flex-col  /* ⬅️ important */
                    `}
                    style={{ willChange: 'transform' }}
                >
                    {/* Header sticky */}
                    <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl">
                        <div className="flex items-center justify-center px-4 py-2">
                            <div className="flex items-center gap-3">
                                <img src={Logo} alt="Website Logo" className="h-10 w-auto object-contain" />
                            </div>
                        </div>
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-2 pb-3 pt-2">
                        <ul className='flex flex-col gap-1 select-none'>

                            {/* Baza de date */}
                            {user.role == "ofertant" ? (
                                <>
                                    <div
                                        className="text-[1.25rem] cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-100 transition
                    border border-transparent hover:border-slate-200"
                                        onClick={() => setBazaDeDateOpen((prev) => !prev)}
                                        aria-expanded={bazaDeDateOpen}
                                    >
                                        <div className="flex items-center w-full">
                                            <FontAwesomeIcon className={`text-sm w-6 mr-1 transition-transform ${bazaDeDateOpen ? "rotate-90" : ""}`} icon={faChevronRight} />
                                            <div className="flex items-center gap-3">
                                                <div className='w-7 h-7 grid place-items-center rounded-lg  text-emerald-600'>
                                                    <FontAwesomeIcon icon={faServer} />
                                                </div>
                                                <div className="font-semibold text-slate-800">Bază de date</div>
                                            </div>
                                        </div>
                                    </div>

                                    {bazaDeDateOpen && (
                                        <div className="ml-3 pl-3 border-l border-slate-200/70 space-y-1">
                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-100 transition
                        border border-transparent hover:border-slate-200"
                                                onClick={() => setDateOpen((prev) => !prev)}
                                                aria-expanded={dateOpen}
                                            >
                                                <div className="flex items-center w-full">
                                                    <FontAwesomeIcon className={`text-sm w-6 mr-1 transition-transform ${dateOpen ? "rotate-90" : ""}`} icon={faChevronRight} />
                                                    <div className="flex items-center gap-3">
                                                        <div className='w-7 h-7 grid place-items-center rounded-lg  text-sky-600'>
                                                            <FontAwesomeIcon icon={faFileShield} />
                                                        </div>
                                                        <div className="font-medium text-slate-800">Date</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {dateOpen && (
                                                <div className="ml-3 pl-3 border-l border-slate-200/70 space-y-1">
                                                    <div onClick={() => navigate("/addArticles")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-3 group">
                                                        <span className="w-6 text-sky-500"><FontAwesomeIcon className='text-base' icon={faDatabase} /></span>
                                                        <span className="group-hover:translate-x-0.5 transition">Rețete</span>
                                                    </div>
                                                    <div onClick={() => navigate("/addManopere")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-3 group">
                                                        <span className="w-6 text-indigo-500"><FontAwesomeIcon className='text-base' icon={faPerson} /></span>
                                                        <span className="group-hover:translate-x-0.5 transition">Manoperă</span>
                                                    </div>
                                                    <div onClick={() => navigate("/addMateriale")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-3 group">
                                                        <span className="w-6 text-amber-500"><FontAwesomeIcon className='text-base' icon={faScrewdriverWrench} /></span>
                                                        <span className="group-hover:translate-x-0.5 transition">Materiale</span>
                                                    </div>
                                                    <div onClick={() => navigate("/addTransport")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-3 group">
                                                        <span className="w-6 text-lime-600"><FontAwesomeIcon className='text-base' icon={faCar} /></span>
                                                        <span className="group-hover:translate-x-0.5 transition">Transport</span>
                                                    </div>
                                                    <div onClick={() => navigate("/addUtilaje")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-3 group">
                                                        <span className="w-6 text-rose-600"><FontAwesomeIcon className='text-base' icon={faTruck} /></span>
                                                        <span className="group-hover:translate-x-0.5 transition">Utilaje</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-100 transition
                        border border-transparent hover:border-slate-200"
                                                onClick={() => navigate("/ManageConturi")}
                                            >
                                                <div className="flex items-center w-full">
                                                    <div className="flex items-center gap-3 pl-7">
                                                        <div className='w-7 h-7 grid place-items-center rounded-lg  text-violet-600'>
                                                            <FontAwesomeIcon icon={faUserPlus} />
                                                        </div>
                                                        <div className="font-medium text-slate-800">Conturi</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-100 transition
                        border border-transparent hover:border-slate-200"
                                                onClick={() => navigate("/Pontaje")}
                                            >
                                                <div className="flex items-center w-full">
                                                    <div className="flex items-center gap-3 pl-7">
                                                        <div className='w-7 h-7 grid place-items-center rounded-lg  text-cyan-600'>
                                                            <FontAwesomeIcon icon={faCalendarDays} />
                                                        </div>
                                                        <div className="font-medium text-slate-800">Pontaje</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-100 transition
                        border border-transparent hover:border-slate-200"
                                                onClick={() => navigate("/AtribuiriActivitate")}
                                            >
                                                <div className="flex items-center w-full">
                                                    <div className="flex items-center gap-3 pl-7">
                                                        <div className='w-7 h-7 grid place-items-center rounded-lg  text-fuchsia-600'>
                                                            <FontAwesomeIcon icon={faLink} />
                                                        </div>
                                                        <div className="font-medium text-slate-800">Atribuiri</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Santiere */}
                                    <div
                                        className="text-[1.25rem] cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-100 transition
                    border border-transparent hover:border-slate-200 mt-1"
                                        onClick={() => setSantiereOpen((prev) => !prev)}
                                        aria-expanded={santiereOpen}
                                    >
                                        <div className="flex items-center w-full">
                                            <FontAwesomeIcon className={`text-sm w-6 mr-1 transition-transform ${santiereOpen ? "rotate-90" : ""}`} icon={faChevronRight} />
                                            <div className="flex items-center gap-3">
                                                <div className='w-7 h-7 grid place-items-center rounded-lg  text-amber-600'>
                                                    <FontAwesomeIcon icon={faMapLocationDot} />
                                                </div>
                                                <div className="font-semibold text-slate-800">Șantiere</div>
                                            </div>
                                        </div>
                                    </div>

                                    {connectedSantiereToUser && santiereOpen && (
                                        <div className="ml-3 pl-3 border-l border-slate-200/70 space-y-1">
                                            {connectedSantiereToUser.map((beneficiar, index) => (
                                                <div key={index} className="rounded-lg">
                                                    <div
                                                        onClick={() => handleBeneficiarClick(beneficiar.id)}
                                                        className="text-lg cursor-pointer px-3 py-2 rounded-lg hover:bg-slate-100 transition flex items-center"
                                                    >
                                                        <FontAwesomeIcon
                                                            className={`text-sm w-6 mr-1 transition-transform ${selectedBeneficiari.includes(beneficiar.id) ? 'rotate-90' : ''}`}
                                                            icon={faChevronRight}
                                                        />
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="w-7 h-7 grid place-items-center p-1 rounded-lg  text-slate-600">
                                                                {beneficiar.limba === 'RO' ?
                                                                    <GradientFA icon={faUserTag} size={24} flagMode colors={["#002B7F", "#FCD116", "#CE1126"]} />
                                                                    :
                                                                    <GradientFA icon={faUserTag} size={24} flagMode colors={["#0055A4", "#FFFFFF", "#EF4135"]} />
                                                                }
                                                            </div>
                                                            <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                                                {beneficiar.name}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selectedBeneficiari.includes(beneficiar.id) && (
                                                        <div className="ml-3 pl-3 border-l border-slate-200/70">
                                                            {connectedSantiereToUser[index].santiere && connectedSantiereToUser[index].santiere.map((santier, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => navigate(`/Santiere/${beneficiar.limba}/${beneficiar.id}/${santier.id}`)}
                                                                    className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-3 group"
                                                                >

                                                                    <div className="w-7 h-7 grid place-items-center rounded-lg  text-orange-600">
                                                                        <FontAwesomeIcon icon={faHelmetSafety} />
                                                                    </div>
                                                                    <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                                                        {santier.name}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <div
                                                                onClick={() => setAddSantier(beneficiar.id)}
                                                                className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-emerald-50 transition flex items-center gap-3 group"
                                                            >
                                                                <div className="w-7 h-7 grid place-items-center rounded-lg  text-emerald-600">
                                                                    <FontAwesomeIcon className="text-green-600" icon={faPlus} />
                                                                </div>
                                                                <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis text-emerald-700 font-medium group-hover:translate-x-0.5 transition">
                                                                    Adaugă Șantier
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : null}

                            {/* Spacer so footer doesn't overlap */}
                            <div className="h-4" />
                        </ul>
                    </div>

                    {/* Footer card */}
                    {/* FOOTER — always at bottom */}
                    <div className="mt-auto border-t border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3">
                        {user.name && !addSantier ? (
                            <div className="grid grid-rows-[1fr_auto] gap-3">
                                <div className="py-1 pl-1">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-blue-400 shadow">
                                                <img
                                                    className="w-full h-full object-cover"
                                                    src={photoStorage ? `${photoAPI}/${photoStorage}` : photo}
                                                    alt=""
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="font-semibold text-slate-900">{user.name}</p>
                                                {/* badge rol, dacă vrei */}
                                                {user.role && (
                                                    <span className="mt-0.5 inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                        {user.role.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={logout}
                                        className="bg-gradient-to-r from-rose-500 to-red-500 text-white hover:opacity-95 rounded-lg flex gap-2 items-center justify-center p-2 shadow-md"
                                    >
                                        <FontAwesomeIcon icon={faRightToBracket} /> Logout
                                    </button>
                                    <button
                                        onClick={() => navigate("/")}
                                        className="bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:opacity-95 rounded-lg flex gap-2 items-center justify-center p-2 shadow-md"
                                    >
                                        <FontAwesomeIcon icon={faHouse} /> Home
                                    </button>
                                </div>
                            </div>
                        ) : user.name && addSantier ? (
                            <div className="grid grid-rows-[1fr_auto] gap-3">
                                <div className="py-1 flex gap-2 flex-col">
                                    <label className="text-sm text-slate-700">Nume Șantier:</label>
                                    <input
                                        type="text"
                                        name="santierName"
                                        onChange={(e) => setSantierName(e.target.value)}
                                        className="border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 w-full p-2 border rounded-lg outline-none transition bg-white/80"
                                        placeholder="Ex: Bloc A2 – Fundații"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setAddSantier(false)}
                                        className="bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg flex gap-2 items-center justify-center p-2"
                                    >
                                        <FontAwesomeIcon icon={faCancel} /> Cancel
                                    </button>
                                    <button
                                        onClick={addSantierToUser}
                                        className="bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:opacity-95 rounded-lg flex gap-2 items-center justify-center p-2 shadow-md"
                                    >
                                        <FontAwesomeIcon icon={faPlus} /> Adaugă
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
}

export default Navbar;