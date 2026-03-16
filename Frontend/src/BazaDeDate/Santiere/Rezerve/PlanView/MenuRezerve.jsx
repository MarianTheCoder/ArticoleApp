// src/components/Rezerve/MenuRezerve.jsx
import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAddressCard,
    faLocationDot,
    faCalendar,
    faUser,
    faFilePdf,
    faFileExcel,
    faXmark,
    faFilterCircleXmark
} from "@fortawesome/free-solid-svg-icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import RezerveExportPDF from "./Exports/RezerveExportPDF";
import RezerveExportExcel from "./Exports/RezerveExportExcel";
import { useLoading } from "../../../../context/LoadingContext";

const STATUS_LABELS = {
    new: "Nou",
    in_progress: "În lucru",
    done: "Finalizat",
    blocked: "Blocat",
    cancelled: "Anulat",
    checked: "Validat",
};
const STATUS_COLORS = {
    new: "#8B5CF6",
    in_progress: "#F59E0B",
    done: "#22C55E",
    blocked: "#E11D48",
    cancelled: "#6B7280",
    checked: "#3B82F6",
};

export default function MenuRezerve({
    open,
    onClose,
    pins = [],
    filters,
    onChangeFilters,
    onSelectPin,
    planId = null,
    exportVisibleStagePNG = null,
    onJumpToPin = null,
}) {
    const [limba, setLimba] = useState("RO");
    const { hide, show } = useLoading();

    // unique dropdown data
    const assignedOptions = useMemo(() => {
        const map = new Map();
        pins.forEach((p) => {
            if (p.assigned_user_id)
                map.set(String(p.assigned_user_id), p.assigned_user_name || `#${p.assigned_user_id}`);
        });
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [pins]);

    const creators = useMemo(() => {
        const s = new Set();
        pins.forEach((p) => { if (p.user_name) s.add(p.user_name); });
        return Array.from(s);
    }, [pins]);

    // same filter as canvas
    const filteredPins = useMemo(() => {
        const f = (pins || []).filter((p) => {
            if (filters.status && p.status !== filters.status) return false;
            if (filters.assignedId && String(p.assigned_user_id || "") !== String(filters.assignedId)) return false;

            if (filters.createdBy) {
                const needle = filters.createdBy.toLowerCase();
                if (!(p.user_name || "").toLowerCase().includes(needle)) return false;
            }

            if (filters.title) {
                const needle = filters.title.toLowerCase();
                if (!(p.title || "").toLowerCase().includes(needle) &&
                    !(p.code || "").toLowerCase().includes(needle)) return false;
            }

            if (filters.reper) {
                const hay = (p.landmark || p.reper || p.reference || "").toLowerCase();
                if (!hay.includes(filters.reper.toLowerCase())) return false;
            }

            if (filters.dueUntil) {
                const due = p.due_date ? new Date(p.due_date) : null;
                const until = new Date(filters.dueUntil + "T23:59:59");
                if (due && due > until) return false;
            }
            if (filters.lastUpdated) {
                if (!p.updated_at) return false;

                const updatedDate = new Date(p.updated_at);
                if (Number.isNaN(updatedDate.getTime())) return false;

                const updatedStr = updatedDate.toISOString().slice(0, 10);
                if (updatedStr !== filters.lastUpdated) return false;
            }
            if (filters.noUntil) {
                if (!p.due_date) return false;
            }

            return true;
        });
        f.sort(
            (a, b) =>
                (new Date(b.updated_at) - new Date(a.updated_at)) || (b.id - a.id)
        );
        return f;
    }, [pins, filters]);

    const set = (patch) => onChangeFilters((prev) => ({ ...prev, ...patch }));

    const handleExportPDF = async () => {
        show();
        try {
            await RezerveExportPDF({
                planId,
                pins: filteredPins,
                exportVisibleStagePNG,
                limba: limba,
            });
        } finally {
            hide();
        }
    };

    const handleExportExcel = async () => {
        show();
        try {
            await RezerveExportExcel({
                planId: planId,
                pins: filteredPins,
                planImageDataURLfunction: exportVisibleStagePNG,
                limba: limba,
            });
        } finally {
            hide();
        }
    };


    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent
                side="right"
                className="w-[48rem] max-w-[90vw] p-0 flex flex-col"
            >
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-muted-foreground border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <SheetTitle className="text-xl font-semibold">
                                Meniu Rezerve
                            </SheetTitle>
                            <SheetDescription className="text-sm uppercase tracking-[0.2em]">
                                gestionare pin-uri
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col px-6">
                    {/* Filters */}
                    <div className="py-4">
                        <Card className="border border-muted-foreground">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
                                        Filtre
                                    </h3>
                                    <Badge className="text-base font-semibold">
                                        {filteredPins.length} rezultate
                                    </Badge>
                                </div>

                                {/* Filter Grid */}
                                <div className="grid grid-cols-1  lg:grid-cols-2 gap-4">
                                    {/* Status */}
                                    <div className="col-span-2 flex gap-3 items-end">
                                        <div className="flex-1 min-w-[200px]">
                                            <Label className="text-base font-semibold">Status</Label>
                                            <Select
                                                value={filters.status}
                                                onValueChange={(value) => set({ status: value })}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Toate" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.keys(STATUS_LABELS).map((k) => (
                                                        <SelectItem key={k} value={k}>
                                                            {STATUS_LABELS[k]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex-1">
                                            <Label className="text-base font-semibold">Ultima Actualizare</Label>
                                            <Input
                                                type="date"
                                                className="mt-1"
                                                value={filters.lastUpdated}
                                                onChange={(e) => set({ lastUpdated: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex-1">
                                            <Label className="text-base font-semibold">Până la termen</Label>
                                            <Input
                                                type="date"
                                                className="mt-1"
                                                value={filters.dueUntil}
                                                onChange={(e) => set({ dueUntil: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 mb-1">
                                            <Checkbox
                                                className="w-6 h-6"
                                                checked={!!filters.noUntil}
                                                onCheckedChange={(checked) => set({ noUntil: checked })}
                                            />
                                        </div>
                                    </div>

                                    {/* Reper */}
                                    <div>
                                        <Label className="text-base font-semibold">Reper</Label>
                                        <Input
                                            className="mt-1"
                                            value={filters.reper}
                                            onChange={(e) => set({ reper: e.target.value })}
                                            placeholder="căutare text"
                                        />
                                    </div>

                                    {/* Atribuit
                                    <div>
                                        <Label className="text-base font-semibold">Atribuit</Label>
                                        <Select
                                            value={filters.assignedId}
                                            onValueChange={(value) => set({ assignedId: value })}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Toți" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Toți</SelectItem>
                                                {assignedOptions.map((o) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div> */}

                                    {/* Titlu / Cod */}
                                    <div>
                                        <Label className="text-base font-semibold">Titlu / Cod</Label>
                                        <Input
                                            className="mt-1"
                                            value={filters.title}
                                            onChange={(e) => set({ title: e.target.value })}
                                            placeholder="căutare text"
                                        />
                                    </div>

                                    {/* Creat de */}
                                    <div >
                                        <Label className="text-base font-semibold">Creat de</Label>
                                        <Select
                                            value={filters.createdBy}
                                            onValueChange={(value) => set({ createdBy: value })}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Toți" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {creators.map((k) => (
                                                    <SelectItem key={k} value={k}>
                                                        {k}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                {/* Bottom Actions */}
                                <div className="flex gap-2 justify-between items-center">
                                    <Button
                                        variant="destructive"
                                        onClick={() =>
                                            onChangeFilters({
                                                status: "",
                                                dueUntil: "",
                                                reper: "",
                                                assignedId: "",
                                                title: "",
                                                createdBy: "",
                                                noUntil: false,
                                            })
                                        }
                                        className="gap-2"
                                    >
                                        <FontAwesomeIcon icon={faFilterCircleXmark} />
                                        Resetează filtrele
                                    </Button>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setLimba(limba === "RO" ? "FR" : "RO")}
                                        >
                                            {limba}
                                        </Button>
                                        <Button
                                            variant="default"
                                            onClick={handleExportExcel}
                                            className="gap-2"
                                        >
                                            <FontAwesomeIcon icon={faFileExcel} />
                                            Export Excel
                                        </Button>
                                        <Button
                                            variant="default"
                                            onClick={handleExportPDF}
                                            className="gap-2"
                                        >
                                            <FontAwesomeIcon icon={faFilePdf} />
                                            Export PDF
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pin List */}
                    <div className="flex-1 overflow-hidden flex flex-col pb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground text-base">
                                Pin-uri ({filteredPins.length})
                            </h3>
                            {filteredPins.length > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    Click pe un pin pentru detalii
                                </span>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="flex flex-col gap-3 pr-4">
                                {filteredPins.map((p) => {
                                    const dueText = p.due_date
                                        ? new Date(p.due_date).toLocaleDateString()
                                        : "Fără termen";
                                    const reperText = p.landmark || p.reper || p.reference || "Fără reper";
                                    const assignedName = p.assigned_user_name || "Neatribuit";

                                    return (
                                        <Card
                                            key={p.id}
                                            className="cursor-pointer transition-all hover:shadow-md border border-muted-foreground hover:border-primary"
                                            onClick={() => {
                                                if (onJumpToPin) onJumpToPin(p);
                                                onSelectPin(p);
                                            }}
                                        >
                                            <CardContent className="p-4">
                                                {/* Top row: title + status */}
                                                <div className="flex items-center justify-between gap-3 mb-3">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div
                                                            className="h-10 w-10 rounded-full text-white text-base font-bold grid place-items-center shrink-0"
                                                            style={{ backgroundColor: STATUS_COLORS[p.status] || "#3B82F6" }}
                                                        >
                                                            {p.code ?? "—"}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <h4 className="text-lg font-bold text-foreground truncate">
                                                                {p.title || `Pin ${p.code ?? "—"}`}
                                                            </h4>
                                                            <p className="text-base text-muted-foreground">
                                                                Creat de {p.user_name || "—"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <Badge
                                                        className="shrink-0 text-base font-semibold"
                                                        style={{
                                                            backgroundColor: STATUS_COLORS[p.status] || "#3B82F6",
                                                            color: "white"
                                                        }}
                                                    >
                                                        {STATUS_LABELS[p.status] || p.status}
                                                    </Badge>
                                                </div>

                                                {/* Description */}
                                                <p className="text-base text-muted-foreground mb-3">
                                                    {p.description || "Fără descriere"}
                                                </p>

                                                {/* Pills */}
                                                <div className="flex flex-col gap-2">
                                                    <div className="inline-flex">
                                                        <Badge variant="secondary" className="text-base font-medium gap-2">
                                                            <FontAwesomeIcon icon={faAddressCard} className="text-muted-foreground" />
                                                            {`Creat de ${p.user_name || "—"}`}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="secondary" className="text-base font-medium gap-2">
                                                            <FontAwesomeIcon icon={faLocationDot} className="text-muted-foreground" />
                                                            {reperText}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-base font-medium gap-2">
                                                            <FontAwesomeIcon icon={faCalendar} className="text-muted-foreground" />
                                                            {dueText}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-base font-medium gap-2">
                                                            <FontAwesomeIcon icon={faUser} className="text-muted-foreground" />
                                                            {assignedName}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}

                                {filteredPins.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Nimic de afișat cu filtrele curente.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}