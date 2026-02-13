import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/axiosAPI';

// --- UI COMPONENTS ---
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

// --- ICONS ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBuilding,
    faMapLocationDot,
    faPhone,
    faEnvelope,
    faSitemap,
    faGlobe,
    faLayerGroup,
    faXmark,
    faPenToSquare,
    faHelmetSafety,
    faUsers
} from '@fortawesome/free-solid-svg-icons';

// --- SUB-COMPONENTS (Reusing your lists) ---
import ContactsListByCompany from '../Contacts/ContactsListByCompany'; // Ensure path is correct
import SantiereListByCompany from '../Santiere/SantiereListByCompany'; // Ensure path is correct

// --- FETCH HOOK (Inline for this view) ---
const useFilialaDetails = (filialaId) => {
    return useQuery({
        queryKey: ['filiala', filialaId, 'detail'],
        queryFn: async () => {
            // "Single fetch" - Assuming this endpoint returns filiala info + joined company info
            // + optionally lists of contacts/santiere if your backend supports it.
            // If lists are heavy, you might want to fetch them separately in the Tabs.
            const { data } = await api.get(`/CRM/Filiale/getFiliala/${filialaId}`);
            return data;
        },
        enabled: !!filialaId,
    });
};

export default function FilialaView({
    filialaId,
    openDrawer,
    setOpenDrawer,
    onEdit
}) {
    // 1. Data Fetching
    const { data, isLoading, isError } = useFilialaDetails(filialaId);

    // Derived state
    const filiala = data?.filiala || {};
    const company = data?.companie || {}; // Assuming backend joins company info
    const contactsList = data?.contacte || []; // Assuming backend returns these, or fetch separately
    const santiereList = data?.santiere || [];

    // 2. Helpers
    const getDecisionBadge = (level) => {
        switch (level) {
            case 'National': return "bg-purple-100 text-purple-700 border-purple-200";
            case 'Regional': return "bg-blue-100 text-blue-700 border-blue-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const LoadingView = () => (
        <div className="h-full w-full grid grid-cols-[350px_1fr] gap-6 p-6">
            <div className="space-y-6">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <Separator />
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        </div>
    );

    return (
        <Sheet open={openDrawer} onOpenChange={setOpenDrawer}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[90vw] md:max-w-[85vw] p-0 overflow-hidden bg-background"
            >
                {isLoading ? <LoadingView /> : isError ? (
                    <div className="flex items-center justify-center h-full text-destructive">
                        Eroare la încărcarea datelor filialei.
                    </div>
                ) : (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-[22rem_1fr] overflow-hidden">

                        {/* --- LEFT SIDEBAR (Filiala Info) --- */}
                        <aside className="bg-muted/10 border-r h-full flex flex-col overflow-hidden">
                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-6">

                                    {/* Header */}
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl border border-primary/20 shadow-sm">
                                                <FontAwesomeIcon icon={faBuilding} />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => onEdit?.(filiala)}>
                                                    <FontAwesomeIcon icon={faPenToSquare} className="text-muted-foreground" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setOpenDrawer(false)}>
                                                    <FontAwesomeIcon icon={faXmark} className="text-muted-foreground" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div>
                                            <h2 className="text-2xl font-bold text-foreground leading-tight">
                                                {filiala.nume_filiala}
                                            </h2>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge variant="outline" className="font-normal text-muted-foreground">
                                                    {filiala.tip_unitate || "Filială"}
                                                </Badge>
                                                <Badge className={`font-normal shadow-none border px-2 ${getDecisionBadge(filiala.nivel_decizie)}`}>
                                                    {filiala.nivel_decizie}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Details Blocks */}
                                    <div className="space-y-6">

                                        {/* Company Connection */}
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <FontAwesomeIcon icon={faLayerGroup} /> Companie Mamă
                                            </h3>
                                            <div className="p-3 bg-card border rounded-lg shadow-sm">
                                                <div className="font-medium text-foreground">
                                                    {company.nume_companie || "—"}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    CUI: {company.cui || "—"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <FontAwesomeIcon icon={faMapLocationDot} /> Locație
                                            </h3>
                                            <div className="grid gap-2 text-sm">
                                                <div className="flex justify-between items-center py-1 border-b border-border/50">
                                                    <span className="text-muted-foreground">Țară</span>
                                                    <span className="font-medium flex items-center gap-1">
                                                        <FontAwesomeIcon icon={faGlobe} className="text-muted-foreground text-xs" />
                                                        {filiala.tara}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 border-b border-border/50">
                                                    <span className="text-muted-foreground">Regiune</span>
                                                    <span className="font-medium">{filiala.regiune || "—"}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-muted-foreground">Oraș</span>
                                                    <span className="font-medium">{filiala.oras || "—"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <FontAwesomeIcon icon={faPhone} /> Contact
                                            </h3>
                                            <div className="space-y-2 text-sm">
                                                {filiala.telefon && (
                                                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                                        <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                                            <FontAwesomeIcon icon={faPhone} />
                                                        </div>
                                                        <span className="font-medium">{filiala.telefon}</span>
                                                    </div>
                                                )}
                                                {filiala.email && (
                                                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                                        <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                                                            <FontAwesomeIcon icon={faEnvelope} />
                                                        </div>
                                                        <a href={`mailto:${filiala.email}`} className="font-medium hover:underline truncate">
                                                            {filiala.email}
                                                        </a>
                                                    </div>
                                                )}
                                                {!filiala.telefon && !filiala.email && (
                                                    <span className="text-muted-foreground italic text-xs">Nu există date de contact.</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {filiala.note && (
                                            <div className="p-3 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg text-sm">
                                                <div className="font-semibold text-yellow-700 dark:text-yellow-500 mb-1 text-xs">Note interne</div>
                                                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                                    {filiala.note}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>

                            {/* Sidebar Footer */}
                            <div className="p-4 border-t bg-background text-xs text-center text-muted-foreground">
                                Creat la: {new Date(filiala.created_at).toLocaleDateString("ro-RO")}
                            </div>
                        </aside>

                        {/* --- RIGHT CONTENT (Tabs) --- */}
                        <main className="flex flex-col h-full overflow-hidden bg-card">
                            <Tabs defaultValue="contacts" className="flex flex-col h-full">

                                {/* Tabs Header */}
                                <div className="px-6 py-3 border-b flex items-center justify-between bg-background">
                                    <TabsList className="bg-muted/50">
                                        <TabsTrigger value="contacts" className="gap-2">
                                            <FontAwesomeIcon icon={faUsers} />
                                            Contacte
                                            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 min-w-[1.25rem]">{contactsList.length}</Badge>
                                        </TabsTrigger>
                                        <TabsTrigger value="santiere" className="gap-2">
                                            <FontAwesomeIcon icon={faHelmetSafety} />
                                            Șantiere
                                            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 min-w-[1.25rem]">{santiereList.length}</Badge>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Tabs Body */}
                                <div className="flex-1 bg-muted/5 p-4 overflow-hidden relative">

                                    <TabsContent value="contacts" className="h-full m-0 data-[state=active]:flex flex-col">
                                        <div className="h-full overflow-hidden rounded-md border bg-background shadow-sm">
                                            {/* Reuse existing component, passing specific list */}
                                            <ContactsListByCompany
                                                contacts={contactsList}
                                                visibleColumns={{ nume: true, functie: true, email: true, telefon: true }} // Customize columns
                                                isCardView={true} // Force card view or pass prop
                                                // You might need to mock or pass dummy handlers if you don't want full interactivity here yet
                                                handleDeleteClick={() => { }}
                                                setDraft={() => { }}
                                                setOpen={() => { }}
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="santiere" className="h-full m-0 data-[state=active]:flex flex-col">
                                        <div className="h-full overflow-hidden rounded-md border bg-background shadow-sm">
                                            {/* Reuse existing component, passing specific list */}
                                            <SantiereListByCompany
                                                santiere={santiereList}
                                                visibleColumns={{ nume: true, status: true, adresa: true }}
                                                isCardView={true}
                                                handleDeleteClick={() => { }}
                                                setDraft={() => { }}
                                                setOpen={() => { }}
                                            />
                                        </div>
                                    </TabsContent>

                                </div>
                            </Tabs>
                        </main>

                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}