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
    faCircle,
    faCalendarDays,
    faBuilding,
    faCommentDots,
    faUserTie,
    faMapMarkerAlt,
    faCircleCheck,
    faCircleXmark,
    faEllipsis,
    faHardHat,
    faUsers,
    faCity,
    faClock,
    faLocationDot
} from '@fortawesome/free-solid-svg-icons';
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
import photoAPI from '@/api/photoAPI';
import { useNavigate } from 'react-router-dom';

// Placeholder for the Detail Drawer
// import SantierView from './SantierView'; 

export default function SantiereListByCompany({
    companyId = null,
    santiere = [],
    visibleColumns,
    setDraft,
    setOpen,
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
    }, [santiere]); // Se activează când lista se schimbă (ex: după editare)

    const navigate = useNavigate();

    // Helper to check if a column should be shown
    // Note: You might need to add 'inceput' and 'sfarsit' keys to your visibleColumns state in the parent
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


    // --- ROW CLICK HANDLER ---
    const handleRowClick = (e, santier) => {
        if (e.target.closest('a, button, input')) return;
        const selection = window.getSelection();
        if (selection.toString().length > 0) return;
        navigate(`/CRM/Santiere/View/${santier.companie_id}/${santier.id}`);
    };

    const handleClickEdit = (santier) => {
        setDraft({
            id: santier.id,
            companie_id: santier.companie_id,
            nume: santier.nume,
            culoare_hex: santier.culoare_hex || "#FFFFFF",
            filiala_id: santier.filiala_id,
            activ: !!santier.activ,
            notita: santier.notita || "",
            data_inceput: santier.data_inceput ? santier.data_inceput.split('T')[0] : "",
            data_sfarsit: santier.data_sfarsit ? santier.data_sfarsit.split('T')[0] : "",
            adresa: santier.adresa || "",
            longitudine: santier.longitudine || "",
            latitudine: santier.latitudine || ""
        });
        setOpen(true);
    };

    // --- 2. TABLE VIEW MODE ---
    return (
        <>
            {isCardView ? (
                <div
                    ref={containerRef}       // 1. Ref container
                    onScroll={handleScroll}  // 2. Ascultă scroll
                    className="w-full h-full overflow-auto p-2"
                >
                    <div className={`grid grid-cols-1  gap-4  ${!companyId ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6" : "xl:grid-cols-4 md:grid-cols-2 lg:grid-cols-3"}`}>
                        {santiere.map(santier => (
                            <Card
                                key={santier.id}
                                className="group flex flex-col justify-between shadow-sm border-4 border-border transition-all duration-200 bg-card hover:shadow-md"
                            >
                                <CardContent className="p-4 pb-3 flex-1">
                                    {/* Header Section */}
                                    <div className="flex gap-4 mb-4">
                                        {/* "Logo" / Icon Box */}
                                        <div
                                            className="h-12 w-12 shrink-0 rounded-lg border border-border flex items-center justify-center overflow-hidden"
                                            style={{ backgroundColor: santier.culoare_hex ? `${santier.culoare_hex}` : '#f3f4f6' }}
                                        >
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex justify-between items-start">
                                                <h3
                                                    className="font-bold text-base text-foreground truncate pr-1 leading-tight cursor-pointer"
                                                    title={santier.nume}
                                                    onClick={(e) => handleRowClick(e, santier)}
                                                >
                                                    {santier.nume}
                                                </h3>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-2 text-muted-foreground hover:text-foreground">
                                                            <FontAwesomeIcon icon={faEllipsis} className="text-base" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleClickEdit(santier)}>
                                                            <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-4 w-4" />
                                                            Editează
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick({ nume: santier.nume, id: santier.id })}>
                                                            <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" />
                                                            Șterge
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                {santier.activ ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge className="text-low hover:bg-transparent bg-transparent border-low shadow-none" >Activ</Badge>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="destructive" className=" shadow-none">Inactiv</Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Section */}
                                    <div className="space-y-2 pt-1 border-t border-border mt-3">
                                        {!companyId &&
                                            <div className="flex justify-between gap-2 text-sm mt-2">
                                                <div className="flex gap-2 items-center  text-muted-foreground">
                                                    <FontAwesomeIcon icon={faCity} className="w-3.5 text-sm opacity-70" />
                                                    <span>Companie</span>
                                                </div>
                                                <Button
                                                    size="sm" variant="outline"
                                                    onClick={() => navigate(`/CRM/Companii/View/${santier.companie_id}`)}
                                                    className="text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                                                >
                                                    {santier.companie_nume}
                                                </Button>
                                            </div>
                                        }

                                        <div className="flex items-center gap-2 justify-between text-base">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faBuilding} className="w-3.5 text-sm opacity-70" />
                                                <span>Filială</span>
                                            </div>
                                            {santier.filiala_nume ?
                                                <Button
                                                    size="sm" variant="outline"
                                                    onClick={() => navigate(`/CRM/Filiale/View/${santier.companie_id}/${santier.filiala_id}`)}
                                                    className="text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                                                >
                                                    {santier.filiala_nume}
                                                </Button>
                                                : <span className="font-medium text-foreground truncate">
                                                    {santier.filiala_nume || "—"}
                                                </span>
                                            }
                                        </div>
                                        <div className="flex items-center gap-2 justify-between text-base mt-2">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3.5 text-sm opacity-70" />
                                                <span>Locație</span>
                                            </div>
                                            <span className="font-medium text-foreground truncate" title={santier.adresa}>
                                                {santier.adresa || "—"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 justify-between text-base">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faBuilding} className="w-3.5 text-sm opacity-70" />
                                                <span>Filială</span>
                                            </div>
                                            <span className="font-medium text-foreground truncate">
                                                {santier.filiala_nume || "—"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 justify-between text-base">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faCalendarDays} className="w-3.5 text-sm opacity-70" />
                                                <span>Început</span>
                                            </div>
                                            {santier.data_inceput ?
                                                <span className="text-sm text-foreground truncate">
                                                    {formatDate(santier.data_inceput)}
                                                </span> :
                                                <span className="font-medium text-foreground truncate">
                                                    —
                                                </span>
                                            }
                                        </div>
                                        <div className="flex items-center gap-2 justify-between text-base">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <FontAwesomeIcon icon={faClock} className="w-3.5 text-sm opacity-70" />
                                                <span>Actualizat</span>
                                            </div>
                                            <span className=" text-sm text-muted-foreground truncate">{formatDateAndTime(santier.updated_at)}</span>
                                        </div>
                                    </div>

                                    {/* Footer / User Info */}
                                    <div className="mt-4 flex items-center border-t border-border gap-3 pt-3">
                                        <Avatar className="h-8 w-8 border border-border">
                                            {/* Assuming created_by_photo might exist, otherwise generic */}
                                            <AvatarImage src={photoAPI + "/" + santier.created_by_photo_url || ""} />
                                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                                <FontAwesomeIcon icon={faUserTie} />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs text-muted-foreground">Creat de</span>
                                            <span className="text-sm font-medium text-foreground/90 truncate">
                                                {/* Using created_by_name from your controller logic if available, else 'Sistem' */}
                                                {santier.created_by_name || "Sistem"}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="p-3  border-t border-border grid grid-cols-[1fr_auto_auto_auto] gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors"
                                        onClick={(e) => navigate(`/CRM/Santiere/View/${santier.companie_id}/${santier.id}`)}
                                    >
                                        Detalii
                                    </Button>
                                    {/* Example secondary button, e.g. for quick notes */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors"
                                    // onClick={(e) => handleRowClick(e, santier)}
                                    >
                                        <FontAwesomeIcon icon={faUsers} className="text-base" />
                                    </Button>

                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                    {santiere.length === 0 && <div className="text-center p-10 text-muted-foreground">Nu există șantiere.</div>}
                </div >
            ) : (
                <div
                    ref={containerRef}       // 1. Ref container
                    onScroll={handleScroll}  // 2. Ascultă scroll
                    className="rounded-md border bg-card w-full h-full overflow-auto relative"
                >
                    <Table className="w-full caption-bottom text-left min-w-max">
                        <TableHeader className="bg-background sticky top-0 z-20 shadow-sm">
                            <TableRow className="hover:bg-transparent border-b">
                                {showCol('companie') && <TableHead className="text-center px-4">Companie</TableHead>}
                                {showCol('filiala') && <TableHead className="text-center px-4">Filială</TableHead>}
                                {showCol('nume') && <TableHead className="text-left pl-6 py-4">Nume Șantier</TableHead>}
                                {showCol('status') && <TableHead className="text-center px-4">Status</TableHead>}
                                {showCol('adresa') && <TableHead className="text-center px-4">Locație</TableHead>}
                                {showCol('inceput') && <TableHead className="text-center px-4 whitespace-nowrap">Început</TableHead>}
                                {showCol('sfarsit') && <TableHead className="text-center px-4 whitespace-nowrap">Sfârșit</TableHead>}
                                {showCol('notita') && <TableHead className="text-center px-4 min-w-[200px]">Notiță</TableHead>}
                                {showCol('creat') && <TableHead className="text-center px-4">Creat</TableHead>}
                                {showCol('actualizat') && <TableHead className="text-center px-4">Actualizat</TableHead>}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {santiere.map((santier) => (
                                <ContextMenu key={santier.id}>
                                    <ContextMenuTrigger asChild>
                                        <TableRow
                                            key={santier.id}
                                            onClick={(e) => handleRowClick(e, santier)}
                                            className="cursor-pointer group transition-colors border-b hover:bg-muted/50 data-[state=open]:bg-muted"
                                        >
                                            {/* Filiala */}
                                            {showCol('companie') && (
                                                <TableCell className="whitespace-nowrap px-4 text-center">
                                                    <div className="flex justify-center">
                                                        {santier.companie_nume ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => navigate(`/CRM/Companii/View/${santier.companie_id}`)}
                                                                variant="outline"
                                                                className="h-10 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors"
                                                            >
                                                                {santier.companie_nume}
                                                            </Button>
                                                        ) : (
                                                            <span className="text-foreground text-base opacity-60">—</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                            {/* Filiala */}
                                            {showCol('filiala') && (
                                                <TableCell className="whitespace-nowrap px-4 text-center">
                                                    <div className="flex justify-center">
                                                        {santier.filiala_nume ? (
                                                            <Button size="sm"
                                                                variant="outline"
                                                                onClick={() => navigate(`/CRM/Filiale/View/${santier.companie_id}/${santier.filiala_id}`)}
                                                                className="h-10 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors">
                                                                {santier.filiala_nume}
                                                            </Button>
                                                        ) : (
                                                            <span className="text-foreground text-base opacity-60">—</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                            {showCol('nume') && (
                                                <TableCell className="text-left pl-6 py-3 whitespace-nowrap">
                                                    <div className="flex items-center justify-start gap-4">
                                                        <div className="relative">
                                                            {/* Using Color Dot as 'Avatar' equivalent */}
                                                            <div
                                                                className="h-10 w-10 rounded-full shadow-sm border flex items-center justify-center"
                                                                style={{ backgroundColor: santier.culoare_hex || '#ccc' }}
                                                            >
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-start">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-foreground text-base cursor-text">
                                                                    {santier.nume}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            )}

                                            {/* Status */}
                                            {showCol('status') && (
                                                <TableCell className="text-center whitespace-nowrap px-4">
                                                    {santier.activ ?
                                                        <Badge className="text-low hover:bg-transparent bg-transparent border-low shadow-none" >Activ</Badge> :
                                                        <Badge variant="destructive" className=" shadow-none">Inactiv</Badge>
                                                    }
                                                </TableCell>
                                            )}

                                            {/* Adresa */}
                                            {showCol('adresa') && (
                                                <TableCell className="px-4 whitespace-nowrap text-center">
                                                    {santier.adresa ? (
                                                        <span className="truncate" title={santier.adresa}>
                                                            {santier.adresa || "—"}
                                                        </span>
                                                    ) : (
                                                        <span className="text-foreground text-base opacity-60">—</span>
                                                    )}
                                                </TableCell>
                                            )}

                                            {/* Data Început */}
                                            {showCol('inceput') && (
                                                <TableCell className="whitespace-nowrap px-4 text-center">
                                                    {santier.data_inceput ? (
                                                        <div className="flex items-center justify-center gap-2 text-base text-foreground">
                                                            <span>{formatDate(santier.data_inceput)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-foreground text-base opacity-60">—</span>
                                                    )}
                                                </TableCell>
                                            )}

                                            {/* Data Sfârșit */}
                                            {showCol('sfarsit') && (
                                                <TableCell className="whitespace-nowrap px-4 text-center">
                                                    {santier.data_sfarsit ? (
                                                        <div className="flex items-center justify-center gap-2 text-base text-foreground">
                                                            <span>{formatDate(santier.data_sfarsit)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-foreground text-base opacity-60">—</span>
                                                    )}
                                                </TableCell>
                                            )}

                                            {/* Notițe */}
                                            {showCol('notita') && (
                                                <TableCell className="px-4 text-center">
                                                    {santier?.notita ? (
                                                        <div className="flex items-center justify-center gap-2" title={santier.notita}>
                                                            <span className="text-base truncate max-w-[15rem] block cursor-text">
                                                                {santier.notita || "—"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-foreground text-base opacity-60">—</span>
                                                    )
                                                    }
                                                </TableCell>
                                            )}

                                            {/* Metadata */}
                                            {showCol('creat') && (
                                                <TableCell className=" text-sm whitespace-nowrap px-4 text-center text-foreground">
                                                    {formatDateAndTime(santier.created_at)}
                                                </TableCell>
                                            )}
                                            {showCol('actualizat') && (
                                                <TableCell className=" text-sm whitespace-nowrap px-4 text-center text-foreground">
                                                    {formatDateAndTime(santier.updated_at)}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    </ContextMenuTrigger>

                                    <ContextMenuContent>
                                        <ContextMenuItem className="gap-3" disabled={!santier.adresa} onClick={() => navigator.clipboard.writeText(santier.adresa)}>
                                            <FontAwesomeIcon icon={faMapLocationDot} /> Copiază Adresa
                                        </ContextMenuItem>
                                        <ContextMenuItem className="gap-3" disabled={!santier.latitudine || !santier.longitudine} onClick={() => navigator.clipboard.writeText(`${santier.latitudine}, ${santier.longitudine}`)}>
                                            <FontAwesomeIcon icon={faLocationDot} /> Copiază Coordonatele
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem className="gap-3 text-low hover:text-low focus:text-low" onClick={() => handleClickEdit(santier)}>
                                            <FontAwesomeIcon icon={faPenToSquare} /> Editează
                                        </ContextMenuItem>
                                        <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => handleDeleteClick({ nume: santier.nume, id: santier.id })}>
                                            <FontAwesomeIcon icon={faTrash} /> Șterge
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            ))}
                        </TableBody>
                    </Table>

                </div>
            )
            }
        </>
    );
}