import React, { useLayoutEffect, useRef, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMapLocationDot,
    faPenToSquare,
    faTrash,
    faBuilding,
    faUserTie,
    faEllipsis,
    faClock,
    faEnvelope,
    faPhone,
    faCrown,
    faCircleMinus,
    faHelmetSafety
} from '@fortawesome/free-solid-svg-icons';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import photoApi from "@/api/photoAPI";
import ContactView from './ContactView';

export default function ContactsListByCompany({
    contacts = [],
    visibleColumns,
    setDraft,
    setOpen,
    setOpenAsk,
    setOpenAskRemove,
    handleDeleteClick,
    isCardView = false
}) {


    // --- 1. SCROLL PRESERVATION LOGIC ---
    const containerRef = useRef(null);
    const scrollPosRef = useRef(0);

    // Salvăm scroll-ul manual la evenimentul de scroll
    const handleScroll = (e) => {
        if (e.target) {
            scrollPosRef.current = e.target.scrollTop;
        }
    };
    // Restaurăm scroll-ul imediat după randare (înainte de paint)
    useLayoutEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = scrollPosRef.current;
        }
    }, [contacts]); // Se activează când lista se schimbă (ex: după editare)

    const [openDrawer, setOpenDrawer] = useState(false);

    const showCol = (colKey) => visibleColumns ? visibleColumns[colKey] : true;

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return new Intl.DateTimeFormat("ro-RO", {
            dateStyle: "short"
        }).format(d);
    };

    const formatDateAndTime = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return new Intl.DateTimeFormat("ro-RO", {
            dateStyle: "short", timeStyle: "short"
        }).format(d);
    };

    const handleRowClick = (e, contact) => {
        if (e.target.closest('a, button, input')) return;
        const selection = window.getSelection();
        if (selection.toString().length > 0) return;
        setOpenDrawer(contact);
    };

    const handleClickEdit = (contact) => {
        setDraft({
            id: contact.id,
            prenume: contact.prenume,
            nume: contact.nume,
            activ: contact.activ,
            filiala_id: contact.filiala_id,
            santier_id: contact.santier_id,
            functie: contact.functie,
            categorie_rol: contact.categorie_rol,
            email: contact.email,
            telefon: contact.telefon,
            linkedin_url: contact.linkedin_url,
            putere_decizie: contact.putere_decizie,
            nivel_influenta: contact.nivel_influenta,
            canal_preferat: contact.canal_preferat,
            note: contact.note,
            limba: contact.limba,
            logoFile: null,
            logoPreview: contact.logo_url ? `${photoApi}/${contact.logo_url}` : null,
        });
        setOpen(true);
    };

    return (
        <>
            {isCardView ? (
                <div
                    ref={containerRef}       // 1. Ref container
                    onScroll={handleScroll}  // 2. Ascultă scroll
                    className="w-full h-full overflow-auto p-2"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {contacts.map(contact => (
                            <Card
                                key={contact.id}
                                className={`group flex flex-col justify-between shadow-sm border-2 border-border transition-all duration-200 bg-card hover:shadow-md ${contact.is_responsible ? "border-yellow-400/50 bg-yellow-50/30 dark:bg-yellow-900/10" : ""}`}
                            >
                                <CardContent className="p-4 pb-3 flex-1">
                                    {/* --- HEADER: Avatar, Name, Function, Menu --- */}
                                    <div className="flex gap-4 mb-4">
                                        <div className="relative shrink-0">
                                            <Avatar className="h-12 w-12 rounded-lg border border-border">
                                                <AvatarImage src={contact.logo_url ? `${photoApi}/${contact.logo_url}` : null} alt={contact.nume} />
                                                <AvatarFallback className="text-sm font-bold text-foreground bg-muted rounded-lg">{contact.prenume?.[0]}{contact.nume?.[0]}</AvatarFallback>
                                            </Avatar>
                                            {contact.is_responsible && (
                                                <div className="absolute -top-2 -right-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-full p-1 border border-yellow-200 dark:border-yellow-800" title="Responsabil Companie">
                                                    <FontAwesomeIcon icon={faCrown} className="text-yellow-500 text-xs block" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex justify-between items-start">
                                                <h3
                                                    className="font-bold text-base text-foreground truncate pr-1 leading-tight cursor-pointer"
                                                    title={`${contact.prenume} ${contact.nume}`}
                                                >
                                                    {contact.prenume} {contact.nume}
                                                </h3>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-2 text-muted-foreground hover:text-foreground">
                                                            <FontAwesomeIcon icon={faEllipsis} className="text-base" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => { if (contact.is_responsible) setOpenAskRemove(contact?.id); else setOpenAsk(contact?.id) }}>
                                                            <FontAwesomeIcon icon={contact?.is_responsible ? faCircleMinus : faCrown} className={`mr-2 h-4 w-4 ${!contact.is_responsible ? "text-yellow-400" : "text-destructive"} `} />
                                                            {contact.is_responsible ? "Elimină Responsabil" : "Setează Responsabil"}
                                                        </DropdownMenuItem>
                                                        <ContextMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleClickEdit(contact)}>
                                                            <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-4 w-4" />
                                                            Editează
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick({ nume: `${contact.prenume} ${contact.nume}`, id: contact.id })}>
                                                            <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" />
                                                            Șterge
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                {contact.activ ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge className="text-low hover:bg-transparent bg-transparent border-low shadow-none px-1.5 h-5 text-xs">Activ</Badge>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="destructive" className="shadow-none px-1.5 h-5 text-xs">Inactiv</Badge>
                                                    </div>
                                                )}
                                                <Badge variant="outline" className="text-xs h-5 px-1.5 border-muted-foreground/30 text-muted-foreground">{contact.limba}</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- BODY: Details --- */}
                                    <div className="space-y-2 pt-1 border-t border-border mt-3">

                                        <div className="flex items-center justify-between gap-2 text-base mt-2">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faUserTie} className="w-3.5 text-sm opacity-70" />
                                                <span>Funcție</span>
                                            </div>
                                            <span className="font-medium text-foreground truncate " title={contact.functie}>
                                                {contact.functie || "—"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 text-base">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faEnvelope} className="w-3.5 text-sm opacity-70" />
                                                <span>Email</span>
                                            </div>
                                            <span
                                                className={`truncate  ${contact.email ? "text-foreground cursor-pointer hover:text-primary transition-colors" : "text-foreground"}`}
                                                title={contact.email}
                                                onClick={(e) => { if (contact.email) { e.stopPropagation(); window.location.href = `mailto:${contact.email}`; } }}
                                            >
                                                {contact.email || "—"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 text-base">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faPhone} className="w-3.5 text-sm opacity-70" />
                                                <span>Telefon</span>
                                            </div>
                                            <span
                                                className={`truncate  ${contact.telefon ? "text-foreground cursor-pointer hover:text-primary transition-colors" : "text-foreground"}`}
                                                title={contact.telefon}
                                                onClick={(e) => { if (contact.telefon) { e.stopPropagation(); window.location.href = `tel:${contact.telefon}`; } }}
                                            >
                                                {contact.telefon || "—"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 justify-between text-base">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faBuilding} className="w-3.5 text-sm opacity-70" />
                                                <span>Filială</span>
                                            </div>
                                            <span className="font-medium text-foreground truncate">
                                                {contact.nume_filiala || "—"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 justify-between text-base">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faHelmetSafety} className="w-3.5 text-sm opacity-70" />
                                                <span>Șantier</span>
                                            </div>
                                            <span className="font-medium text-foreground truncate">
                                                {contact.nume_santier || "—"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-base">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faClock} className="w-3.5 text-sm opacity-70" />
                                                <span>Actualizat</span>
                                            </div>
                                            <span className="text-sm text-muted-foreground truncate">{formatDateAndTime(contact.updated_at)}</span>
                                        </div>
                                    </div>

                                    {/* --- FOOTER CONTENT: CREATED BY --- */}
                                    <div className="mt-4 flex items-center border-t border-border gap-3 pt-3">
                                        <Avatar className="h-8 w-8 border border-border">
                                            {/* Assuming contact.created_by_photo_url exists in your data join, if not it falls back */}
                                            <AvatarImage src={photoApi + "/" + contact.created_by_photo_url || ""} />
                                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                                <FontAwesomeIcon icon={faUserTie} />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs text-muted-foreground">Creat de</span>
                                            <span className="text-sm font-medium text-foreground/90 truncate">
                                                {contact.created_by_name || "Sistem"}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>

                                {/* --- ACTIONS FOOTER --- */}
                                <CardFooter className="p-3 border-t border-border grid grid-cols-[1fr_auto_auto] gap-2" >
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors"
                                        onClick={(e) => setOpenDrawer(contact)}
                                    >
                                        Detalii
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!contact.filiala_id}
                                        title={contact.nume_filiala || "Fără Filială"}
                                        className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={(e) => { e.stopPropagation(); console.log(contact.nume_filiala) }}
                                    >
                                        <FontAwesomeIcon icon={faBuilding} className="text-base" />
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!contact.santier_id}
                                        title={contact.nume_santier || "Fără Șantier"}
                                        className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={(e) => { e.stopPropagation(); console.log(contact.nume_santier) }}
                                    >
                                        <FontAwesomeIcon icon={faMapLocationDot} className="text-base" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div >
                    {contacts.length === 0 && <div className="text-center p-10 text-muted-foreground">Nu există contacte.</div>}
                </div >
            ) : (
                <div
                    ref={containerRef}       // 1. Ref container
                    onScroll={handleScroll}  // 2. Ascultă scroll
                    className="rounded-md border bg-card w-full h-full overflow-auto relative"
                >
                    <table className="w-full caption-bottom text-left min-w-max">
                        <TableHeader className="bg-background sticky top-0 z-20 shadow-sm">
                            <TableRow className="hover:bg-transparent border-b">
                                {showCol('nume') && <TableHead className="text-left pl-6 py-4">Nume</TableHead>}
                                {showCol('functie') && <TableHead className="text-center px-4">Funcție</TableHead>}
                                {showCol('email') && <TableHead className="text-center px-4">Email</TableHead>}
                                {showCol('telefon') && <TableHead className="text-center px-4">Telefon</TableHead>}
                                {showCol('santier') && <TableHead className="text-center px-4">Șantier</TableHead>}
                                {showCol('filiala') && <TableHead className="text-center px-4">Filială</TableHead>}
                                {showCol('limba') && <TableHead className="text-center px-4">Limbă</TableHead>}
                                {showCol('activ') && <TableHead className="text-center px-4">Status</TableHead>}
                                {showCol('categorie_rol') && <TableHead className="text-center px-4">Categorie</TableHead>}
                                {showCol('linkedin') && <TableHead className="text-center px-4">LinkedIn</TableHead>}
                                {showCol('canal') && <TableHead className="text-center px-4">Canal Pref.</TableHead>}
                                {showCol('decizie') && <TableHead className="text-center px-4">Decizie</TableHead>}
                                {showCol('influenta') && <TableHead className="text-center px-4">Influență</TableHead>}
                                {showCol('note') && <TableHead className="text-center px-4 min-w-[200px]">Notițe</TableHead>}
                                {showCol('creat') && <TableHead className="text-center px-4">Creat</TableHead>}
                                {showCol('actualizat') && <TableHead className="text-center px-4">Actualizat</TableHead>}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {contacts.map((contact) => (
                                <ContextMenu key={contact.id}>
                                    <ContextMenuTrigger asChild>
                                        <TableRow
                                            key={contact.id}
                                            onClick={(e) => handleRowClick(e, contact)}
                                            className={`
                                                cursor-pointer group transition-colors border-b
                                                ${contact.is_responsible
                                                    ? "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/40"
                                                    : "hover:bg-muted/50 data-[state=open]:bg-muted"
                                                }
                                            `}
                                        >
                                            {/* Name & Photo */}
                                            {showCol('nume') && (
                                                <TableCell className="text-left pl-6 py-3 whitespace-nowrap">
                                                    <div className="flex items-center justify-start gap-4">
                                                        <div className="relative">
                                                            <Avatar className="h-10 w-10 border border-border">
                                                                <AvatarImage src={contact.logo_url ? `${photoApi}/${contact.logo_url}` : null} alt={contact.nume} />
                                                                <AvatarFallback className="font-bold text-foreground">{contact.prenume?.[0]}{contact.nume?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                        </div>

                                                        <div className="flex flex-col items-start">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-foreground text-base cursor-text">
                                                                    {contact.prenume} {contact.nume}
                                                                </span>
                                                                {contact.is_responsible && (
                                                                    <div className="flex items-center justify-center" title="Responsabil Companie">
                                                                        <FontAwesomeIcon icon={faCrown} className="text-yellow-500 text-sm drop-shadow-sm" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            )}

                                            {showCol('functie') && <TableCell className="whitespace-nowrap px-4 text-center"><span className="text-base font-medium text-foreground cursor-text">{contact.functie || "—"}</span></TableCell>}
                                            {showCol('email') && <TableCell className="whitespace-nowrap px-4 text-center">{contact.email ? <div className="flex items-center justify-center gap-2 text-base text-foreground transition-colors cursor-pointer"><FontAwesomeIcon icon={faEnvelope} className="text-muted-foreground w-3" /><span className='hover:text-primary' onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${contact.email}`; }}>{contact.email}</span></div> : <span className="text-foreground text-base">—</span>}</TableCell>}
                                            {showCol('telefon') && <TableCell className="whitespace-nowrap px-4 text-center">{contact.telefon ? <div className="flex items-center justify-center gap-2 text-base text-foreground hover:text-primary transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${contact.telefon}`; }}><FontAwesomeIcon icon={faPhone} className="text-muted-foreground w-3" /><span>{contact.telefon}</span></div> : <span className="text-foreground text-base">—</span>}</TableCell>}
                                            {showCol('santier') &&
                                                <TableCell className="whitespace-nowrap px-4 text-center">
                                                    <div className="flex justify-center">
                                                        {contact.nume_santier ? (
                                                            <Button size="sm" variant="outline" className="h-10 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors" onClick={() => console.log("Clicked Santier:", contact.nume_santier)}>
                                                                {contact.nume_santier}
                                                            </Button>
                                                        ) : (
                                                            <span className="text-foreground text-base opacity-60">—</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            }
                                            {showCol('filiala') &&
                                                <TableCell className="whitespace-nowrap px-4 text-center">
                                                    <div className="flex justify-center">
                                                        {contact.nume_filiala ? (
                                                            <Button size="sm" variant="outline" className="h-10 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary px-4 transition-colors" onClick={() => console.log("Clicked Filiala:", contact.nume_filiala)}>
                                                                {contact.nume_filiala}
                                                            </Button>
                                                        ) : (
                                                            <span className="text-foreground text-base opacity-60">—</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            }
                                            {showCol('limba') && <TableCell className="text-center px-4"><Badge variant="outline">{contact.limba}</Badge></TableCell>}
                                            {showCol('activ') && <TableCell className="text-center whitespace-nowrap px-4">{contact.activ ? <Badge className="text-low hover:bg-transparent bg-transparent border-low shadow-none">Activ</Badge> : <Badge variant="destructive" className="shadow-none">Inactiv</Badge>}</TableCell>}
                                            {showCol('categorie_rol') && <TableCell className="whitespace-nowrap px-4 text-center"><span className="text-base cursor-text">{contact.categorie_rol || "—"}</span></TableCell>}
                                            {showCol('linkedin') && <TableCell className="text-center px-4">{contact.linkedin_url ? <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex justify-center" onClick={(e) => e.stopPropagation()}><FontAwesomeIcon icon={faLinkedin} className="text-xl" /></a> : <span className="text-foreground">—</span>}</TableCell>}
                                            {showCol('canal') && <TableCell className="whitespace-nowrap px-4 text-center"><span className="text-base cursor-text">{contact.canal_preferat}</span></TableCell>}
                                            {showCol('decizie') && <TableCell className="text-center t font-bold px-4">{contact.putere_decizie}/5</TableCell>}
                                            {showCol('influenta') && <TableCell className="text-center   font-bold px-4">{contact.nivel_influenta}/5</TableCell>}
                                            {showCol('note') && <TableCell className="px-4"><div className="flex items-center justify-center gap-2" title={contact.note}><span className="text-base truncate max-w-[15rem] block cursor-text">{contact.note || "—"}</span></div></TableCell>}
                                            {showCol('creat') && <TableCell className="text-sm  whitespace-nowrap px-4 text-center">{formatDate(contact.created_at)}</TableCell>}
                                            {showCol('actualizat') && <TableCell className="text-sm  whitespace-nowrap px-4 text-center">{formatDate(contact.updated_at)}</TableCell>}
                                        </TableRow>
                                    </ContextMenuTrigger>

                                    <ContextMenuContent>
                                        <ContextMenuItem className="gap-3" onClick={() => { if (contact.is_responsible) setOpenAskRemove(contact?.id); else setOpenAsk(contact?.id) }}>
                                            <FontAwesomeIcon icon={contact?.is_responsible ? faCircleMinus : faCrown} className={` ${!contact.is_responsible ? "text-yellow-400" : "text-destructive"} `} />
                                            {contact.is_responsible ? "Elimină Responsabil" : "Setează Responsabil"}
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem disabled={!contact.email} className="gap-3" onClick={() => navigator.clipboard.writeText(contact.email)}><FontAwesomeIcon icon={faEnvelope} /> Copiază Email</ContextMenuItem>
                                        <ContextMenuItem disabled={!contact.telefon} className="gap-3" onClick={() => navigator.clipboard.writeText(contact.telefon)}><FontAwesomeIcon icon={faPhone} /> Copiază Telefon</ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem className="gap-3 text-low hover:text-low focus:text-low " onClick={() => handleClickEdit(contact)}><FontAwesomeIcon icon={faPenToSquare} /> Editează</ContextMenuItem>
                                        <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => handleDeleteClick({ nume: contact.prenume + " " + contact.nume, id: contact.id })}><FontAwesomeIcon icon={faTrash} /> Șterge</ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            ))}
                        </TableBody>
                    </table>
                </div>
            )
            }

            {
                openDrawer && (
                    <ContactView
                        open={openDrawer}
                        setOpen={setOpenDrawer}
                    />
                )
            }
        </>
    );
}