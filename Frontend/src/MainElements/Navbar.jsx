import { useContext, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowsSpin, faEye, faDatabase, faFilePen, faHelmetSafety, faHouse, faL, faNewspaper,
    faPeopleGroup, faPhone, faRightFromBracket, faUser, faUserPlus, faChevronRight, faFile,
    faH, faServer, faMinimize, faMinus, faScrewdriverWrench, faPerson, faTruck, faVanShuttle,
    faCar, faUserTie, faUsersGear, faGears, faRightToBracket, faFileShield, faUserTag, faPlus,
    faCancel, faMapLocationDot, faBars, faCircleXmark, faRectangleXmark, faCalendarDays, faCalendarDay, faLink,
    faCircleHalfStroke,
    faGear,
    faDesktop,
    faBuilding
} from "@fortawesome/free-solid-svg-icons";
import photo from '../assets/no-user-image-square.jpg';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';
import Logo from '../assets/logo.svg';
import photoAPI from '../api/photoAPI';
import api from '../api/axiosAPI'; // Ensure this exists
import "../assets/navbar.css";
import GradientFA from './GradientFA';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { faMoon, faSun } from '@fortawesome/free-regular-svg-icons';
import { Switch } from '@/components/ui/switch';
import NotificationBell from './NotificationsBell';

