import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPenToSquare, faTrash, faBuilding,
    faEllipsis, faUserTie,
} from '@fortawesome/free-solid-svg-icons';
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import photoAPI from '@/api/photoAPI';
import { useVirtualizer } from '@tanstack/react-virtual';

const getContrastColor = (hex) => {
    const clean = (hex?.replace('#', '') || '3b82f6');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    const toLinear = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return L > 0.179 ? '#000000' : '#ffffff';
};

function PersonRow({ label, photoUrl, name, date }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-10 w-10 border rounded-lg border-border shrink-0">
                    <AvatarImage src={`${photoAPI}/${photoUrl || ""}`} />
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground rounded-lg">
                        <FontAwesomeIcon icon={faUserTie} />
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                    <span className="text-sm font-medium text-foreground/90 truncate">{name || "Sistem"}</span>
                </div>
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">{date}</span>
        </div>
    );
}

export default function CompaniiInterneList({
    companii = [],
    setDraft,
    setOpen,
    handleDeleteClick,
}) {
    const containerRef = useRef(null);
    const scrollPosRef = useRef(0);

    const getGridCols = () => {
        const w = window.innerWidth;
        if (w >= 1800) return 5;
        if (w >= 1536) return 4;
        if (w >= 1280) return 3;
        if (w >= 1024) return 2;
        if (w >= 640) return 1;
        return 1;
    };

    const [gridCols, setGridCols] = useState(getGridCols);

    useEffect(() => {
        const onResize = () => setGridCols(getGridCols());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const gridRowCount = Math.ceil(companii.length / gridCols);

    const rowVirtualizer = useVirtualizer({
        count: gridRowCount,
        getScrollElement: () => containerRef.current,
        estimateSize: () => 240,
        overscan: 10,
    });

    const handleScroll = (e) => {
        if (e.target) scrollPosRef.current = e.target.scrollTop;
    };

    useLayoutEffect(() => {
        if (containerRef.current) containerRef.current.scrollTop = scrollPosRef.current;
    }, [companii]);

    const formatDateAndTime = (dateString) => {
        if (!dateString) return "—";
        return new Intl.DateTimeFormat("ro-RO", { dateStyle: "short", timeStyle: "short" }).format(new Date(dateString));
    };

    const handleClickEdit = (companie) => {
        setDraft({
            id: companie.id,
            nume: companie.nume,
            culoare_hex: companie.culoare_hex || "#3b82f6",
            logo_url: companie.logo_url || "",  // raw path, no photoAPI prefix
            logo_file: null,
            logo_preview: null,
            delete_logo: false,
        });
        setOpen(true);
    };

    return (
        <div ref={containerRef} onScroll={handleScroll} className="w-full h-full overflow-auto">
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const startIndex = virtualRow.index * gridCols;
                    const rowItems = companii.slice(startIndex, startIndex + gridCols);

                    return (
                        <div
                            key={virtualRow.key}
                            className="grid gap-4 absolute top-0 left-0 w-full p-2 grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5"
                            ref={rowVirtualizer.measureElement}
                            data-index={virtualRow.index}
                            style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                            {rowItems.map((c) => {
                                const color = c.culoare_hex || "#3b82f6";
                                const contrastText = getContrastColor(color);
                                const contrastMuted = contrastText === '#ffffff'
                                    ? 'rgba(255,255,255,0.65)'
                                    : 'rgba(0,0,0,0.7)';

                                return (
                                    <Card
                                        key={c.id}
                                        className="group flex flex-col justify-between shadow-sm border-2 border-border transition-all duration-200 bg-card hover:shadow-md overflow-hidden"
                                    >
                                        {/* ── COLORED HEADER ── */}
                                        <div
                                            className="p-4 grid grid-cols-[1fr_auto]  items-end pt-6 relative gap-4"
                                            style={{ backgroundColor: color }}
                                        >
                                            <Avatar
                                                style={{ borderColor: contrastText }}
                                                className="h-16 w-full shrink-0 rounded-lg border-2"
                                            >

                                                <AvatarImage src={`${photoAPI}/${c.logo_url}`} className="object-contain  bg-card px-2" />
                                                <AvatarFallback className="text-2xl rounded-none" style={{ color: contrastText }}>
                                                    <FontAwesomeIcon icon={faBuilding} />
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1 ">
                                                <div className="flex justify-between items-start">
                                                    <h3
                                                        className="font-bold text-lg truncate pr-2"
                                                        style={{ color: contrastText }}
                                                        title={c.nume}
                                                    >
                                                        {c.nume}
                                                    </h3>
                                                </div>
                                                <span className="text-sm uppercase" style={{ color: contrastMuted }}>
                                                    {color}
                                                </span>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 absolute top-1 right-2 hover:bg-white/20"
                                                        style={{ color: contrastText }}
                                                    >
                                                        <FontAwesomeIcon icon={faEllipsis} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleClickEdit(c)}>
                                                        <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-4 w-4" /> Editează
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => handleDeleteClick({ id: c.id, nume: c.nume })}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" /> Șterge
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* ── BODY ── */}
                                        <CardContent className="p-4 flex flex-col gap-4 bg-card">
                                            <PersonRow
                                                label="Creat de"
                                                photoUrl={c.created_by_photo_url}
                                                name={c.created_by_name}
                                                date={formatDateAndTime(c.created_at)}
                                            />
                                            <div className="border-t border-border" />
                                            <PersonRow
                                                label="Actualizat de"
                                                photoUrl={c.updated_by_photo_url}
                                                name={c.updated_by_name}
                                                date={formatDateAndTime(c.updated_at)}
                                            />
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {companii.length === 0 && (
                <div className="text-center p-10 text-muted-foreground">Nu există companii interne.</div>
            )}
        </div>
    );
}