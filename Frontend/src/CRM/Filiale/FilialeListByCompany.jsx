import React, { useLayoutEffect, useRef } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter
} from "@/components/ui/card";
import {
    Avatar,
    AvatarImage,
    AvatarFallback
} from "@/components/ui/avatar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPenToSquare,
    faTrash,
    faBuilding,
    faCommentDots,
    faEllipsis,
    faUserTie,
    faEnvelope,
    faSitemap,
    faGlobe,
    faMapLocationDot,
    faCity,
    faUsers,
    faHardHat,
    faLocationDot,
    faClock
} from '@fortawesome/free-solid-svg-icons';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import photoAPI from '@/api/photoAPI';
import { useNavigate } from 'react-router-dom';

export default function FilialeListByCompany({
    companyId = null,
    filiale = [],
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
    }, [filiale]); // Se activează când lista se schimbă (ex: după editare)

    const showCol = (colKey) => visibleColumns ? visibleColumns[colKey] : true;

    const navigate = useNavigate();

    const formatDateAndTime = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return new Intl.DateTimeFormat("ro-RO", {
            dateStyle: "short", timeStyle: "short"
        }).format(d);
    };

    const handleRowClick = (e, filiala) => {
        if (e.target.closest('a, button, input')) return;
        const selection = window.getSelection();
        if (selection.toString().length > 0) return;
        navigate(`/CRM/Filiale/View/${filiala.companie_id}/${filiala.id}`);
    };

    const handleClickEdit = (filiala) => {
        setDraft({
            id: filiala.id,
            companie_id: filiala.companie_id,
            nume_filiala: filiala.nume_filiala,
            tip_unitate: filiala.tip_unitate,
            tara: filiala.tara,
            regiune: filiala.regiune || "",
            oras: filiala.oras || "",
            nivel_decizie: filiala.nivel_decizie,
            latitudine: filiala.latitudine || "",
            longitudine: filiala.longitudine || "",
            telefon: filiala.telefon || "",
            email: filiala.email || "",
            note: filiala.note || ""
        });
        setOpen(true);
    };

    const getDecisionBadge = (level) => {
        switch (level) {
            case 'National': return "bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200";
            case 'Regional': return "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200";
            default: return "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200";
        }
    };

    // --- CARD VIEW ---
    if (isCardView) {
        return (
            <div
                ref={containerRef}       // 1. Ref container
                onScroll={handleScroll}  // 2. Ascultă scroll
                className="w-full h-full overflow-auto p-2"
            >
                <div className={`grid grid-cols-1  gap-4  ${!companyId ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6" : "xl:grid-cols-4 md:grid-cols-2 lg:grid-cols-3"}`}>
                    {filiale.map((f) => (
                        <Card key={f.id} className="group flex flex-col justify-between shadow-sm border-4 border-border transition-all duration-200 bg-card hover:shadow-md">
                            <CardContent className="p-4 pb-3 flex-1">
                                <div className="flex gap-4 mb-4">
                                    <div className="h-12 w-12 shrink-0 rounded-lg border border-border bg-muted/30 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faBuilding} className="text-xl text-foreground/70" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-start">
                                            <h3
                                                className="font-bold text-base text-foreground truncate pr-1 cursor-pointer"
                                                title={f.nume_filiala}
                                            >
                                                {f.nume_filiala}
                                            </h3>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-2 text-muted-foreground">
                                                        <FontAwesomeIcon icon={faEllipsis} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleClickEdit(f)}>
                                                        <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-4 w-4" /> Editează
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick({ id: f.id, nume: f.nume_filiala })}>
                                                        <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" /> Șterge
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">{f.tip_unitate}</div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1 border-t border-border mt-2">
                                    {!companyId &&
                                        <div className="flex justify-between gap-2 text-sm mt-2">
                                            <div className="flex gap-2 items-center  text-muted-foreground">
                                                <FontAwesomeIcon icon={faCity} className="w-3.5 text-sm opacity-70" />
                                                <span>Companie</span>
                                            </div>
                                            <Button
                                                size="sm" variant="outline"
                                                onClick={() => navigate(`/CRM/Companii/View/${f.companie_id}`)}
                                                className="text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                                            >
                                                {f.companie_nume}
                                            </Button>
                                        </div>
                                    }
                                    <div className="flex justify-between gap-2 text-sm mt-2">
                                        <div className="flex gap-2 items-center  text-muted-foreground">
                                            <FontAwesomeIcon icon={faGlobe} className="w-3.5 text-sm opacity-70" />
                                            <span>Locație</span>
                                        </div>
                                        <span className="font-medium text-foreground truncate " title={`${f.oras}, ${f.regiune}, ${f.tara}`}>
                                            {f.oras || "—"}, {f.regiune || "—"}, {f.tara || "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-2 text-sm">
                                        <div className="flex gap-2 items-center  text-muted-foreground">
                                            <FontAwesomeIcon icon={faSitemap} className="w-3.5 text-sm opacity-70" />
                                            <span>Decizie</span>
                                        </div>
                                        <Badge className={`font-normal shadow-none px-2 py-3 h-5 ${getDecisionBadge(f.nivel_decizie)}`}>
                                            {f.nivel_decizie}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between gap-2 text-sm">
                                        <div className="flex gap-2 items-center  text-muted-foreground">
                                            <FontAwesomeIcon icon={faEnvelope} className="w-3.5 text-m opacity-70" />
                                            <span>Email</span>
                                        </div>
                                        <span className="font-medium truncate " title={f.email}>{f.email || "—"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-between text-base">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FontAwesomeIcon icon={faClock} className="w-3.5 text-sm opacity-70" />
                                            <span>Actualizat</span>
                                        </div>
                                        <span className=" text-sm text-muted-foreground truncate">{formatDateAndTime(f.updated_at)}</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center border-t border-border gap-3 pt-3">
                                    <Avatar className="h-8 w-8 border border-border">
                                        <AvatarImage src={photoAPI + "/" + f.created_by_photo_url || ""} />
                                        <AvatarFallback className="text-xs bg-muted text-muted-foreground"><FontAwesomeIcon icon={faUserTie} /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Creat de</span>
                                        <span className="text-sm font-medium text-foreground/90 truncate">{f.created_by_name || "Sistem"}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 border-t border-border grid grid-cols-[1fr_auto_auto] gap-2">
                                <Button
                                    size="sm" variant="outline"
                                    className="h-9 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors"
                                    onClick={(e) => navigate(`/CRM/Filiale/View/${f.companie_id}/${f.id}`)}>
                                    Detalii
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors"
                                    onClick={(e) => handleRowClick(e, f)}
                                >
                                    <FontAwesomeIcon icon={faUsers} className="text-base" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors"
                                // onClick={(e) => handleRowClick(e, santier)}
                                >
                                    <FontAwesomeIcon icon={faHardHat} className="text-base" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
                {filiale.length === 0 && <div className="text-center p-10 text-muted-foreground">Nu există filiale.</div>}
            </div>
        );
    }

    // --- TABLE VIEW ---
    return (
        <div
            ref={containerRef}       // 1. Ref container
            onScroll={handleScroll}  // 2. Ascultă scroll
            className="rounded-md border bg-card w-full h-full overflow-auto relative"
        >
            <Table className="w-full caption-bottom text-left min-w-max">
                <TableHeader className="bg-background sticky top-0 z-20 shadow-sm">
                    <TableRow className="hover:bg-background border-b">
                        {showCol('companie') && <TableHead className="text-center px-4">Companie</TableHead>}
                        {showCol('nume') && <TableHead className="text-center pl-6 py-4">Nume Filială</TableHead>}
                        {showCol('tip') && <TableHead className="text-center px-4">Tip</TableHead>}
                        {showCol('locatie') && <TableHead className="text-center px-4">Locație</TableHead>}
                        {showCol('decizie') && <TableHead className="text-center px-4">Nivel Decizie</TableHead>}
                        {showCol('email') && <TableHead className="text-center px-4">Email</TableHead>}
                        {showCol('telefon') && <TableHead className="text-center px-4">Telefon</TableHead>}
                        {showCol('note') && <TableHead className="text-center px-4 min-w-[200px]">Note</TableHead>}
                        {showCol('creat') && <TableHead className="text-center px-4">Creat</TableHead>}
                        {showCol('actualizat') && <TableHead className="text-center px-4">Actualizat</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filiale.map((f) => (
                        <ContextMenu key={f.id}>
                            <ContextMenuTrigger asChild>
                                <TableRow
                                    className="cursor-pointer hover:bg-muted/50 data-[state=open]:bg-muted border-b transition-colors"
                                    onClick={(e) => handleRowClick(e, f)}
                                >
                                    {/* Filiala */}
                                    {showCol('companie') && (
                                        <TableCell className="whitespace-nowrap px-4 text-center">
                                            <div className="flex justify-center">
                                                {f.companie_nume ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => navigate(`/CRM/Companii/View/${f.companie_id}`)}
                                                        variant="outline"
                                                        className="h-10 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors"
                                                    >
                                                        {f.companie_nume}
                                                    </Button>
                                                ) : (
                                                    <span className="text-foreground text-base opacity-60">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                    {/* Name - LEFT aligned, No Icon */}
                                    {showCol('nume') && (
                                        <TableCell className="text-center pl-6 py-3 whitespace-nowrap">
                                            <span className="font-semibold text-foreground text-base cursor-text">
                                                {f.nume_filiala}
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* Tip - CENTER */}
                                    {showCol('tip') && (
                                        <TableCell className="text-center px-4 whitespace-nowrap">
                                            <span className="text-foreground">{f.tip_unitate}</span>
                                        </TableCell>
                                    )}

                                    {/* Locatie - CENTER */}
                                    {showCol('locatie') && (
                                        <TableCell className="text-center px-4 whitespace-nowrap">
                                            <span className="text-foreground">
                                                {f.oras ? `${f.oras}, ` : ''}{f.tara}
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* Decizie - CENTER */}
                                    {showCol('decizie') && (
                                        <TableCell className="text-center px-4 whitespace-nowrap">
                                            <div className="flex justify-center">
                                                <Badge className={`shadow-none ${getDecisionBadge(f.nivel_decizie)}`}>
                                                    {f.nivel_decizie}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Email - CENTER */}
                                    {showCol('email') && (
                                        <TableCell className="text-center px-4 whitespace-nowrap">
                                            {f.email ? (
                                                <span className="text-foreground" title={f.email}>{f.email}</span>
                                            ) : (
                                                <span className="text-muted-foreground opacity-60">—</span>
                                            )}
                                        </TableCell>
                                    )}

                                    {/* Telefon - CENTER */}
                                    {showCol('telefon') && (
                                        <TableCell className="text-center px-4 whitespace-nowrap">
                                            {f.telefon ? (
                                                <span className="text-foreground">{f.telefon}</span>
                                            ) : (
                                                <span className="text-muted-foreground opacity-60">—</span>
                                            )}
                                        </TableCell>
                                    )}

                                    {/* Note - CENTER */}
                                    {showCol('note') && (
                                        <TableCell className="text-center px-4">
                                            {f.note ? (
                                                <div className="flex items-center justify-center gap-2" title={f.note}>
                                                    <span className="truncate max-w-[15rem] block">{f.note}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground opacity-60">—</span>
                                            )}
                                        </TableCell>
                                    )}

                                    {/* Creat - CENTER */}
                                    {showCol('creat') && (
                                        <TableCell className="text-center px-4 whitespace-nowrap text-sm text-foreground">
                                            {formatDateAndTime(f.created_at)}
                                        </TableCell>
                                    )}
                                    {/* Actualizat - CENTER */}
                                    {showCol('actualizat') && (
                                        <TableCell className="text-center px-4 whitespace-nowrap text-sm text-foreground">
                                            {formatDateAndTime(f.updated_at)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem className="gap-3" disabled={!f.oras} onClick={() => navigator.clipboard.writeText(`${f.oras}, ${f.tara}`)}>
                                    <FontAwesomeIcon icon={faMapLocationDot} /> Copiază Locația
                                </ContextMenuItem>
                                <ContextMenuItem className="gap-3" disabled={!f.latitudine || !f.longitudine} onClick={() => navigator.clipboard.writeText(`${f.latitudine}, ${f.longitudine}`)}>
                                    <FontAwesomeIcon icon={faLocationDot} /> Copiază Coordonatele
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem className="gap-3 text-low hover:text-low focus:text-low" onClick={() => handleClickEdit(f)}>
                                    <FontAwesomeIcon icon={faPenToSquare} /> Editează
                                </ContextMenuItem>
                                <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => handleDeleteClick({ id: f.id, nume: f.nume_filiala })}>
                                    <FontAwesomeIcon icon={faTrash} /> Șterge
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}