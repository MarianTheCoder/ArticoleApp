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
    faBuilding,
    faCity,
    faMagnifyingGlass,
    faTimes,
    faXmark,
    faRotate,
    faRotateRight,
    faSchool
} from "@fortawesome/free-solid-svg-icons";
import photo from '../assets/no-user-image-square.jpg';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';
import Logo from '../assets/logo.svg';
import photoAPI from '../api/photoAPI';
import api from '../api/axiosAPI';
import "../assets/navbar.css";
import GradientFA from './GradientFA';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { faMoon, faSun } from '@fortawesome/free-regular-svg-icons';
import { Switch } from '@/components/ui/switch';
import NotificationBell from './NotificationsBell';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';

const getContrastColor = (hexColor) => {
    if (!hexColor) return "white";
    // Eliminăm # dacă există
    const color = hexColor.replace("#", "");
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    // Calculăm luminozitatea (formula standard YIQ)
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "black" : "white";
};

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

function Navbar() {
    const { theme, setTheme } = useTheme();
    const whatTheme = theme == "dark" ? "dark" : theme == "aqua" ? "aqua" : "light";

    const { user, logout, triggerRefresh } = useContext(AuthContext);

    // State for hierarchical data
    const [companies, setCompanies] = useState([]);

    // UI state
    const [navbarVisible, setNavbarVisible] = useState(false);
    const navbarRef = useRef(null);
    const [viewSearch, setViewSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchTermDebounced, setSearchTermDebounced] = useState("");

    // Expanded companies and filiale
    const [expandedCompanies, setExpandedCompanies] = useState([]);
    const [expandedFiliale, setExpandedFiliale] = useState([]);


    // Submenus (unchanged)
    const [crmOpen, setCrmOpen] = useState(false);
    const [bazaDeDateOpen, setBazaDeDateOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [santiereOpen, setSantiereOpen] = useState(false);

    const navigate = useNavigate();

    const { data, isLoading, error } = useQuery({
        queryKey: ["companies", 'navbarData', user?.id],
        queryFn: async () => {
            console.log("Fetching navbar data for user ID:", user?.id);
            const { data } = await api.get(`/users/navbarData/${user.id}`);
            return data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
        enabled: !!user?.id, // rulează doar dacă user are id
        placeholderData: (previousData) => previousData, // Păstrează datele vechi ca să nu dea flash
    });
    // console.log("Navbar data:", data);
    let navbarData = data?.companii || EMPTY_ARRAY;
    let userData = data?.user || EMPTY_OBJECT;

    // Fetch hierarchical data
    useEffect(() => {
        if (!navbarData) return;
        // Sort: RO first, then FR, then others; then by name
        const langRank = (country) => {
            if (country === 'RO') return 0;
            if (country === 'FR') return 1;
            return 2;
        };
        const sorted = [...navbarData].sort((a, b) => {
            const rankA = langRank(a.tara);
            const rankB = langRank(b.tara);
            if (rankA !== rankB) return rankA - rankB;
            return (a.nume_companie || '').localeCompare(b.nume_companie || '');
        });

        // Pin 'Baly Energies SAS' to top
        const pin = 'Baly Energies SAS'.toLowerCase();
        const idx = sorted.findIndex(x => (x.nume_companie || '').toLowerCase().includes(pin));
        if (idx >= 0) {
            const [first] = sorted.splice(idx, 1);
            sorted.unshift(first);
        }

        setCompanies(sorted);
    }, [navbarData]); // Re-fetch if navbarData changes (e.g. on refetch or window focus)


    // Click outside logic
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

    const handleCompanyClick = (companyId) => {
        setExpandedCompanies((prev) =>
            prev.includes(companyId)
                ? prev.filter((id) => id !== companyId)
                : [...prev, companyId]
        );
    };

    const handleFilialaClick = (filialaId) => {
        setExpandedFiliale((prev) =>
            prev.includes(filialaId)
                ? prev.filter((id) => id !== filialaId)
                : [...prev, filialaId]
        );
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchTermDebounced(searchTerm);
        }, 500); // debounce by 500ms
        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);


    const normalize = (str) => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    // Search effect - expands items that match search term
    useEffect(() => {
        if (!searchTermDebounced.trim()) {
            // If search is cleared, reset expansions (optional - you might want to keep them)
            // setExpandedCompanies([]);
            // setExpandedFiliale([]);
            return;
        }

        const searchLower = normalize(searchTermDebounced);
        const companiesToExpand = [];
        const filialeToExpand = [];

        // Check each company and its children for matches
        companies.forEach(company => {
            let expandCompany = false;

            // Check company name
            if (normalize(company.nume_companie || '').includes(searchLower)) {
                expandCompany = true;
            }

            // Check direct sites
            if (company.santiere) {
                company.santiere.forEach(site => {
                    if (normalize(site.nume || '').includes(searchLower)) {
                        expandCompany = true;
                    }
                });
            }

            // Check filiale and their sites
            if (company.filiale) {
                company.filiale.forEach(filiala => {
                    let expandFiliala = false;

                    // Check filiala name
                    if (normalize(filiala.nume_filiala || '').includes(searchLower)) {
                        expandFiliala = true;
                        expandCompany = true;
                    }

                    // Check filiala sites
                    if (filiala.santiere) {
                        filiala.santiere.forEach(site => {
                            if (normalize(site.nume || '').includes(searchLower)) {
                                expandFiliala = true;
                                expandCompany = true;
                            }
                        });
                    }

                    if (expandFiliala) {
                        filialeToExpand.push(filiala.id);
                    }
                });
            }

            if (expandCompany) {
                companiesToExpand.push(company.id);
            }
        });

        setExpandedCompanies(companiesToExpand);
        setExpandedFiliale(filialeToExpand);
    }, [searchTermDebounced, companies]);


    return (
        <>
            <button
                onClick={() => setNavbarVisible((prev) => !prev)}
                className={`fixed top-4 left-4 z-[150] bg-emerald-500 
                ${navbarVisible ? "-translate-x-24" : "translate-x-0"} text-white px-3 py-2 rounded-xl shadow
                hover:shadow-emerald-200/50 transition-all duration-300`}
                aria-label="Toggle navigation"
            >
                <FontAwesomeIcon icon={faBars} />
            </button>
            <NotificationBell />
            <div
                ref={navbarRef}
                className={`
                    h-full fixed top-0 left-0 z-[200] max-w-[26rem] w-full
                    transform transition-transform duration-300 ease-in-out
                    ${navbarVisible ? "translate-x-0" : "-translate-x-full"}
                    bg-card backdrop-blur-xl
                    text-foreground
                    border-r border-border shadow-2xl
                    flex flex-col
                  `}
                style={{ willChange: "transform" }}
            >
                {/* Header (unchanged) */}
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
                        {/* CRM section (unchanged) */}
                        <div
                            className="text-[1.25rem] cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
                            onClick={() => setCrmOpen((prev) => !prev)}
                            aria-expanded={crmOpen}
                        >
                            <div className="flex items-center w-full">
                                <FontAwesomeIcon
                                    className={`text-base w-6 mr-1 transition-transform ${crmOpen ? "rotate-90" : ""}`}
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
                                {/* ... CRM subitems (unchanged) ... */}
                                <div
                                    className="text-lg cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
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
                                    className="text-lg cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
                                    onClick={() => navigate("/CRM/Companii")}
                                >
                                    <div className="flex items-center w-full">
                                        <div className="flex items-center gap-3 pl-7">
                                            <div className="w-7 h-7 grid place-items-center rounded-lg text-yellow-400">
                                                <FontAwesomeIcon icon={faCity} />
                                            </div>
                                            <div className="font-medium text-foreground">Companii</div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="text-lg cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
                                    onClick={() => navigate("/CRM/Filiale")}
                                >
                                    <div className="flex items-center w-full">
                                        <div className="flex items-center gap-3 pl-7">
                                            <div className="w-7 h-7 grid place-items-center rounded-lg text-cyan-500">
                                                <FontAwesomeIcon icon={faBuilding} />
                                            </div>
                                            <div className="font-medium text-foreground">Filiale</div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="text-lg cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
                                    onClick={() => navigate("/CRM/Santiere")}
                                >
                                    <div className="flex items-center w-full">
                                        <div className="flex items-center gap-3 pl-7">
                                            <div className="w-7 h-7 grid place-items-center rounded-lg text-orange-600">
                                                <FontAwesomeIcon icon={faHelmetSafety} />
                                            </div>
                                            <div className="font-medium text-foreground">Șantiere</div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="text-lg cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
                                    onClick={() => navigate("/CRM/Contacte")}
                                >
                                    <div className="flex items-center w-full">
                                        <div className="flex items-center gap-3 pl-7">
                                            <div className="w-7 h-7 grid place-items-center rounded-lg text-blue-600">
                                                <FontAwesomeIcon icon={faUser} />
                                            </div>
                                            <div className="font-medium text-foreground">Contacte</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Baza de date section (unchanged) */}
                        <div
                            className="text-[1.25rem] cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
                            onClick={() => setBazaDeDateOpen((prev) => !prev)}
                            aria-expanded={bazaDeDateOpen}
                        >
                            <div className="flex items-center w-full">
                                <FontAwesomeIcon
                                    className={`text-base w-6 mr-1 transition-transform ${bazaDeDateOpen ? "rotate-90" : ""}`}
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
                                {/* "Date" submenu */}
                                <div
                                    className="text-lg cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
                                    onClick={() => setDateOpen((prev) => !prev)}
                                    aria-expanded={dateOpen}
                                >
                                    <div className="flex items-center w-full">
                                        <FontAwesomeIcon
                                            className={`text-base w-6 mr-1 transition-transform ${dateOpen ? "rotate-90" : ""}`}
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
                                    className="text-lg cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
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
                                    className="text-lg cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
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
                                {/* <div
                                    className="text-lg cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent hover:border-border"
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
                                </div> */}
                            </div>
                        )}

                        {/* SANTIERE SECTION — HIDE NON-MATCHING COMPANIES */}
                        <div
                            className="text-[1.25rem] cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition
      border border-transparent hover:border-border mt-1"
                            onClick={() => setSantiereOpen((prev) => !prev)}
                            aria-expanded={santiereOpen}
                        >
                            <div className="flex items-center jusc w-full">
                                <FontAwesomeIcon
                                    className={`text-base w-6 mr-1 transition-transform ${santiereOpen ? "rotate-90" : ""}`}
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

                        {santiereOpen && (
                            <div className="ml-3 pl-3 border-l border-border space-y-1">
                                {companies
                                    .filter(company => {
                                        // If no search term, show all companies
                                        if (!searchTermDebounced.trim()) return true;

                                        const searchLower = normalize(searchTermDebounced);

                                        // Check if company name matches
                                        if (normalize(company.nume_companie || '').includes(searchLower)) return true;

                                        // Check if any direct site matches
                                        if (company.santiere?.some(site =>
                                            normalize(site.nume || '').includes(searchLower)
                                        )) return true;

                                        // Check if any filiala or filiala site matches
                                        if (company.filiale?.some(filiala =>
                                            normalize(filiala.nume_filiala || '').includes(searchLower) ||
                                            filiala.santiere?.some(site =>
                                                normalize(site.nume || '').includes(searchLower)
                                            )
                                        )) return true;

                                        // No matches found - hide this company completely
                                        return false;
                                    })
                                    .map((company) => (
                                        <div key={company.id}>
                                            {/* Company row (level2) */}
                                            <div
                                                onClick={() => handleCompanyClick(company.id)}
                                                className={`text-lg  cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition border border-transparent flex items-center `}
                                            >
                                                <FontAwesomeIcon
                                                    className={`text-base w-6 mr-2 transition-transform ${expandedCompanies.includes(company.id) ? "rotate-90" : ""}`}
                                                    icon={faChevronRight}
                                                />
                                                <div className="flex items-center gap-3">
                                                    <div className=" rounded-lg text-muted-foreground">
                                                        {company.tara === "RO" ? (
                                                            <GradientFA icon={faCity} size={24} flagMode colors={["#0055A4", "#FCD116", "#CE1126"]} />
                                                        ) : (
                                                            <GradientFA icon={faCity} size={24} flagMode colors={["#0055A4", "#FFFFFF", "#EF4135"]} />
                                                        )}
                                                    </div>
                                                    <span className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                                        {company.nume_companie}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expanded company content (level3 items) - show all when expanded, regardless of search */}
                                            {expandedCompanies.includes(company.id) && (
                                                <div className="ml-3 pl-4 border-l border-border space-y-1">
                                                    {/* Direct sites (level3) - show all when company is expanded */}
                                                    {company.santiere && company.santiere.map((site) => (
                                                        <div
                                                            key={site.id}
                                                            onClick={() => navigate(`/Santiere/${company.tara}/${company.id}/${site.id}`)}
                                                            className={`text-lg px-3 py-2 rounded-lg hover:bg-accent transition flex items-center gap-3 group`}
                                                        >
                                                            <div className="w-7 h-7 grid place-items-center p-1 rounded-lg text-orange-600">
                                                                <FontAwesomeIcon icon={faHelmetSafety} />
                                                            </div>
                                                            <div className="w-full text-base overflow-hidden whitespace-nowrap text-ellipsis">
                                                                {site.nume}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Filiale rows (level3 with chevron) - show all when company is expanded */}
                                                    {company.filiale && company.filiale.map((filiala) => (
                                                        <div key={filiala.id}>
                                                            <div
                                                                onClick={() => handleFilialaClick(filiala.id)}
                                                                className={`text-lg cursor-pointer rounded-lg  px-3 py-2 hover:bg-accent transition border border-transparent flex items-center`}
                                                            >
                                                                <FontAwesomeIcon
                                                                    className={`text-sm w-5 mr-1 transition-transform ${expandedFiliale.includes(filiala.id) ? "rotate-90" : ""}`}
                                                                    icon={faChevronRight}
                                                                />
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className="w-7 h-7 grid p-1 place-items-center rounded-lg text-cyan-500">
                                                                        <FontAwesomeIcon icon={faBuilding} />
                                                                    </div>
                                                                    <div className={`w-full text-base overflow-hidden  whitespace-nowrap text-ellipsis`}>
                                                                        {filiala.nume_filiala}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Expanded filiala: sites (level4) - show all when filiala is expanded */}
                                                            {expandedFiliale.includes(filiala.id) && filiala.santiere && (
                                                                <div className="ml-3 pl-3 border-l border-border space-y-1">
                                                                    {filiala.santiere.map((site) => (
                                                                        <div
                                                                            key={site.id}
                                                                            onClick={() => navigate(`/Santiere/${company.tara}/${company.id}/${site.id}`)}
                                                                            className={`text-lg px-3 py-2 rounded-lg hover:bg-accent transition flex items-center gap-3 group `}
                                                                        >
                                                                            <div className="w-7 h-7 p-1 grid place-items-center rounded-lg text-orange-600">
                                                                                <FontAwesomeIcon icon={faHelmetSafety} />
                                                                            </div>
                                                                            <div className="w-full text-base overflow-hidden whitespace-nowrap text-ellipsis">
                                                                                {site.nume}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                {/* Show "No results" message when search has no matches */}
                                {searchTermDebounced && companies.filter(company => {
                                    const searchLower = normalize(searchTermDebounced);
                                    return normalize(company.nume_companie || '').includes(searchLower) ||
                                        company.santiere?.some(site => normalize(site.nume || '').includes(searchLower)) ||
                                        company.filiale?.some(filiala =>
                                            normalize(filiala.nume_filiala || '').includes(searchLower) ||
                                            filiala.santiere?.some(site => normalize(site.nume || '').includes(searchLower))
                                        );
                                }).length === 0 && (
                                        <div className="text-center py-4 text-muted-foreground">
                                            Nu s-au găsit rezultate pentru "{searchTermDebounced}"
                                        </div>
                                    )}
                            </div>
                        )}
                    </ul>
                </div>

                {/* Footer — restored original logic */}
                <div className="mt-auto border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
                    {user.name ? (
                        <div className="grid grid-rows-[auto_1fr_auto] ">
                            {viewSearch && (
                                <div className="py-1 mb-3 pl-1 relative">
                                    <Input
                                        placeholder="Caută companie, filială, șantier..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pr-8"
                                        autoFocus
                                    />
                                    {searchTermDebounced && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setSearchTerm("")
                                                setSearchTermDebounced("")
                                            }}
                                            className="absolute right-2 hover:bg-transparent p-0  top-1/2 -translate-y-1/2 rounded-full"
                                        >
                                            <FontAwesomeIcon icon={faXmark} className="text-foreground/80" />
                                        </Button>
                                    )}
                                </div>
                            )}
                            <div className="py-1 overflow-hidden mb-3 pl-1">
                                <div className="flex items-center gap-3 w-full">
                                    {/* Poză profil folosind userData */}
                                    <div
                                        className="h-12 w-12 min-h-12 min-w-12 shrink-0 rounded-lg overflow-hidden ring-2 shadow transition-all duration-300"
                                        style={{ ringColor: userData?.firma_color || 'var(--ring)' }}
                                    >
                                        <img
                                            className="w-full h-full object-cover rounded-lg"
                                            src={userData?.photo_url ? `${photoAPI}/${userData.photo_url}` : photo}
                                            alt={user.name}
                                        />
                                    </div>

                                    <div className="flex w-full overflow-hidden justify-between gap-3">
                                        <div className="flex flex-col min-w-0">
                                            <p className="font-semibold text-foreground truncate">{user.name}</p>

                                            {/* Badge Firma cu culoare dinamică și text contrastant */}
                                            {userData?.firma_nume && (
                                                <span
                                                    className="mt-0.5  text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider truncate whitespace-nowrap"
                                                    style={{
                                                        backgroundColor: userData.firma_color || '#3b82f6',
                                                        color: getContrastColor(userData.firma_color)
                                                    }}
                                                >
                                                    {userData.firma_nume}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-2 items-center">
                                            <Button
                                                variant="outline"
                                                size="iconXl"
                                                onClick={() => triggerRefresh()}
                                                className="rounded-full"
                                            >
                                                <FontAwesomeIcon
                                                    icon={faRotateRight}
                                                    className="text-foreground/80 transition-colors text-lg duration-300"
                                                />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="iconXl"
                                                onClick={() => setViewSearch((prev) => !prev)}
                                                className={`rounded-full ${searchTermDebounced ? "border-primary bg-card " : ""} transition-colors duration-300`}
                                                style={searchTermDebounced ? { borderColor: userData?.firma_color } : {}}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faMagnifyingGlass}
                                                    className={` ${searchTermDebounced ? "text-primary" : "text-foreground/80"} transition-colors text-lg duration-300`}
                                                    style={searchTermDebounced ? { color: userData?.firma_color } : {}}
                                                />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="iconXl"
                                                onClick={() => setTheme(whatTheme === "dark" ? "light" : whatTheme === "aqua" ? "dark" : "aqua")}
                                                className="rounded-full"
                                            >
                                                <FontAwesomeIcon
                                                    icon={faCircleHalfStroke}
                                                    className="text-foreground/80 transition-colors text-lg duration-300"
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
                    ) : null}
                </div>
            </div>
        </>
    );
}

export default Navbar;