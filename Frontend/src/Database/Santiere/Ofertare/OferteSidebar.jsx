// src/components/Ofertare/SidebarOferte.jsx
import React, { useCallback, useContext, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronLeft, faChevronRight, faEllipsis, faFileInvoice, faLayerGroup, faPlus, faPenToSquare, faTrash, faClock, faCopy } from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "@/context/TokenContext";
import { useLoading } from "@/context/LoadingContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import DeleteDialog from "@/components/ui/delete-dialog";
import SpinnerElement from "@/MainElements/SpinnerElement";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useOferte, useAddOferta, useEditOferta, useDeleteOferta, useAddOfertaLucrare, useEditOfertaLucrare, useDeleteOfertaLucrare, useDuplicateOfertaLucrare } from "@/hooks/Database/useOferte";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import AskDialog from "@/components/ui/ask-dialog";

const emptyDraft = {
  id: null,
  oferta_id: null,
  nume: "",
  descriere: "",
};

const formatDate = (dateString) => {
  if (!dateString) return "—";

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
};

export default function OferteSidebar({ santierId: santierIdProp = null, selectedOfertaId = null, selectedLucrareId = null, onSelectOferta, onSelectLucrare, isCollapsed = false, onToggleCollapse }) {
  const params = useParams();
  const santierId = santierIdProp || params.idSantier || params.santierId;

  const { user } = useContext(AuthContext);
  const { show, hide } = useLoading();

  const { data, isFetching } = useOferte(santierId);

  const addOferta = useAddOferta();
  const editOferta = useEditOferta();
  const deleteOferta = useDeleteOferta();

  const addLucrare = useAddOfertaLucrare();
  const editLucrare = useEditOfertaLucrare();
  const deleteLucrare = useDeleteOfertaLucrare();

  const duplicateLucrare = useDuplicateOfertaLucrare();

  const oferte = useMemo(() => {
    return data?.oferte || [];
  }, [data]);

  const [openOfertaIds, setOpenOfertaIds] = useState(new Set());

  const [localSelectedOfertaId, setLocalSelectedOfertaId] = useState(null);
  const [localSelectedLucrareId, setLocalSelectedLucrareId] = useState(null);

  const activeOfertaId = selectedOfertaId ?? localSelectedOfertaId;
  const activeLucrareId = selectedLucrareId ?? localSelectedLucrareId;

  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [entityDialogType, setEntityDialogType] = useState("oferta");
  const [entityDialogMode, setEntityDialogMode] = useState("add");
  const [draft, setDraft] = useState(emptyDraft);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState(null);

  const selectOferta = useCallback(
    (oferta) => {
      setLocalSelectedOfertaId(oferta.id);
      setLocalSelectedLucrareId(null);
      onSelectOferta?.(oferta);
    },
    [onSelectOferta],
  );

  const selectLucrare = useCallback(
    (lucrare, oferta) => {
      setLocalSelectedOfertaId(oferta.id);
      setLocalSelectedLucrareId(lucrare.id);
      onSelectLucrare?.(lucrare, oferta);
    },
    [onSelectLucrare],
  );

  const toggleOferta = useCallback(
    (oferta) => {
      selectOferta(oferta);

      setOpenOfertaIds((prev) => {
        const next = new Set(prev);

        if (next.has(oferta.id)) {
          next.delete(oferta.id);
        } else {
          next.add(oferta.id);
        }

        return next;
      });
    },
    [selectOferta],
  );

  const openAddOferta = useCallback(() => {
    setEntityDialogType("oferta");
    setEntityDialogMode("add");
    setDraft(emptyDraft);
    setEntityDialogOpen(true);
  }, []);

  const openEditOferta = useCallback((oferta) => {
    setEntityDialogType("oferta");
    setEntityDialogMode("edit");
    setDraft({
      id: oferta.id,
      oferta_id: null,
      nume: oferta.nume || "",
      descriere: oferta.descriere || "",
    });
    setEntityDialogOpen(true);
  }, []);

  const openAddLucrare = useCallback((oferta) => {
    setEntityDialogType("lucrare");
    setEntityDialogMode("add");
    setDraft({
      ...emptyDraft,
      oferta_id: oferta.id,
    });
    setEntityDialogOpen(true);
  }, []);

  const openEditLucrare = useCallback((lucrare) => {
    setEntityDialogType("lucrare");
    setEntityDialogMode("edit");
    setDraft({
      id: lucrare.id,
      oferta_id: lucrare.oferta_id,
      nume: lucrare.nume || "",
      descriere: lucrare.descriere || "",
    });
    setEntityDialogOpen(true);
  }, []);

  const openDelete = useCallback((type, item) => {
    setDeleteTarget({ type, item });
    setDeleteDialogOpen(true);
  }, []);

  const openDuplicateLucrare = useCallback((lucrare, oferta) => {
    setDuplicateTarget({
      lucrare,
      oferta,
    });
    setDuplicateDialogOpen(true);
  }, []);

  const closeDuplicateDialog = useCallback(() => {
    setDuplicateDialogOpen(false);
    setDuplicateTarget(null);
  }, []);

  const setDuplicateDialogOpenSafe = useCallback((open) => {
    setDuplicateDialogOpen(open);

    if (!open) {
      setDuplicateTarget(null);
    }
  }, []);

  const handleConfirmDuplicateLucrare = async () => {
    const lucrare = duplicateTarget?.lucrare;
    const oferta = duplicateTarget?.oferta;

    if (!lucrare?.id) return;

    show();

    try {
      const duplicated = await duplicateLucrare.mutateAsync({
        id: lucrare.id,
        nume: `${lucrare.nume || "Lucrare"} - copie`,
      });

      toast.success("Lucrarea a fost dublată complet.");
      closeDuplicateDialog();
    } catch (err) {
      toast.error(err?.response?.data?.message || "A apărut o eroare la dublarea lucrării.");
    } finally {
      hide();
    }
  };

  const closeEntityDialog = useCallback(() => {
    setEntityDialogOpen(false);
    setDraft(emptyDraft);
  }, []);

  const handleSubmitEntity = async (e) => {
    e.preventDefault();

    const nume = draft.nume.trim();
    const descriere = draft.descriere.trim();

    if (!nume) {
      toast.warning("Numele este obligatoriu.");
      return;
    }

    show();

    try {
      if (entityDialogType === "oferta" && entityDialogMode === "add") {
        await addOferta.mutateAsync({
          santier_id: santierId,
          nume,
          descriere,
          created_by_user_id: user?.id || null,
        });

        toast.success("Oferta a fost creată.");
      }

      if (entityDialogType === "oferta" && entityDialogMode === "edit") {
        await editOferta.mutateAsync({
          id: draft.id,
          nume,
          descriere,
          updated_by_user_id: user?.id || null,
        });

        toast.success("Oferta a fost actualizată.");
      }

      if (entityDialogType === "lucrare" && entityDialogMode === "add") {
        await addLucrare.mutateAsync({
          oferta_id: draft.oferta_id,
          nume,
          descriere,
          created_by_user_id: user?.id || null,
        });

        setOpenOfertaIds((prev) => {
          const next = new Set(prev);
          next.add(draft.oferta_id);
          return next;
        });

        toast.success("Lucrarea a fost creată.");
      }

      if (entityDialogType === "lucrare" && entityDialogMode === "edit") {
        await editLucrare.mutateAsync({
          id: draft.id,
          nume,
          descriere,
          updated_by_user_id: user?.id || null,
        });

        toast.success("Lucrarea a fost actualizată.");
      }

      closeEntityDialog();
    } catch (err) {
      toast.error(err?.response?.data?.message || "A apărut o eroare la salvare.");
    } finally {
      hide();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.item?.id) return;

    show();

    try {
      if (deleteTarget.type === "oferta") {
        await deleteOferta.mutateAsync(deleteTarget.item.id);
        toast.success("Oferta a fost ștearsă.");

        if (Number(activeOfertaId) === Number(deleteTarget.item.id)) {
          setLocalSelectedOfertaId(null);
          setLocalSelectedLucrareId(null);
          onSelectOferta?.(null);
          onSelectLucrare?.(null, null);
        }
      }

      if (deleteTarget.type === "lucrare") {
        await deleteLucrare.mutateAsync(deleteTarget.item.id);
        toast.success("Lucrarea a fost ștearsă.");

        if (Number(activeLucrareId) === Number(deleteTarget.item.id)) {
          setLocalSelectedLucrareId(null);
          onSelectLucrare?.(null, null);
        }
      }

      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "A apărut o eroare la ștergere.");
    } finally {
      hide();
    }
  };

  const dialogTitle = entityDialogType === "oferta" ? (entityDialogMode === "add" ? "Adaugă ofertă" : "Editează ofertă") : entityDialogMode === "add" ? "Adaugă lucrare" : "Editează lucrare";

  const deleteTitle = deleteTarget?.type === "oferta" ? "Șterge oferta" : "Șterge lucrarea";

  const deleteDescription =
    deleteTarget?.type === "oferta"
      ? `Ești sigur că vrei să ștergi oferta "${deleteTarget?.item?.nume || ""}"? Se vor șterge și lucrările asociate.`
      : `Ești sigur că vrei să ștergi lucrarea "${deleteTarget?.item?.nume || ""}"?`;

  return (
    <div className="h-full w-full rounded-l-lg flex border flex-col bg-card overflow-hidden text-sm">
      <div className="h-14 shrink-0 border-b border-border overflow-hidden">
        <div className="h-full w-full px-2.5 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground flex items-center gap-1 min-w-0">
                <FontAwesomeIcon icon={faFileInvoice} className="text-primary shrink-0" />
                <span className="truncate">Oferte</span>
              </h3>
            </div>
          </div>
          <Button size="sm" className="h-7 px-2 gap-1.5 shrink-0 text-sm" onClick={openAddOferta}>
            <FontAwesomeIcon icon={faPlus} />
            Ofertă
          </Button>
        </div>
      </div>

      <div className={cn("flex-1 overflow-y-auto transition-opacity duration-150", isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100")}>
        {isFetching ? (
          <div className="h-full flex relative flex-col items-center justify-center text-muted-foreground gap-2 p-3 text-center">
            <SpinnerElement text={2} />
          </div>
        ) : oferte.length === 0 ? (
          <div className="h-full flex relative flex-col items-center justify-center text-muted-foreground gap-2 p-3 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <FontAwesomeIcon icon={faFileInvoice} className="text-lg opacity-60" />
            </div>
            <p className="text-sm font-medium">Nu există oferte încă...</p>
          </div>
        ) : (
          <div>
            {oferte.map((oferta) => {
              const isOpen = openOfertaIds.has(oferta.id);
              const isSelected = Number(activeOfertaId) === Number(oferta.id);
              const lucrari = oferta.lucrari || oferta.sections || oferta.oferte_lucrari || [];

              return (
                <div key={oferta.id} className="border-b border-border/60">
                  <div
                    className={cn(
                      "px-2 py-2 flex items-start gap-2 cursor-pointer transition-colors border-l-4",
                      isSelected ? "border-l-primary bg-card " : "border-l-muted-foreground hover:bg-accent/50",
                    )}
                    onClick={() => toggleOferta(oferta)}
                  >
                    <button type="button" className="pt-0.5 shrink-0">
                      <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} className="text-muted-foreground text-sm" />
                    </button>

                    <div className="min-w-0 flex flex-col gap-0.5 flex-1">
                      <OverflowTooltip
                        text={oferta.nume}
                        align="left"
                        textSize="sm"
                        className="text-sm font-semibold text-foreground text-left justify-left first-letter:uppercase leading-tight whitespace-pre-wrap"
                        maxLines={1}
                      />

                      {oferta.descriere ? (
                        <OverflowTooltip
                          text={oferta.descriere}
                          textSize="sm"
                          align="left"
                          className="text-sm text-left justify-left leading-tight text-muted-foreground whitespace-pre-wrap"
                          maxLines={1}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground/50 italic mt-0.5">Fără descriere</div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7 text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                          <FontAwesomeIcon icon={faEllipsis} />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-44 text-sm">
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddLucrare(oferta);
                          }}
                        >
                          <FontAwesomeIcon icon={faPlus} className="text-primary w-3.5" />
                          <span className="text-primary font-semibold">Adaugă lucrare</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditOferta(oferta);
                          }}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="text-low w-3.5" />
                          <span className="text-low font-semibold">Editează</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive cursor-pointer text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDelete("oferta", oferta);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3.5" />
                          <span className="font-semibold">Șterge</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {isOpen && (
                    <div className="bg-muted/20">
                      {lucrari.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground flex items-center justify-between gap-2">
                          <span>Nicio lucrare în oferta aceasta.</span>
                        </div>
                      ) : (
                        <div>
                          {lucrari.map((lucrare) => {
                            const isLucrareSelected = Number(activeLucrareId) === Number(lucrare.id);

                            return (
                              <div
                                key={lucrare.id}
                                onClick={() => selectLucrare(lucrare, oferta)}
                                className={cn(
                                  "flex items-start justify-between gap-2 px-3 py-2 cursor-pointer transition-all border-l-2 bg-card",
                                  isLucrareSelected ? "bg-primary/10 border-primary shadow-sm" : "hover:bg-accent/50 border-muted-foreground",
                                )}
                              >
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <div className="min-w-0 flex-1">
                                    <OverflowTooltip
                                      text={lucrare.nume}
                                      align="left"
                                      textSize="sm"
                                      className="text-sm text-left justify-left leading-tight font-semibold text-foreground whitespace-pre-wrap"
                                      maxLines={1}
                                    />
                                    {lucrare.descriere ? (
                                      <OverflowTooltip
                                        text={lucrare.descriere}
                                        align="left"
                                        textSize="sm"
                                        className="text-[11px] text-left justify-left leading-tight text-muted-foreground whitespace-pre-wrap"
                                        maxLines={1}
                                      />
                                    ) : (
                                      <div className="text-[11px] text-muted-foreground/50 italic mt-0.5">Fără descriere</div>
                                    )}
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                                      <FontAwesomeIcon icon={faEllipsis} />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent align="end" className="w-44 text-sm">
                                    <DropdownMenuItem
                                      className="gap-2 cursor-pointer text-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditLucrare(lucrare);
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faPenToSquare} className="text-low w-3.5" />
                                      <span className="text-low">Editează</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      className="gap-2 cursor-pointer text-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDuplicateLucrare(lucrare, oferta);
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faCopy} className="text-medium w-3.5" />
                                      <span className="text-medium font-semibold">Dublează</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      className="gap-2 text-destructive focus:text-destructive cursor-pointer text-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDelete("lucrare", lucrare);
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faTrash} className="w-3.5" />
                                      <span>Șterge</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

      <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmitEntity}>
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>Completează numele și descrierea.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nume">
                  Nume <span className="text-high">*</span>
                </Label>
                <Input
                  id="nume"
                  value={draft.nume}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      nume: e.target.value,
                    }))
                  }
                  placeholder={entityDialogType === "oferta" ? "Ex: Oferta inițială" : "Ex: Lucrări parter"}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descriere">Descriere</Label>
                <Textarea
                  id="descriere"
                  value={draft.descriere}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      descriere: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Descriere opțională..."
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Anulează
                </Button>
              </DialogClose>

              <Button type="submit">{entityDialogMode === "add" ? "Creează" : "Salvează"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AskDialog
        open={duplicateDialogOpen}
        setOpen={setDuplicateDialogOpenSafe}
        title="Dublează lucrarea"
        description={`Ești sigur că vrei să dublezi lucrarea "${duplicateTarget?.lucrare?.nume || ""}"?`}
        onSubmit={handleConfirmDuplicateLucrare}
        onCancel={closeDuplicateDialog}
        useCode={false}
      />
      <DeleteDialog open={deleteDialogOpen} setOpen={setDeleteDialogOpen} title={deleteTitle} description={deleteDescription} onSubmit={handleConfirmDelete} />
    </div>
  );
}
