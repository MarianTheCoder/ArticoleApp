import React, { useContext, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner"; // Importăm toast aici, ca să fie ca în codul tău vechi

import CompaniesAddDialog from "./CompaniesAddDialog";
import CompaniesList from "./CompaniesList";

import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";

// Importăm hook-urile simple
import { useCompanies, useAddCompany } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";

export default function CompaniesAddPage() {
    const { show, hide } = useLoading();
    const { user } = useContext(AuthContext);
    const [open, setOpen] = useState(false);

    // --- FILTRE ---
    const [searchName, setSearchName] = useState("");
    const [searchNameDebounced, setSearchNameDebounced] = useState("");

    // --- 1. DATA FETCHING (GET) ---
    // isFetching e true cand se face request la server (search sau refresh)
    const { data, isFetching } = useCompanies(searchNameDebounced);
    const companiesList = data?.companies || [];

    // CONTROL FETCHING: Aici mimăm "fetchCompanies" din codul vechi
    // Când React Query lucrează, noi pornim spinner-ul. Când termină, îl oprim.
    useEffect(() => {
        if (isFetching) {
            show();
        } else {
            hide();
        }
    }, [isFetching]); // Dependența e doar isFetching, deci nu intră în bucle


    // --- 2. DATA MUTATION (POST) ---
    const { mutateAsync } = useAddCompany();

    // --- DEBOUNCE ---
    useEffect(() => {
        const handler = setTimeout(() => setSearchNameDebounced(searchName), 500);
        return () => clearTimeout(handler);
    }, [searchName]);

    // --- STATE FORMULAR (Copiat din codul tău) ---
    const [draft, setDraft] = useState({
        nume_companie: "", grup_companie: "", domeniu_unitate_afaceri: "", forma_juridica: "", website: "",
        tara: "RO", regiune: "", oras: "", adresa: "", cod_postal: "",
        nivel_strategic: "Tinta", status_relatie: "Prospect", nivel_risc: "Mediu",
        nda_semnat: false, scor_conformitate: 0, note: "",
        logoFile: null, logoPreview: "",
    });

    useEffect(() => {
        return () => { if (draft.logoPreview) URL.revokeObjectURL(draft.logoPreview); };
    }, []);

    const resetDraft = () => {
        if (draft.logoPreview) URL.revokeObjectURL(draft.logoPreview);
        setDraft({
            nume_companie: "", grup_companie: "", domeniu_unitate_afaceri: "", forma_juridica: "", website: "",
            tara: "RO", regiune: "", oras: "", adresa: "", cod_postal: "",
            nivel_strategic: "Tinta", status_relatie: "Prospect", nivel_risc: "Mediu",
            nda_semnat: false, scor_conformitate: 0, note: "",
            logoFile: null, logoPreview: "",
        });
    };

    // --- SUBMIT (Stilul tău: try/catch/finally cu show/hide manual) ---
    const submitCompany = async () => {
        const fd = new FormData();
        if (draft.logoFile) fd.append("logo", draft.logoFile);
        fd.append("nume_companie", draft.nume_companie.trim());
        fd.append("grup_companie", draft.grup_companie || "");
        fd.append("domeniu_unitate_afaceri", draft.domeniu_unitate_afaceri || "");
        fd.append("forma_juridica", draft.forma_juridica || "");
        fd.append("website", draft.website || "");
        fd.append("tara", draft.tara || "RO");
        fd.append("regiune", draft.regiune || "");
        fd.append("oras", draft.oras || "");
        fd.append("adresa", draft.adresa || "");
        fd.append("cod_postal", draft.cod_postal || "");
        fd.append("nivel_strategic", draft.nivel_strategic || "Tinta");
        fd.append("status_relatie", draft.status_relatie || "Prospect");
        fd.append("nivel_risc", draft.nivel_risc || "Mediu");
        fd.append("nda_semnat", draft.nda_semnat ? "1" : "0");
        fd.append("scor_conformitate", String(Number(draft.scor_conformitate || 0)));
        fd.append("note", draft.note || "");
        fd.append("created_by_user_id", user.id);
        fd.append("updated_by_user_id", user.id);

        // AICI E EXACT CA INAINTE:
        show();
        try {
            // Folosim mutateAsync ca pe un axios.post normal
            await mutateAsync(fd);

            toast.success("Compania a fost adăugată cu succes!");
            setOpen(false);
            resetDraft();
        } catch (error) {
            const msg = error?.response?.data?.message || "A apărut o eroare la salvare.";
            toast.error(msg);
        } finally {
            hide();
        }
    };

    return (
        <div className="h-full w-full flex  justify-center overflow-hidden items-center">
            <div className="w-[95%] h-[95%] flex flex-col p-4  gap-4 overflow-hidden  bg-background relative rounded-lg">
                <div className="w-full bg-card grid grid-cols-[auto_1fr] rounded-lg px-8 p-4">
                    <CompaniesAddDialog
                        open={open}
                        setOpen={setOpen}
                        draft={draft}
                        setDraft={setDraft}
                        onSubmitCompany={submitCompany}
                        resetDraft={resetDraft}
                        buttonStyle={
                            <Button variant="default" size="lg" className="gap-2">
                                <FontAwesomeIcon icon={faPlus} className="text-base" />
                                <p className="">Adaugă o companie</p>
                            </Button>
                        }
                        reset={true}
                    />
                    <div className="relative justify-end w-full gap-2 xxl:gap-4 flex items-center">
                        <div className="max-w-md relative w-full">
                            <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                placeholder="Cauta companie dupa nume..."
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Separator orientation="vertical" className="h-full" />
                        <span className="text-muted-foreground">Companii: {data?.total || 0}</span>
                    </div>
                </div>
                {companiesList.length > 0 ? (
                    <CompaniesList companies={companiesList} searchName={searchNameDebounced} />
                ) : (
                    <div className="flex w-full h-full justify-center items-center">
                        <span className="text-2xl text-muted-foreground italic">
                            {/* Aici verificam isFetching ca sa afisam mesajul doar cand NU se incarca */}
                            {!isFetching && searchNameDebounced.trim() == "" ? "Nu există nicio companie adăugată..." :
                                !isFetching && `Nicio companie găsită pentru căutarea: "${searchNameDebounced.trim()}"`
                            }
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}