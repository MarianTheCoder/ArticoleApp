import React, { useState } from 'react';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import photoApi from "@/api/photoAPI";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPhone, faEnvelope, faBuilding, faMapLocationDot, faPenToSquare, faCommentDots, faTrash, faCrown,
    faCircleMinus
} from '@fortawesome/free-solid-svg-icons';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import {
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import ContactView from './ContactView';

export default function ContactsListByCompany({ contacts = [], visibleColumns, setDraft, setOpen, setOpenAsk, setOpenAskRemove, handleDeleteClick }) {

    const [openDrawer, setOpenDrawer] = useState(false);
    const showCol = (colKey) => visibleColumns ? visibleColumns[colKey] : true;

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return new Intl.DateTimeFormat("ro-RO", {
            dateStyle: "short", timeStyle: "short"
        }).format(d);
    };

    // --- THE ONLY HANDLER YOU NEED ---
    const handleRowClick = (e, contact) => {
        // 1. IGNORE INTERACTIVE ELEMENTS
        // If the user clicked a link (Email/LinkedIn) or a button, let that element handle it.
        if (e.target.closest('a, button, input')) return;

        // 2. IGNORE TEXT SELECTION
        // If the user is dragging to select text (in Name, Badge, Note, etc.), abort.
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            return;
        }

        // 3. TRIGGER ACTION
        // Only runs if it was a clean "tap" on the row
        console.log("Opening contact:", contact.nume);
        setOpenDrawer(contact);
    };

    const handleClickEdit = (contact) => {
        setDraft({
            id: contact.id,
            prenume: contact.prenume,
            nume: contact.nume,
            functie: contact.functie,
            categorie_rol: contact.categorie_rol,
            email: contact.email,
            telefon: contact.telefon,
            linkedin_url: contact.linkedin_url,
            putere_decizie: contact.putere_decizie,
            nivel_influenta: contact.nivel_influenta,
            canal_preferat: contact.canal_preferat,
            note: contact.note,
            logoFile: null,
            logoPreview: contact.logo_url ? `${photoApi}${contact.logo_url}` : null,
        });
        setOpen(true);
    };

    return (
        <div className="rounded-md border bg-card w-full h-full overflow-auto relative">
            <table className="w-full caption-bottom text-left min-w-max">
                <TableHeader className="bg-background sticky top-0 z-20 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b">
                        {/* ... Headers ... */}
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
                                    // 
                                    // Logic is now centralized here. 
                                    // It covers Name, Badges, Notes, and everything else automatically.
                                    onClick={(e) => handleRowClick(e, contact)}
                                    className={`
                                        cursor-pointer group transition-colors border-b
                                        ${contact.is_responsible
                                            ? "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/40"
                                            : "hover:bg-muted/50 data-[state=open]:bg-muted"
                                        }
                                    `}
                                >
                                    {showCol('nume') && (
                                        <TableCell className="text-left pl-6 py-3 whitespace-nowrap">
                                            <div className="flex items-center justify-start gap-4">
                                                <div className="relative">
                                                    <Avatar className="h-10 w-10 border border-border">
                                                        <AvatarImage src={contact.logo_url ? `${photoApi}${contact.logo_url}` : null} alt={contact.nume} />
                                                        <AvatarFallback className="font-bold text-foreground">{contact.prenume?.[0]}{contact.nume?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                </div>

                                                <div className="flex flex-col items-start">
                                                    <div className="flex items-center gap-2">
                                                        {/* CLEANED UP: No onClick here */}
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

                                    {/* All text fields are now clean. No onClick handlers needed. */}
                                    {showCol('functie') && <TableCell className="whitespace-nowrap px-4 text-center"><span className="text-base font-medium text-foreground cursor-text">{contact.functie || "—"}</span></TableCell>}

                                    {/* Links still need stopPropagation if you want them to be strictly clickable */}
                                    {showCol('email') && <TableCell className="whitespace-nowrap px-4 text-center">{contact.email ? <div className="flex items-center justify-center gap-2 text-base text-foreground transition-colors cursor-pointer"><FontAwesomeIcon icon={faEnvelope} className="text-muted-foreground w-3" /><span className='hover:text-primary' onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${contact.email}`; }}>{contact.email}</span></div> : <span className="text-foreground text-base">—</span>}</TableCell>}
                                    {showCol('telefon') && <TableCell className="whitespace-nowrap px-4 text-center">{contact.telefon ? <div className="flex items-center justify-center gap-2 text-base text-foreground hover:text-primary transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${contact.telefon}`; }}><FontAwesomeIcon icon={faPhone} className="text-muted-foreground w-3" /><span>{contact.telefon}</span></div> : <span className="text-foreground text-base">—</span>}</TableCell>}

                                    {/* Badges are covered by Row Handler now */}
                                    {showCol('santier') && <TableCell className="whitespace-nowrap px-4 text-center"><div className="flex justify-center">{contact.santier_nume ? <Badge variant="outline" className="gap-2 font-normal py-1 px-3 cursor-text"><FontAwesomeIcon icon={faMapLocationDot} className="w-3 text-muted-foreground" />{contact.santier_nume}</Badge> : <span className="text-foreground text-base opacity-50">—</span>}</div></TableCell>}
                                    {showCol('filiala') && <TableCell className="whitespace-nowrap px-4 text-center"><div className="flex justify-center">{contact.filiala_nume ? <Badge variant="secondary" className="gap-2 font-normal bg-muted text-foreground hover:bg-muted py-1 px-3 cursor-text"><FontAwesomeIcon icon={faBuilding} className="w-3 text-muted-foreground" />{contact.filiala_nume}</Badge> : <span className="text-foreground text-base opacity-50">—</span>}</div></TableCell>}

                                    {showCol('limba') && <TableCell className="text-center px-4"><Badge variant="outline">{contact.limba}</Badge></TableCell>}
                                    {showCol('activ') && <TableCell className="text-center whitespace-nowrap px-4">{contact.activ ? <Badge className="text-low hover:bg-transparent bg-transparent border-low shadow-none">Active</Badge> : <Badge variant="destructive" className="shadow-none">Inactive</Badge>}</TableCell>}
                                    {showCol('categorie_rol') && <TableCell className="whitespace-nowrap px-4 text-center"><span className="text-base cursor-text">{contact.categorie_rol || "—"}</span></TableCell>}
                                    {showCol('linkedin') && <TableCell className="text-center px-4">{contact.linkedin_url ? <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex justify-center" onClick={(e) => e.stopPropagation()}><FontAwesomeIcon icon={faLinkedin} className="text-xl" /></a> : <span className="text-foreground">—</span>}</TableCell>}
                                    {showCol('canal') && <TableCell className="whitespace-nowrap px-4 text-center"><span className="text-base cursor-text">{contact.canal_preferat}</span></TableCell>}
                                    {showCol('decizie') && <TableCell className="text-center t font-bold px-4">{contact.putere_decizie}/5</TableCell>}
                                    {showCol('influenta') && <TableCell className="text-center   font-bold px-4">{contact.nivel_influenta}/5</TableCell>}
                                    {showCol('note') && <TableCell className="px-4"><div className="flex items-center justify-center gap-2" title={contact.note}><FontAwesomeIcon icon={faCommentDots} className="text-foreground" /><span className="text-base truncate max-w-[15rem] block cursor-text">{contact.note || "—"}</span></div></TableCell>}
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
            {/* Contact  */}
            <ContactView
                open={openDrawer}
                setOpen={setOpenDrawer}
            />
        </div >
    );
}