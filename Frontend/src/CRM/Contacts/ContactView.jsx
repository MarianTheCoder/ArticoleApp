import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
    SheetFooter
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import photoApi from "@/api/photoAPI";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPhone,
    faEnvelope,
    faBuilding,
    faMapLocationDot,
    faCrown,
    faCommentDots,
    faBullseye,
    faCalendarDays,
    faGlobe,
    faBriefcase,
    faAddressCard,
    faHistory,
    faUser
} from '@fortawesome/free-solid-svg-icons';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';

export default function ContactView({ open, setOpen }) {
    const contact = open;

    if (!contact) return null;

    // Helpers
    const safeText = (v) => (v && String(v).trim() ? String(v).trim() : "");

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return new Intl.DateTimeFormat("ro-RO", {
            dateStyle: "long", timeStyle: "short"
        }).format(d);
    };

    return (
        <Sheet open={!!open} onOpenChange={(val) => !val && setOpen(null)}>
            {/* Sheet width approx 540px (34rem) */}
            <SheetContent side="right" className="w-full sm:w-[34rem] p-0 border-l border-border bg-background flex flex-col">

                {/* Header: Left Aligned */}
                <SheetHeader className="px-5 py-4 border-b border-border bg-card flex flex-row items-center gap-3 space-y-0 shrink-0">
                    <SheetTitle className="text-lg font-bold text-foreground">Fișă Contact</SheetTitle>
                    {contact.activ ? (
                        <Badge variant="outline" className="text-sm font-medium text-low border-low bg-low/10 px-3 py-0.5">
                            Activ
                        </Badge>
                    ) : (
                        <Badge variant="destructive" className="text-sm px-3 py-0.5">Inactiv</Badge>
                    )}
                </SheetHeader>

                {/* Main Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-background p-4">
                    <div className="flex flex-col gap-3">

                        {/* 1. IDENTITY CARD */}
                        <Card className="border-border shadow-sm">
                            <CardContent className="p-4 flex flex-col items-center text-center relative">
                                <div className="h-20 w-20 mb-2 rounded-full border-4 border-muted shadow-sm relative">
                                    <Avatar className="h-full w-full">
                                        <AvatarImage src={contact.logo_url ? `${photoApi}${contact.logo_url}` : null} className="object-cover" />
                                        <AvatarFallback className="text-xl font-bold bg-muted text-foreground">
                                            {contact.prenume?.[0]}{contact.nume?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    {contact.is_responsible && (
                                        <div className="absolute -top-1 -right-1 bg-background rounded-full p-1.5 shadow-sm border border-border flex items-center justify-center" title="Responsabil Principal">
                                            <FontAwesomeIcon icon={faCrown} className="text-yellow-500 text-base" />
                                        </div>
                                    )}
                                </div>

                                <h1 className="text-xl font-bold text-foreground leading-tight mb-2">
                                    {contact.prenume} {contact.nume}
                                </h1>

                                {/* ROLE & LANGUAGE - Centered Badges */}
                                <div className="flex flex-wrap justify-center items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="text-sm font-medium px-3 py-1 bg-muted text-foreground hover:bg-muted border border-border">
                                        <FontAwesomeIcon icon={faBriefcase} className="mr-2 text-muted-foreground" />
                                        {safeText(contact.categorie_rol)}
                                    </Badge>

                                </div>

                                {/* JOB TITLE */}
                                <p className="text-base text-muted-foreground font-medium mb-6">
                                    {safeText(contact.functie)}
                                </p>

                                {/* LOCATION BADGES */}
                                <div className="flex w-full gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1  justify-center text-base font-medium p-5  text-foreground border-border gap-2 hover:bg-muted"
                                    >
                                        <FontAwesomeIcon icon={faMapLocationDot} className="text-muted-foreground" />
                                        {contact.santier_nume ? (
                                            <span>{contact.santier_nume}</span>
                                        ) : (
                                            <span className='italic text-muted-foreground'>Neasociat</span>
                                        )}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="flex-1  justify-center text-base font-medium p-5  text-foreground border-border gap-2 hover:bg-muted"
                                    >
                                        <FontAwesomeIcon icon={faBuilding} className="text-muted-foreground" />
                                        {contact.filiala_nume ? (
                                            <span>{contact.filiala_nume}</span>
                                        ) : (
                                            <span className='italic text-muted-foreground'>Neasociat</span>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. COMBINED: DETAILS & STRATEGY */}
                        <Card className="border-border shadow-sm">
                            <CardHeader className="py-3 px-5 bg-muted/10 border-b">
                                <CardTitle className="text-base font-bold uppercase text-muted-foreground flex whitespace-pre-line items-center justify-between ">
                                    <div className=' flex items-center gap-2'>
                                        <FontAwesomeIcon icon={faAddressCard} />
                                        <span>Detalii & Strategie</span>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="flex items-center gap-2 text-sm font-medium px-3 py-1 bg-muted text-foreground hover:bg-muted border border-border"
                                    >
                                        <FontAwesomeIcon icon={faGlobe} className="text-muted-foreground" />
                                        {/* safeText already returns a string, spans help alignment but aren't strictly necessary inside a flex badge unless you need specific line-height control */}
                                        <span>{safeText(contact.limba)}</span>
                                    </Badge>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-4 flex flex-col gap-4">

                                {/* SECTION A: CONTACT INFO */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3 text-base">
                                        <div className="w-5 flex justify-center text-muted-foreground">
                                            <FontAwesomeIcon icon={faEnvelope} />
                                        </div>
                                        {contact.email ? (
                                            <a href={`mailto:${contact.email}`} className="text-foreground hover:text-primary hover:underline truncate font-medium">
                                                {contact.email}
                                            </a>
                                        ) : <span className="text-muted-foreground">—</span>}
                                    </div>

                                    <div className="flex items-center gap-3 text-base">
                                        <div className="w-5 flex justify-center text-muted-foreground">
                                            <FontAwesomeIcon icon={faPhone} />
                                        </div>
                                        {contact.telefon ? (
                                            <a href={`tel:${contact.telefon}`} className="text-foreground hover:text-primary hover:underline font-medium">
                                                {contact.telefon}
                                            </a>
                                        ) : <span className="text-muted-foreground">—</span>}
                                    </div>

                                    <div className="flex items-center gap-3 text-base">
                                        <div className="w-5 flex justify-center text-muted-foreground">
                                            <FontAwesomeIcon icon={faLinkedin} />
                                        </div>
                                        {contact.linkedin_url ? (
                                            <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-foreground hover:text-primary hover:underline font-medium truncate">
                                                Vezi Profil
                                            </a>
                                        ) : <span className="text-muted-foreground">—</span>}
                                    </div>
                                </div>

                                <Separator />

                                {/* SECTION B: STATS (Decision/Influence) */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-foreground font-medium">Putere Decizie</span>
                                            <span className="font-bold">{contact.putere_decizie}/5</span>
                                        </div>
                                        <Progress value={(contact.putere_decizie / 5) * 100} className="h-1.5" />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-foreground font-medium">Nivel Influență</span>
                                            <span className="font-bold">{contact.nivel_influenta}/5</span>
                                        </div>
                                        <Progress value={(contact.nivel_influenta / 5) * 100} className="h-1.5" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-sm font-bold text-muted-foreground uppercase">Canal Preferat</span>
                                    <Badge variant="secondary" className="font-semibold text-foreground bg-muted hover:bg-muted">
                                        {safeText(contact.canal_preferat)}
                                    </Badge>
                                </div>

                            </CardContent>
                        </Card>

                        {/* 3. NOTES */}
                        <Card className="border-border shadow-sm flex-1">
                            <CardHeader className="py-3 px-5 bg-muted/10 border-b">
                                <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCommentDots} /> Notiță
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {contact.note ? (
                                    <div className="dark:bg-yellow-900/20 bg-yellow-50 p-3 rounded border border-border text-foreground text-base leading-relaxed whitespace-pre-line">
                                        {contact.note}
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground italic py-1">
                                        Nu există notiță.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 4. HISTORY / UPDATES */}
                        <Card className="border-border shadow-sm shrink-0">
                            <CardHeader className="py-3 px-5 bg-muted/10 border-b">
                                <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <FontAwesomeIcon icon={faHistory} /> Actualizări
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {/* UPDATED BY */}
                                <div className="flex gap-3 items-center">
                                    <Avatar className="h-9 w-9 border border-border">
                                        <AvatarImage src={contact.updated_by_photo_url ? `${photoApi}/${contact.updated_by_photo_url}` : null} />
                                        <AvatarFallback className="bg-muted text-sm font-medium"><FontAwesomeIcon icon={faUser} /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-muted-foreground uppercase">Ultima actualizare</span>
                                        <div className="text-base">
                                            <span className="font-semibold text-foreground">{contact.updated_by_name || "Sistem"}</span>
                                            <div className="text-muted-foreground text-sm flex items-center gap-2 mt-0.5">
                                                <FontAwesomeIcon icon={faCalendarDays} className="w-3" />
                                                {formatDate(contact.updated_at)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="opacity-40" />

                                {/* CREATED BY */}
                                <div className="flex gap-3 items-center opacity-80">
                                    <Avatar className="h-7 w-7 border border-border">
                                        <AvatarImage src={contact.created_by_photo_url ? `${photoApi}/${contact.created_by_photo_url}` : null} />
                                        <AvatarFallback className="bg-muted text-xs font-medium"><FontAwesomeIcon icon={faUser} /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-muted-foreground uppercase">Creat inițial</span>
                                        <div className="text-base">
                                            <span className="font-medium text-foreground">{contact.created_by_name || "Sistem"}</span>
                                            <span className="text-muted-foreground text-sm ml-2">
                                                {formatDate(contact.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>

                <SheetFooter className="p-4 border-t border-border bg-card shrink-0">
                    <SheetClose asChild>
                        <Button variant="outline" className="w-full sm:w-auto">Închide</Button>
                    </SheetClose>
                </SheetFooter>

            </SheetContent>
        </Sheet>
    );
}