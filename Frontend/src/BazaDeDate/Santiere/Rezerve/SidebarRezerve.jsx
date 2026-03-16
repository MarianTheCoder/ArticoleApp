// src/components/Rezerve/SidebarRezerve.jsx
import React, { useEffect, useMemo, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/axiosAPI";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEdit, faEllipsis, faFilePdf, faTrash, faPlus,
    faChevronDown, faChevronRight, faCube, faFileLines
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from "../../../context/TokenContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// React Query hooks
import {
    useLucrari,
    useAddLucrare,
    useAddLucrare3D,
    useEditLucrare,
    useDeleteLucrare,
    useUploadPlan,
    useEditPlan,
    useDeletePlan
} from "@/hooks/useRezerve";
import { toast } from "sonner";
import { useLoading } from "@/context/LoadingContext";
import SpinnerElement from "@/MainElements/SpinnerElement";
import DeleteDialog from "@/components/ui/delete-dialog";

export default function SidebarRezerve({ onSelectPlan, onSelectLucrare3D, selectedPlanSideBar }) {
    const { idSantier } = useParams();
    const { user } = useContext(AuthContext);
    const { show, hide, loading } = useLoading();


    // --- React Query ---
    const { data: lucrariData, isLoading: loadingLucrari, isFetching: fetchingLucrari, error: lucrariError } = useLucrari(idSantier, user.id);
    const addLucrare = useAddLucrare();
    const addLucrare3D = useAddLucrare3D();
    const editLucrare = useEditLucrare();
    const deleteLucrare = useDeleteLucrare();
    const uploadPlanAsync = useUploadPlan();
    const editPlan = useEditPlan();
    const deletePlan = useDeletePlan();

    // console.log(lucrariData)


    // Separate 3D and 2D lucrari
    const lucrari = useMemo(() => {
        if (!lucrariData?.lucrari) return [];
        const only3D = lucrariData.lucrari.filter(l => l.is_3d).sort((a, b) => a.name.localeCompare(b.name));
        const only2D = lucrariData.lucrari.filter(l => !l.is_3d).sort((a, b) => a.name.localeCompare(b.name));
        return [...only3D, ...only2D];
    }, [lucrariData]);

    // UI state
    const [openIds, setOpenIds] = useState(new Set());
    const [selectedLucrareId, setSelectedLucrareId] = useState(null);

    // Dialog states
    const [openAddLucrare, setOpenAddLucrare] = useState(false);
    const [openAddLucrare3D, setOpenAddLucrare3D] = useState(false);
    const [openEditLucrare, setOpenEditLucrare] = useState(false);
    const [openDeleteLucrare, setOpenDeleteLucrare] = useState(false);
    const [openUploadPlan, setOpenUploadPlan] = useState(false);
    const [openEditPlan, setOpenEditPlan] = useState(false);
    const [openDeletePlan, setOpenDeletePlan] = useState(false);

    // Form values
    const [newLucrare, setNewLucrare] = useState({ name: "", description: "" });
    const [newLucrare3D, setNewLucrare3D] = useState({ name: "", description: "", file: null });
    const [editingLucrare, setEditingLucrare] = useState({ id: null, name: "", description: "" }); // { id, name, description }
    const [deletingLucrareId, setDeletingLucrareId] = useState(null);
    const [uploadPlan, setUploadPlan] = useState({ title: "", scale: "1:50", dpi: 300, file: null });
    const [editingPlan, setEditingPlan] = useState(null); // { id, lucrareId, title }
    const [deletingPlan, setDeletingPlan] = useState(null); // { id, lucrareId }

    // Selected lucrare object
    const selectedLucrare = useMemo(
        () => lucrari.find(l => l.id === selectedLucrareId) || null,
        [lucrari, selectedLucrareId]
    );

    // Handlers
    const toggleOpen = async (lucrareId) => {
        const l = lucrari.find(x => x.id === lucrareId);
        if (!l) return;

        if (l.is_3d) {
            setSelectedLucrareId(lucrareId);
            setOpenIds(prev => {
                const next = new Set(prev);
                next.delete(lucrareId);
                return next;
            });
            onSelectLucrare3D?.(l);
            return;
        }

        const next = new Set(openIds);
        if (next.has(lucrareId)) {
            next.delete(lucrareId);
            setOpenIds(next);
            setSelectedLucrareId(null);
            return;
        }
        next.add(lucrareId);
        setOpenIds(next);
        setSelectedLucrareId(lucrareId);
    };

    // Helper for API URLs
    const toApiUrl = (pathLike) => {
        if (!pathLike) return "";
        try {
            return new URL(pathLike, api.defaults.baseURL).href;
        } catch {
            return pathLike;
        }
    };

    const downloadPdf = async (url, filename = "plan.pdf") => {
        try {
            const absolute = toApiUrl(url);
            const res = await fetch(absolute, { credentials: "include" });
            if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(link.href);
        } catch (e) {
            toast.error("Nu am putut descărca PDF-ul.");
        }
    };

    // Submit handlers for dialogs
    const handleAddLucrare = async (e) => {
        e.preventDefault();
        if (!newLucrare.name.trim()) {
            toast.warning("Numele lucrării este obligatoriu.");
            return;
        }
        try {
            show();
            await addLucrare.mutateAsync({
                santierId: idSantier,
                name: newLucrare.name.trim(),
                description: newLucrare.description.trim()
            });
            setNewLucrare({ name: "", description: "" });
            setOpenAddLucrare(false);
        } catch (err) {
            const msg = err?.response?.data?.message || "A apărut o eroare la adăugarea lucrării.";
            toast.error(msg);
        }
        finally {
            hide();
        }
    };

    const handleAddLucrare3D = async (e) => {
        e.preventDefault();
        if (!newLucrare3D.name.trim() || !newLucrare3D.file) {
            toast.warning("Numele și fișierul modelului 3D sunt obligatorii.");
            return;
        }
        const formData = new FormData();
        formData.append("santier_id", idSantier);
        formData.append("name", newLucrare3D.name.trim());
        if (newLucrare3D.description.trim()) formData.append("description", newLucrare3D.description.trim());
        formData.append("modelFile", newLucrare3D.file);
        try {
            show();
            await addLucrare3D.mutateAsync(formData);
            setNewLucrare3D({ name: "", description: "", file: null });
            setOpenAddLucrare3D(false);
        } catch (err) {
            const msg = err?.response?.data?.message || "A apărut o eroare la adăugarea modelului 3D.";
            toast.error(msg);
        }
        finally {
            hide();
        }
    };

    const handleEditLucrare = async (e) => {
        e.preventDefault();
        if (!editingLucrare?.name.trim()) {
            toast.warning("Numele lucrării este obligatoriu.");
            return;
        }
        try {
            show();
            await editLucrare.mutateAsync({
                id: editingLucrare.id,
                name: editingLucrare.name,
                description: editingLucrare.description
            });
            setEditingLucrare(null);
            setOpenEditLucrare(false);
        } catch (err) {
            const msg = err?.response?.data?.message || "A apărut o eroare la editarea lucrării.";
            toast.error(msg);
        }
        finally {
            hide();
        }
    };

    const handleDeleteLucrare = async () => {
        if (!deletingLucrareId) {
            toast.warning("Lucrarea selectată nu este validă.");
            return;
        }
        try {
            show();
            await deleteLucrare.mutateAsync(deletingLucrareId);
            setDeletingLucrareId(null);
            setOpenDeleteLucrare(false);
        } catch (err) {
            const msg = err?.response?.data?.message || "A apărut o eroare la ștergerea lucrării.";
            toast.error(msg);
        }
        finally {
            hide();
        }
    };

    const handleUploadPlan = async (e) => {
        e.preventDefault();
        if (!selectedLucrareId || !uploadPlan.file || !uploadPlan.title.trim()) {
            toast.warning("Selectați o lucrare, un fișier PDF și introduceți un titlu pentru încărcare.");
            return;
        }
        setOpenUploadPlan(false);
        const formData = new FormData();
        formData.append("title", uploadPlan.title || uploadPlan.file.name.replace(/\.pdf$/i, "") || "Plan");
        formData.append("scale_label", uploadPlan.scale);
        formData.append("dpi", String(uploadPlan.dpi));
        formData.append("planPdf", uploadPlan.file);
        try {
            show();
            await uploadPlanAsync.mutateAsync({
                lucrareId: selectedLucrareId,
                formData
            });

            setUploadPlan({ title: "", scale: "1:50", dpi: 300, file: null });
            setOpenUploadPlan(false);
        } catch (err) {
            console.log("Upload plan error:", err);
            const msg = err?.response?.data?.message || "A apărut o eroare la încărcarea planului.";
            toast.error(msg);
        }
        finally {
            hide();
        }
    };

    const handleEditPlan = async (e) => {
        e.preventDefault();
        if (!editingPlan?.title.trim()) {
            toast.warning("Titlul planului este obligatoriu.");
            return;
        }
        try {
            show();
            await editPlan.mutateAsync({
                id: editingPlan.id,
                name: editingPlan.title
            });
            setEditingPlan(null);
            setOpenEditPlan(false);
        } catch (err) {
            const msg = err?.response?.data?.message || "A apărut o eroare la editarea planului.";
            toast.error(msg);
        }
        finally {
            hide();
        }
    };

    const handleDeletePlan = async () => {
        if (!deletingPlan) {
            toast.warning("Planul selectat nu este valid.");
            return;
        }
        try {
            await deletePlan.mutateAsync(deletingPlan.id);;
            setDeletingPlan(null);
            setOpenDeletePlan(false);
            onSelectPlan(null); // Clear plan view if the deleted plan was selected
        } catch (err) {
            const msg = err?.response?.data?.message || "A apărut o eroare la ștergerea planului.";
            toast.error(msg);
        }
    };

    // Determine if upload is possible
    const canUploadPdf = !!selectedLucrare && !selectedLucrare.is_3d;

    return (
        <div className="h-full w-full flex border rounded-lg flex-col bg-card">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-foreground">Lucrări</h3>
                    <div className="flex items-center gap-2">
                        {/* Add 2D Dialog Trigger */}
                        <Dialog open={openAddLucrare} onOpenChange={setOpenAddLucrare}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-2 items-center">
                                    <FontAwesomeIcon icon={faPlus} />
                                    Lucrare 2D
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <form onSubmit={handleAddLucrare}>
                                    <DialogHeader>
                                        <DialogTitle>Adaugă lucrare 2D</DialogTitle>
                                        <DialogDescription>
                                            Introduceți numele lucrării și o descriere opțională.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Nume lucrare <span className="text-high">*</span></Label>
                                            <Input
                                                id="name"
                                                value={newLucrare.name}
                                                onChange={e => setNewLucrare(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="Ex: Plan parter"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="desc">Descriere</Label>
                                            <Textarea
                                                id="desc"
                                                value={newLucrare.description}
                                                onChange={e => setNewLucrare(prev => ({ ...prev, description: e.target.value }))}
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="button" variant="outline">Anulează</Button>
                                        </DialogClose>
                                        <Button type="submit" disabled={addLucrare.isPending}>
                                            {addLucrare.isPending ? "Se salvează..." : "Salvează"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Add 3D Dialog Trigger */}
                        <Dialog open={openAddLucrare3D} onOpenChange={setOpenAddLucrare3D}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-purple-500 hover:bg-purple-600 gap-2">
                                    <FontAwesomeIcon icon={faPlus} />
                                    3D
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <form onSubmit={handleAddLucrare3D}>
                                    <DialogHeader>
                                        <DialogTitle>Adaugă lucrare 3D</DialogTitle>
                                        <DialogDescription>
                                            Încărcați un model 3D (GLB).
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name3d">Nume lucrare <span className="text-high">*</span></Label>
                                            <Input
                                                id="name3d"
                                                value={newLucrare3D.name}
                                                onChange={e => setNewLucrare3D({ ...newLucrare3D, name: e.target.value })}
                                                placeholder="Ex: Model clădire"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="desc3d">Descriere</Label>
                                            <Textarea
                                                id="desc3d"
                                                value={newLucrare3D.description}
                                                onChange={e => setNewLucrare3D({ ...newLucrare3D, description: e.target.value })}
                                                rows={2}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="file3d">Fișier model <span className="text-high">*</span></Label>
                                            <Input
                                                id="file3d"
                                                type="file"
                                                accept=".glb"
                                                className="cursor-pointer"
                                                onChange={e => setNewLucrare3D({ ...newLucrare3D, file: e.target.files?.[0] || null })}
                                            />
                                            <p className="text-xs text-muted-foreground">Format recomandat: GLB</p>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="button" variant="outline">Anulează</Button>
                                        </DialogClose>
                                        <Button type="submit" className="bg-purple-500 hover:bg-purple-600" disabled={addLucrare3D.isPending}>
                                            {addLucrare3D.isPending ? "Se încarcă..." : "Salvează"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* List of lucrari */}
            <div className="flex-1 overflow-y-auto">
                {loadingLucrari ? (
                    <div className="p-4 text-sm text-muted-foreground">Se încarcă…</div>
                ) : lucrari.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Nicio lucrare încă.</div>
                ) : (
                    <div className="">
                        {lucrari.map(l => {
                            const isOpen = openIds.has(l.id);
                            const isSelected = selectedLucrareId === l.id;
                            const plans = l.plans || [];

                            return (
                                <div key={l.id}
                                    className="border-b border-muted-foreground">
                                    {/* Row */}
                                    <div
                                        className={`p-4 flex items-center gap-3  cursor-pointer  transition-colors border-l-[6px] ${isSelected ? " border-l-primary" : "hover:bg-accent/50 border-l-muted-foreground"} ${l.is_3d ? "bg-purple-50" : ""}`}
                                        onClick={() => toggleOpen(l.id)}

                                    >
                                        <button
                                            className="flex items-center  h-full gap-3 flex-1 text-left min-w-0"
                                        >
                                            {!l.is_3d && (
                                                <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} className="text-muted-foreground shrink-0 text-base" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-foreground text-base flex items-center gap-2">
                                                    <span className="truncate first-letter:uppercase">{l.name}</span>
                                                    {l.is_3d ? (<Badge variant="secondary" className="shrink-0 gap-1"><FontAwesomeIcon icon={faCube} />3D</Badge>) : null}
                                                </div>
                                                {l.description && <div className="text-sm text-muted-foreground truncate mt-1">{l.description}</div>}
                                            </div>
                                        </button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent">
                                                    <FontAwesomeIcon icon={faEllipsis} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingLucrare({ id: l.id, name: l.name, description: l.description || "" });
                                                    setOpenEditLucrare(true);
                                                }} className="gap-3 items-center cursor-pointer">
                                                    <FontAwesomeIcon icon={faEdit} className="text-low text-abse" />
                                                    <span className="text-low">Editează</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingLucrareId(l.id);
                                                    setOpenDeleteLucrare(true);
                                                }} className="gap-3 items-center text-destructive focus:text-destructive cursor-pointer">
                                                    <FontAwesomeIcon icon={faTrash} className="w-4" />
                                                    <span>Șterge</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Plans for 2D */}
                                    {!l.is_3d && isOpen && (
                                        <div className="bg-muted/20">
                                            {plans.length === 0 ? (
                                                <div className="p-3 text-xs text-muted-foreground">Niciun plan încă.</div>
                                            ) : (
                                                <div className="">
                                                    {plans.map((p, idx) => {
                                                        const count = p.unseen || 0;
                                                        return (
                                                            <div
                                                                key={p.id}
                                                            >
                                                                <div
                                                                    onClick={() => {
                                                                        setSelectedLucrareId(l.id);
                                                                        onSelectPlan?.(p);
                                                                    }}
                                                                    className={`flex items-center justify-between gap-3 px-4 py-3 bg-card cursor-pointer transition-all  border-l-2
                                                                        ${selectedPlanSideBar?.id == p.id
                                                                            ? 'bg-primary/20  border-primary shadow-sm'
                                                                            : 'hover:bg-accent/50 border-muted-foreground'
                                                                        }`}
                                                                >
                                                                    <div className="flex-1  min-w-0">
                                                                        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                                            <span className="truncate first-letter:uppercase">{p.title}</span>
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                                            <span>{p.scale_label}</span>
                                                                            <span>•</span>
                                                                            <span>{p.dpi} DPI</span>
                                                                            <span>•</span>
                                                                            <span>{p.width_px}×{p.height_px}px</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        {count > 0 && (
                                                                            <Badge variant="destructive" className="font-bold pointer-events-none">
                                                                                {count}
                                                                            </Badge>
                                                                        )}
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent">
                                                                                    <FontAwesomeIcon icon={faEllipsis} />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-48">
                                                                                <DropdownMenuItem onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    downloadPdf(p.pdf_path, `${p.title}.pdf`);
                                                                                }} className="gap-3 cursor-pointer">
                                                                                    <FontAwesomeIcon icon={faFilePdf} className="text-primary w-4" />
                                                                                    <span className="text-primary">Descarcă PDF</span>
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingPlan({ id: p.id, lucrareId: l.id, title: p.title });
                                                                                    setOpenEditPlan(true);
                                                                                }} className="gap-3 cursor-pointer">
                                                                                    <FontAwesomeIcon icon={faEdit} className="text-low w-4" />
                                                                                    <span className="text-low">Editează</span>
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setDeletingPlan({ id: p.id, lucrareId: l.id });
                                                                                    setOpenDeletePlan(true);
                                                                                }} className="gap-3 text-destructive focus:text-destructive cursor-pointer">
                                                                                    <FontAwesomeIcon icon={faTrash} className="w-4" />
                                                                                    <span>Șterge</span>
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Upload Plan section (always visible) */}
            <div className="shrink-0 border-t border-border">
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                            <FontAwesomeIcon icon={faFilePdf} className="text-blue-600 text-xl" />
                            <span>Încarcă un plan PDF</span>
                        </div>
                        <Dialog open={openUploadPlan} onOpenChange={setOpenUploadPlan}>
                            <DialogTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 text-base font-medium border-border text-foreground bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary  transition-colors"
                                    disabled={!canUploadPdf}
                                >
                                    Încarcă
                                </Button>

                            </DialogTrigger>
                            <DialogContent>
                                <form onSubmit={handleUploadPlan}>
                                    <DialogHeader>
                                        <DialogTitle>Încarcă plan PDF</DialogTitle>
                                        <DialogDescription>
                                            Selectați un fișier PDF și completați detaliile.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="title">Titlu plan <span className="text-high">*</span></Label>
                                            <Input
                                                id="title"
                                                value={uploadPlan.title}
                                                onChange={e => setUploadPlan({ ...uploadPlan, title: e.target.value })}
                                                placeholder="Ex: Plan parter"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="scale">Scară</Label>
                                                <Input
                                                    id="scale"
                                                    value={uploadPlan.scale}
                                                    onChange={e => setUploadPlan({ ...uploadPlan, scale: e.target.value })}
                                                    placeholder="1:50"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="dpi">DPI</Label>
                                                <Input
                                                    id="dpi"
                                                    type="number"
                                                    value={uploadPlan.dpi}
                                                    onChange={e => setUploadPlan({ ...uploadPlan, dpi: Number(e.target.value) })}
                                                    placeholder="300"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="file">Fișier PDF <span className="text-high">*</span></Label>
                                            <Input
                                                id="file"
                                                type="file"
                                                accept="application/pdf"
                                                className="cursor-pointer"
                                                onChange={e => setUploadPlan({ ...uploadPlan, file: e.target.files?.[0] || null })}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="button" variant="outline">Anulează</Button>
                                        </DialogClose>
                                        <Button type="submit" className="text-foreground" disabled={!uploadPlan.file}>
                                            Încarcă
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Edit Lucrare Dialog */}
            <Dialog open={openEditLucrare} onOpenChange={setOpenEditLucrare}>
                <DialogContent>
                    <form onSubmit={handleEditLucrare}>
                        <DialogHeader>
                            <DialogTitle>Editează lucrarea</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Nume lucrare <span className="text-high">*</span></Label>
                                <Input
                                    id="edit-name"
                                    value={editingLucrare?.name || ""}
                                    onChange={e => setEditingLucrare(prev => prev ? { ...prev, name: e.target.value } : null)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-desc">Descriere</Label>
                                <Textarea
                                    id="edit-desc"
                                    value={editingLucrare?.description || ""}
                                    onChange={e => setEditingLucrare(prev => prev ? { ...prev, description: e.target.value } : null)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Anulează</Button>
                            </DialogClose>
                            <Button type="submit" disabled={editLucrare.isPending}>
                                {editLucrare.isPending ? "Se salvează..." : "Salvează"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <DeleteDialog
                open={openDeleteLucrare}
                setOpen={setOpenDeleteLucrare}
                title="Șterge lucrare"
                description="Ești sigur că vrei să ștergi această lucrare? Se vor șterge și toate planurile asociate."
                onSubmit={handleDeleteLucrare}
            />

            {/* Edit Plan Dialog */}
            <Dialog open={openEditPlan} onOpenChange={setOpenEditPlan}>
                <DialogContent>
                    <form onSubmit={handleEditPlan}>
                        <DialogHeader>
                            <DialogTitle>Editează planul</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-plan-title">Titlu plan <span className="text-high">*</span></Label>
                                <Input
                                    id="edit-plan-title"
                                    value={editingPlan?.title || ""}
                                    onChange={e => setEditingPlan(prev => prev ? { ...prev, title: e.target.value } : null)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Anulează</Button>
                            </DialogClose>
                            <Button type="submit" disabled={editPlan.isPending}>
                                {editPlan.isPending ? "Se salvează..." : "Salvează"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <DeleteDialog
                open={openDeletePlan}
                setOpen={setOpenDeletePlan}
                title="Șterge planul"
                description="Ești sigur că vrei să ștergi acest plan? Acțiunea este ireversibilă."
                onSubmit={handleDeletePlan}
            />
            {fetchingLucrari && !loading && (
                <SpinnerElement text={2} />
            )}
        </div>
    );
}