function Navbar() {

    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";

    // Auth Context - Only gets User info now
    const { user, logout } = useContext(AuthContext);

    // --- LOCAL STATE FOR BUSINESS DATA ---
    const [beneficiari, setBeneficiari] = useState([]);
    const [santiere, setSantiere] = useState([]);
    const [connectedSantiereToUser, setConnectedSantiereToUser] = useState([]);
    const [loading, setLoading] = useState(true);

    const [navbarVisible, setNavbarVisible] = useState(false);
    const navbarRef = useRef(null);

    const [selectedBeneficiari, setSelectedBeneficiari] = useState([]);
    const [addSantier, setAddSantier] = useState(false);
    const [santierName, setSantierName] = useState("");

    // Submenus
    const [companiiOpen, setCompaniiOpen] = useState(false);
    const [crmOpen, setCrmOpen] = useState(false);
    const [bazaDeDateOpen, setBazaDeDateOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [santiereOpen, setSantiereOpen] = useState(false);

    let navigate = useNavigate();
    const photoStorage = localStorage.getItem("photoUser");

    // --- 1. FETCH DATA LOCALLY ---
    const fetchData = async () => {
        try {
            // Fetch users (companies) and sites in parallel
            const [usersRes, santiereRes] = await Promise.all([
                api.get('/users/GetUsersName'),
                api.get('/users/getSantiere')
            ]);
            setBeneficiari(usersRes.data);
            setSantiere(santiereRes.data);
        } catch (err) {
            console.error('Navbar Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- 2. LOGIC TO ADD SANTIER ---
    const addSantierToUser = async () => {
        if (santierName.trim() === "") {
            alert("Numele santierului nu poate fi gol");
            return;
        }
        try {
            await api.post(`/users/addSantier`, { userId: addSantier, name: santierName });
            setAddSantier(false);
            setSantierName(""); // Reset input
            fetchData(); // Refresh list immediately
        } catch (err) {
            console.error('Add Santier failed:', err.response?.data?.message || err.message);
        }
    };

    // --- 3. SORTING & GROUPING LOGIC (Restored) ---
    useEffect(() => {
        if (!Array.isArray(beneficiari) || beneficiari.length === 0) return;
        if (!Array.isArray(santiere)) return;

        // Group sites by user_id
        const byUser = santiere.reduce((acc, s) => {
            (acc[s.user_id] ||= []).push(s);
            return acc;
        }, {});

        // Attach sites to beneficiaries
        const usersWithSantiere = beneficiari.map(u => ({
            ...u,
            santiere: byUser[u.id] || [],
        }));

        // Sort logic
        const langRank = (l) => (l === 'RO' ? 0 : l === 'FR' ? 1 : 2);

        const sorted = [...usersWithSantiere].sort((a, b) => {
            const la = langRank(a.limba);
            const lb = langRank(b.limba);
            if (la !== lb) return la - lb;
            return (a.name || '').localeCompare(b.name || '');
        });

        // Pin 'Baly Energies SAS' to top
        const pin = 'Baly Energies SAS'.toLowerCase();
        const idx = sorted.findIndex(x => (x.name || '').toLowerCase().includes(pin));
        if (idx >= 0) {
            const [first] = sorted.splice(idx, 1);
            sorted.unshift(first);
        }

        setConnectedSantiereToUser(sorted);
    }, [beneficiari, santiere]);


    // Click Outside logic
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


    const handleBeneficiarClick = (beneficiarId) => {
        setSelectedBeneficiari((prevSelected) => {
            if (prevSelected.includes(beneficiarId)) {
                return prevSelected.filter((id) => id !== beneficiarId);
            } else {
                return [...prevSelected, beneficiarId];
            }
        });
    };

    return (
        <>
            <button
                onClick={() => setNavbarVisible((prev) => !prev)}
                className={`fixed top-4 left-4 z-[150]  bg-emerald-500 
                ${navbarVisible ? "-translate-x-24" : "translate-x-0"} text-white px-3 py-2 rounded-xl shadow
                hover:shadow-emerald-200/50 transition-all duration-300`}
                aria-label="Toggle navigation"
            >
                <FontAwesomeIcon icon={faBars} />
            </button>
            <NotificationBell />

            {!loading && (
                <div
                    ref={navbarRef}
                    className={`
                    h-full fixed top-0 left-0 z-[200] max-w-[22rem] w-full
                    transform transition-transform duration-300 ease-in-out
                    ${navbarVisible ? "translate-x-0" : "-translate-x-full"}
                    bg-card backdrop-blur-xl
                    text-foreground
                    border-r border-border shadow-2xl
                    flex flex-col
                  `}
                    style={{ willChange: "transform" }}
                >
                    {/* Header sticky */}
                    <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-xl">
                        <div className="flex items-center justify-center px-4 py-2">
                            <div className="flex items-center gap-3">
                                <img src={Logo} alt="Website Logo" className="h-10 w-auto object-contain" />
                            </div>
                        </div>
                        <div className="h-px w-full bg-border" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-2 pb-3 pt-2">
                        <ul className="flex flex-col gap-1 select-none">
                            {user.role == "ofertant" ? (
                                <>
                                    {/* CRM */}
                                    <div
                                        className="text-[1.25rem] cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
                                        onClick={() => setCrmOpen((prev) => !prev)}
                                        aria-expanded={crmOpen}
                                    >
                                        <div className="flex items-center w-full">
                                            <FontAwesomeIcon
                                                className={`text-sm w-6 mr-1 transition-transform ${crmOpen ? "rotate-90" : ""}`}
                                                icon={faChevronRight}
                                            />
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 grid place-items-center rounded-lg text-blue-600">
                                                    <FontAwesomeIcon icon={faGear} />
                                                </div>
                                                <div className="font-semibold text-foreground">CRM</div>
                                            </div>
                                        </div>
                                    </div>
                                    {crmOpen && (
                                        <div className="ml-3 pl-3 border-l border-border space-y-1">
                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition
                                                border border-transparent hover:border-border"
                                                onClick={() => navigate("/CRM")}
                                            >
                                                <div className="flex items-center w-full">
                                                    <div className="flex items-center gap-3 pl-7">
                                                        <div className="w-7 h-7 grid place-items-center rounded-lg text-rose-600">
                                                            <FontAwesomeIcon icon={faDesktop} />
                                                        </div>
                                                        <div className="font-medium text-foreground">Panou de Control</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition
                                                border border-transparent hover:border-border"
                                                onClick={() => navigate("/CRM/Companii")}
                                            >
                                                <div className="flex items-center w-full">
                                                    <div className="flex items-center gap-3 pl-7">
                                                        <div className="w-7 h-7 grid place-items-center rounded-lg text-yellow-400">
                                                            <FontAwesomeIcon icon={faBuilding} />
                                                        </div>
                                                        <div className="font-medium text-foreground">Companii</div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    )}

                                    {/* Bază de date */}
                                    <div
                                        className="text-[1.25rem] cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
                                        onClick={() => setBazaDeDateOpen((prev) => !prev)}
                                        aria-expanded={bazaDeDateOpen}
                                    >
                                        <div className="flex items-center w-full">
                                            <FontAwesomeIcon
                                                className={`text-sm w-6 mr-1 transition-transform ${bazaDeDateOpen ? "rotate-90" : ""}`}
                                                icon={faChevronRight}
                                            />
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 grid place-items-center rounded-lg text-emerald-600">
                                                    <FontAwesomeIcon icon={faServer} />
                                                </div>
                                                <div className="font-semibold text-foreground">Bază de date</div>
                                            </div>
                                        </div>
                                    </div>

                                    {bazaDeDateOpen && (
                                        <div className="ml-3 pl-3 border-l border-border space-y-1">
                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition
                          border border-transparent hover:border-border"
                                                onClick={() => setDateOpen((prev) => !prev)}
                                                aria-expanded={dateOpen}
                                            >
                                                <div className="flex items-center w-full">
                                                    <FontAwesomeIcon
                                                        className={`text-sm w-6 mr-1 transition-transform ${dateOpen ? "rotate-90" : ""}`}
                                                        icon={faChevronRight}
                                                    />
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 grid place-items-center rounded-lg text-sky-600">
                                                            <FontAwesomeIcon icon={faFileShield} />
                                                        </div>
                                                        <div className="font-medium text-foreground">Date</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {dateOpen && (
                                                <div className="ml-3 pl-3 border-l border-border space-y-1">
                                                    <div
                                                        onClick={() => navigate("/addArticles")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-accent transition flex items-center gap-3 group"
                                                    >
                                                        <span className="w-6 text-sky-500">
                                                            <FontAwesomeIcon className="text-base" icon={faDatabase} />
                                                        </span>
                                                        <span className="group-hover:translate-x-0.5 transition">Rețete</span>
                                                    </div>

                                                    <div
                                                        onClick={() => navigate("/addManopere")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-accent transition flex items-center gap-3 group"
                                                    >
                                                        <span className="w-6 text-indigo-500">
                                                            <FontAwesomeIcon className="text-base" icon={faPerson} />
                                                        </span>
                                                        <span className="group-hover:translate-x-0.5 transition">Manoperă</span>
                                                    </div>

                                                    <div
                                                        onClick={() => navigate("/addMateriale")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-accent transition flex items-center gap-3 group"
                                                    >
                                                        <span className="w-6 text-amber-500">
                                                            <FontAwesomeIcon className="text-base" icon={faScrewdriverWrench} />
                                                        </span>
                                                        <span className="group-hover:translate-x-0.5 transition">Materiale</span>
                                                    </div>

                                                    <div
                                                        onClick={() => navigate("/addTransport")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-accent transition flex items-center gap-3 group"
                                                    >
                                                        <span className="w-6 text-lime-600">
                                                            <FontAwesomeIcon className="text-base" icon={faCar} />
                                                        </span>
                                                        <span className="group-hover:translate-x-0.5 transition">Transport</span>
                                                    </div>

                                                    <div
                                                        onClick={() => navigate("/addUtilaje")}
                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-accent transition flex items-center gap-3 group"
                                                    >
                                                        <span className="w-6 text-rose-600">
                                                            <FontAwesomeIcon className="text-base" icon={faTruck} />
                                                        </span>
                                                        <span className="group-hover:translate-x-0.5 transition">Utilaje</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition
                          border border-transparent hover:border-border"
                                                onClick={() => navigate("/ManageConturi")}
                                            >
                                                <div className="flex items-center w-full">
                                                    <div className="flex items-center gap-3 pl-7">
                                                        <div className="w-7 h-7 grid place-items-center rounded-lg text-violet-600">
                                                            <FontAwesomeIcon icon={faUserPlus} />
                                                        </div>
                                                        <div className="font-medium text-foreground">Conturi</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition
                          border border-transparent hover:border-border"
                                                onClick={() => navigate("/Pontaje")}
                                            >
                                                <div className="flex items-center w-full">
                                                    <div className="flex items-center gap-3 pl-7">
                                                        <div className="w-7 h-7 grid place-items-center rounded-lg text-cyan-600">
                                                            <FontAwesomeIcon icon={faCalendarDays} />
                                                        </div>
                                                        <div className="font-medium text-foreground">Pontaje</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="text-xl cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition
                          border border-transparent hover:border-border"
                                                onClick={() => navigate("/AtribuiriActivitate")}
                                            >
                                                <div className="flex items-center w-full">
                                                    <div className="flex items-center gap-3 pl-7">
                                                        <div className="w-7 h-7 grid place-items-center rounded-lg text-fuchsia-600">
                                                            <FontAwesomeIcon icon={faLink} />
                                                        </div>
                                                        <div className="font-medium text-foreground">Atribuiri</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Santiere */}
                                    <div
                                        className="text-[1.25rem] cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition
                      border border-transparent hover:border-border mt-1"
                                        onClick={() => setSantiereOpen((prev) => !prev)}
                                        aria-expanded={santiereOpen}
                                    >
                                        <div className="flex items-center w-full">
                                            <FontAwesomeIcon
                                                className={`text-sm w-6 mr-1 transition-transform ${santiereOpen ? "rotate-90" : ""}`}
                                                icon={faChevronRight}
                                            />
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 grid place-items-center rounded-lg text-amber-600">
                                                    <FontAwesomeIcon icon={faMapLocationDot} />
                                                </div>
                                                <div className="font-semibold text-foreground">Șantiere</div>
                                            </div>
                                        </div>
                                    </div>

                                    {connectedSantiereToUser && santiereOpen && (
                                        <div className="ml-3 pl-3 border-l border-border space-y-1">
                                            {connectedSantiereToUser.map((beneficiar, index) => (
                                                <div key={index} className="rounded-lg">
                                                    <div
                                                        onClick={() => handleBeneficiarClick(beneficiar.id)}
                                                        className="text-lg cursor-pointer px-3 py-2 rounded-lg hover:bg-accent transition flex items-center"
                                                    >
                                                        <FontAwesomeIcon
                                                            className={`text-sm w-6 mr-1 transition-transform ${selectedBeneficiari.includes(beneficiar.id) ? "rotate-90" : ""
                                                                }`}
                                                            icon={faChevronRight}
                                                        />

                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="w-7 h-7 grid place-items-center p-1 rounded-lg text-muted-foreground">
                                                                {beneficiar.limba === "RO" ? (
                                                                    <GradientFA icon={faUserTag} size={24} flagMode colors={["#0055A4", "#FCD116", "#CE1126"]} />
                                                                ) : (
                                                                    <GradientFA icon={faUserTag} size={24} flagMode colors={["#0055A4", "#FFFFFF", "#EF4135"]} />
                                                                )}
                                                            </div>
                                                            <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                                                {beneficiar.name}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selectedBeneficiari.includes(beneficiar.id) && (
                                                        <div className="ml-3 pl-3 border-l border-border">
                                                            {connectedSantiereToUser[index].santiere &&
                                                                connectedSantiereToUser[index].santiere.map((santier, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        onClick={() => navigate(`/Santiere/${beneficiar.limba}/${beneficiar.id}/${santier.id}`)}
                                                                        className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-accent transition flex items-center gap-3 group"
                                                                    >
                                                                        <div className="w-7 h-7 grid place-items-center rounded-lg text-orange-600">
                                                                            <FontAwesomeIcon icon={faHelmetSafety} />
                                                                        </div>
                                                                        <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                                                            {santier.name}
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                            <div
                                                                onClick={() => setAddSantier(beneficiar.id)}
                                                                className="text-[0.95rem] px-3 py-2 rounded-lg hover:bg-accent transition flex items-center gap-3 group"
                                                            >
                                                                <div className="w-7 h-7 grid place-items-center rounded-lg text-emerald-600">
                                                                    <FontAwesomeIcon icon={faPlus} />
                                                                </div>
                                                                <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis font-medium group-hover:translate-x-0.5 transition">
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

                            <div className="h-4" />
                        </ul>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
                        {user.name && !addSantier ? (
                            <div className="grid grid-rows-[1fr_auto] gap-3">
                                <div className="py-1 pl-1">
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="h-12 w-12 min-h-12 min-w-12 shrink-0 rounded-full overflow-hidden ring-2 ring-ring shadow">
                                            <img
                                                className="w-full h-full object-cover rounded-full"
                                                src={photoStorage ? `${photoAPI}/${photoStorage}` : photo}
                                                alt=""
                                            />
                                        </div>

                                        <div className="flex w-full justify-between gap-3">
                                            <div className="flex flex-col">
                                                <p className="font-semibold text-foreground">{user.name}</p>
                                                {user.role && (
                                                    <span className="mt-0.5 inline-block text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                                                        {user.role.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center">
                                                <Button
                                                    variant="outline"
                                                    size="iconXl"
                                                    onClick={() => setTheme(isDark ? "light" : "dark")}
                                                    className="rounded-full"
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faCircleHalfStroke}
                                                        className="text-foreground/80 transition-colors text-xl duration-300"
                                                    />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button onClick={logout} variant="destructive" className="gap-2">
                                        <FontAwesomeIcon icon={faRightToBracket} /> Logout
                                    </Button>

                                    <Button onClick={() => navigate("/CRM")} className="gap-2">
                                        <FontAwesomeIcon icon={faHouse} /> Home
                                    </Button>
                                </div>
                            </div>
                        ) : user.name && addSantier ? (
                            <div className="grid grid-rows-[1fr_auto] gap-3">
                                <div className="py-1 flex gap-2 flex-col">
                                    <label className="text-sm text-muted-foreground">Nume Șantier:</label>
                                    <input
                                        type="text"
                                        name="santierName"
                                        onChange={(e) => setSantierName(e.target.value)}
                                        className="w-full p-2 border border-input rounded-lg outline-none transition bg-card/80 focus:ring-2 focus:ring-ring focus:border-ring"
                                        placeholder="Ex: Bloc A2 – Fundații"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="secondary" className="gap-2" onClick={() => setAddSantier(false)}>
                                        <FontAwesomeIcon icon={faCancel} /> Cancel
                                    </Button>

                                    <Button className="gap-2" onClick={addSantierToUser}>
                                        <FontAwesomeIcon icon={faPlus} /> Adaugă
                                    </Button>
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