import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import photoApi from "@/api/photoAPI";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPhone,
    faEnvelope,
    faBuilding,
    faMapLocationDot,
    faPenToSquare,
    faCommentDots,
    faTrash,
    faCopy
} from '@fortawesome/free-solid-svg-icons';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuShortcut,
} from "@/components/ui/context-menu" // <--- Import this

// Added onContactClick prop
export default function ContactsListByCompany({ contacts = [], visibleColumns, onContactClick }) {

    const showCol = (colKey) => visibleColumns ? visibleColumns[colKey] : true;

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(dateString));
    };

    // Helper to stop click from bubbling to the row
    // Use this on any text you want to be copyable/selectable without triggering the row click
    const handleTextClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div className="rounded-md border bg-card w-full overflow-x-auto">
            <Table className="min-w-max">
                <TableHeader className="bg-background ">
                    <TableRow className="hover:bg-transparent">
                        {/* Headers remain the same */}
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
                        {showCol('created') && <TableHead className="text-center px-4">Creat</TableHead>}
                        {showCol('updated') && <TableHead className="text-center px-4">Actualizat</TableHead>}
                        {/* Added an Actions column header if needed, usually blank or "Actions" */}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {contacts.map((contact) => (
                        <ContextMenu key={contact.id}>
                            <ContextMenuTrigger asChild>
                                <TableRow
                                    key={contact.id}
                                    // 1. Row Click Handler
                                    onClick={() => console.log("DAS")}
                                    className="hover:bg-muted/50 cursor-pointer group data-[state=open]:bg-muted transition-colors"
                                >

                                    {/* 1. NUME */}
                                    {showCol('nume') && (
                                        <TableCell className="text-left pl-6 py-3 whitespace-nowrap">
                                            <div className="flex items-center justify-start gap-4">
                                                <Avatar className="h-10 w-10 border border-border">
                                                    <AvatarImage
                                                        src={contact.logo_url ? `${photoApi}${contact.logo_url}` : null}
                                                        alt={contact.nume}
                                                    />
                                                    <AvatarFallback className="font-bold text-foreground">
                                                        {contact.prenume?.[0]}{contact.nume?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col items-start">
                                                    {/* 2. Stop propagation on text */}
                                                    <span
                                                        onClick={handleTextClick}
                                                        className="font-semibold text-foreground text-base cursor-text"
                                                    >
                                                        {contact.prenume} {contact.nume}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* 2. FUNCTIE */}
                                    {showCol('functie') && (
                                        <TableCell className="whitespace-nowrap px-4">
                                            <div className="flex justify-center">
                                                <span
                                                    onClick={handleTextClick}
                                                    className="text-base font-medium text-foreground cursor-text"
                                                >
                                                    {contact.functie || "—"}
                                                </span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* 3. EMAIL */}
                                    {showCol('email') && (
                                        <TableCell className="whitespace-nowrap px-4">
                                            {contact.email ? (
                                                <div
                                                    className="flex items-center justify-center gap-2 text-base text-foreground transition-colors cursor-pointer"

                                                >
                                                    <FontAwesomeIcon icon={faEnvelope} className="text-muted-foreground w-3" />
                                                    <span            //
                                                        className='hover:text-primary '
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.location.href = `mailto:${contact.email}`;
                                                        }}
                                                    >
                                                        {contact.email}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center">
                                                    <span className="text-foreground text-base">—</span>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}

                                    {/* 4. TELEFON */}
                                    {showCol('telefon') && (
                                        <TableCell className="whitespace-nowrap px-4">
                                            {contact.telefon ? (
                                                <div
                                                    className="flex items-center justify-center gap-2 text-base text-foreground hover:text-primary transition-colors cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `tel:${contact.telefon}`;
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faPhone} className="text-muted-foreground w-3" />
                                                    <span>{contact.telefon}</span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center">
                                                    <span className="text-foreground text-base">—</span>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}

                                    {/* 5. SANTIER */}
                                    {showCol('santier') && (
                                        <TableCell className="whitespace-nowrap px-4">
                                            <div className="flex justify-center" onClick={handleTextClick}>
                                                {contact.santier_nume ? (
                                                    <Badge variant="outline" className="gap-2 font-normal py-1 px-3 cursor-text">
                                                        <FontAwesomeIcon icon={faMapLocationDot} className="w-3 text-muted-foreground" />
                                                        {contact.santier_nume}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-foreground text-base opacity-50">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* 6. FILIALA */}
                                    {showCol('filiala') && (
                                        <TableCell className="whitespace-nowrap px-4">
                                            <div className="flex justify-center" onClick={handleTextClick}>
                                                {contact.filiala_nume ? (
                                                    <Badge variant="secondary" className="gap-2 font-normal bg-muted text-foreground hover:bg-muted py-1 px-3 cursor-text">
                                                        <FontAwesomeIcon icon={faBuilding} className="w-3 text-muted-foreground" />
                                                        {contact.filiala_nume}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-foreground text-base opacity-50">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* EXTRAS */}
                                    {showCol('limba') && (
                                        <TableCell className="text-center px-4">
                                            <Badge variant="outline">{contact.limba}</Badge>
                                        </TableCell>
                                    )}
                                    {showCol('activ') && (
                                        <TableCell className="text-center whitespace-nowrap px-4">
                                            {contact.activ ? (
                                                <Badge className="text-low hover:bg-transparent bg-transparent border-low shadow-none">Active</Badge>
                                            ) : (
                                                <Badge variant="destructive" className="shadow-none">Inactive</Badge>
                                            )}
                                        </TableCell>
                                    )}

                                    {showCol('categorie_rol') && (
                                        <TableCell className="whitespace-nowrap px-4">
                                            <div className="flex justify-center">
                                                <span onClick={handleTextClick} className="text-base cursor-text">{contact.categorie_rol || "—"}</span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {showCol('linkedin') && (
                                        <TableCell className="text-center px-4">
                                            {contact.linkedin_url ? (
                                                <a
                                                    href={contact.linkedin_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 flex justify-center"
                                                    onClick={(e) => e.stopPropagation()} // Stop row click on link
                                                >
                                                    <FontAwesomeIcon icon={faLinkedin} className="text-xl" />
                                                </a>
                                            ) : <span className="text-foreground">—</span>}
                                        </TableCell>
                                    )}

                                    {showCol('canal') && (
                                        <TableCell className="whitespace-nowrap px-4">
                                            <div className="flex justify-center">
                                                <span onClick={handleTextClick} className="text-base cursor-text">{contact.canal_preferat}</span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {showCol('decizie') && <TableCell className="text-center font-bold px-4">{contact.putere_decizie}/5</TableCell>}
                                    {showCol('influenta') && <TableCell className="text-center font-bold px-4">{contact.nivel_influenta}/5</TableCell>}

                                    {showCol('note') && (
                                        <TableCell className="px-4">
                                            <div className="flex items-center justify-center gap-2" title={contact.note}>
                                                <FontAwesomeIcon icon={faCommentDots} className="text-foreground" />
                                                <span onClick={handleTextClick} className="text-base truncate max-w-[15rem] block cursor-text">{contact.note || "—"}</span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {showCol('created') && <TableCell className="text-sm text-foreground whitespace-nowrap px-4 text-center">{formatDate(contact.created_at)}</TableCell>}
                                    {showCol('updated') && <TableCell className="text-sm text-foreground whitespace-nowrap px-4 text-center">{formatDate(contact.updated_at)}</TableCell>}

                                </TableRow>
                            </ContextMenuTrigger>

                            {/* 3. The Menu Content that appears on right-click */}
                            <ContextMenuContent className="w-48">
                                <ContextMenuItem className="gap-3" onClick={() => console.log("Edit", contact.id)}>
                                    <FontAwesomeIcon icon={faPenToSquare} className="" />
                                    Edit Contact
                                </ContextMenuItem>
                                <ContextMenuItem className="gap-3" onClick={() => navigator.clipboard.writeText(contact.email)}>
                                    <FontAwesomeIcon icon={faEnvelope} className="" />
                                    Copy Email
                                </ContextMenuItem>
                                <ContextMenuItem className="gap-3" onClick={() => navigator.clipboard.writeText(contact.telefon)}>
                                    <FontAwesomeIcon icon={faPhone} className="" />
                                    Copy Phone
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => console.log("Delete", contact.id)}>
                                    <FontAwesomeIcon icon={faTrash} className="" />
                                    Delete
                                </ContextMenuItem>
                            </ContextMenuContent>

                        </ContextMenu>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}