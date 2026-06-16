// src/components/Ofertare/SidebarOferte.jsx
import React, { useCallback, useContext, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faEllipsis,
  faFileInvoice,
  faLayerGroup,
  faPlus,
  faPenToSquare,
  faTrash,
  faClock,
  faCopy,
  faCircleCheck,
  faPlay,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "@/context/TokenContext";
import { useLoading } from "@/context/LoadingContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipArrow, TooltipContent, TooltipPortal, TooltipTrigger } from "@radix-ui/react-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

import DeleteDialog from "@/components/ui/delete-dialog";
import SpinnerElement from "@/MainElements/SpinnerElement";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  useOferte,
  useAddOferta,
  useEditOferta,
  useDeleteOferta,
  useAddOfertaLucrare,
  useEditOfertaLucrare,
  useEditOfertaLucrareStatus,
  useDeleteOfertaLucrare,
  useDuplicateOfertaLucrare,
} from "@/hooks/Database/useOferte";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import AskDialog from "@/components/ui/ask-dialog";

const emptyDraft = {
  id: null,
  oferta_id: null,
  nume: "",
  descriere: "",
};

const LUCRARE_STATUS_OPTIONS = [
  {
    value: "inceput",
    label: "Început",
    icon: faPlay,
    className: "border-sky-600/50 bg-sky-600/10 text-sky-600 dark:text-sky-400",
    help: "Lucrarea este începută",
  },
  {
    value: "blocat",
    label: "Blocat",
    icon: faTriangleExclamation,
    className: "border-orange-600/50 bg-orange-600/10 text-orange-600 dark:text-orange-400",
    help: "Lucrarea este blocată",
  },
  {
    value: "terminat",
    label: "Terminat",
    icon: faCircleCheck,
    className: "border-emerald-600/50 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400",
    help: "Lucrarea este terminată",
  },
];

const LUCRARE_STATUS_META = {
  ...LUCRARE_STATUS_OPTIONS.reduce((acc, option) => {
    acc[option.value] = {
      label: option.label,
      icon: option.icon,
      className: option.className,
      help: option.help,
    };

    return acc;
  }, {}),
};

const sortByName = (items = []) => {
  return [...items].sort((a, b) => {
    const nameA = String(a?.nume || a?.name || "").trim();
    const nameB = String(b?.nume || b?.name || "").trim();

    return nameA.localeCompare(nameB, "ro", {
      sensitivity: "base",
      numeric: true,
    });
  });
};

const formatDate = (dateString) => {
  if (!dateString) return "—";

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
};

export default function OferteSidebar({
  santierId: santierIdProp = null,
  selectedOfertaId = null,
  selectedLucrareId = null,
  onSelectOferta,
  onSelectLucrare,
  isCollapsed = false,
  onToggleCollapse,
  openOfertaIds: controlledOpenOfertaIds = null,
  onOpenOfertaIdsChange,
}) {
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
  const editLucrareStatus = useEditOfertaLucrareStatus();
  const deleteLucrare = useDeleteOfertaLucrare();

  const duplicateLucrare = useDuplicateOfertaLucrare();

  const oferte = useMemo(() => {
    return sortByName(data?.oferte || []);
  }, [data]);

  const [localOpenOfertaIds, setLocalOpenOfertaIds] = useState(new Set());
  const openOfertaIds = controlledOpenOfertaIds || localOpenOfertaIds;
  const setOpenOfertaIds = useCallback(
    (updater) => {
      const nextValue = typeof updater === "function" ? updater(openOfertaIds) : updater;

      if (onOpenOfertaIdsChange) {
        onOpenOfertaIdsChange(nextValue);
        return;
      }

      setLocalOpenOfertaIds(nextValue);
    },
    [onOpenOfertaIdsChange, openOfertaIds],
  );

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

  const handleConfirmDelete = async (code) => {
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
        await deleteLucrare.mutateAsync({
          id: deleteTarget.item.id,
          santier_id: santierId,
          code, // trimite codul de confirmare pentru validare pe backend
        });
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

  const handleChangeLucrareStatus = async (lucrare, status) => {
    if (!lucrare?.id || !status || lucrare.status === status) return;

    show();

    try {
      await editLucrareStatus.mutateAsync({
        id: lucrare.id,
        santier_id: santierId,
        status,
        updated_by_user_id: user?.id || null,
      });

      toast.success("Statusul lucrării a fost actualizat.");

      if (Number(activeLucrareId) === Number(lucrare.id)) {
        onSelectLucrare?.({ ...lucrare, status }, oferte.find((oferta) => Number(oferta.id) === Number(lucrare.oferta_id)) || null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la actualizarea statusului lucrării.");
    } finally {
      hide();
    }
  };

  const dialogTitle = entityDialogType === "oferta" ? (entityDialogMode === "add" ? "Adaugă ofertă" : "Editează ofertă") : entityDialogMode === "add" ? "Adaugă lucrare" : "Editează lucrare";

  const deleteTitle = deleteTarget?.type === "oferta" ? "Șterge oferta" : "Șterge lucrarea";

  const deleteDescription =
    deleteTarget?.type === "oferta"
      ? `Ești sigur că vrei să ștergi oferta "${deleteTarget?.item?.nume || ""}"? Se vor șterge și lucrările asociate.`
      : `Ești sigur că vrei să ștergi lucrarea "${deleteTarget?.item?.nume || ""}"? Se vor șterge și rețetele din interior, elementele, variantele snapshot și pozele copiate.`;

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
              const lucrari = sortByName(oferta.lucrari || oferta.sections || oferta.oferte_lucrari || []);

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
                    <div className="">
                      {lucrari.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground flex items-center justify-between gap-2">
                          <span>Nicio lucrare în oferta aceasta.</span>
                        </div>
                      ) : (
                        <div>
                          {lucrari.map((lucrare) => {
                            const isLucrareSelected = Number(activeLucrareId) === Number(lucrare.id);
                            const statusMeta = LUCRARE_STATUS_META[lucrare.status] || LUCRARE_STATUS_META.inceput;

                            return (
                              <div
                                key={lucrare.id}
                                onClick={() => selectLucrare(lucrare, oferta)}
                                className={cn(
                                  "flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-all border-l-2 bg-card",
                                  isLucrareSelected ? "bg-primary/10 hover:bg-primary/15 border-primary shadow-sm" : "hover:bg-muted border-muted-foreground",
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

                                <div className="flex items-center gap-1">
                                  <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                      <span
                                        title={`${statusMeta.label}: ${statusMeta.help}`}
                                        className={`inline-flex h-7 w-7 cursor-help items-center justify-center rounded-full border p-0 text-sm font-black transition-colors hover:brightness-110 ${statusMeta.className}`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <FontAwesomeIcon icon={statusMeta.icon} />
                                      </span>
                                    </TooltipTrigger>

                                    <TooltipPortal>
                                      <TooltipContent className="whitespace-pre-wrap break-words xxxl:max-w-[40rem] font-normal lg:max-w-[30rem] max-w-[20rem] rounded-md text-xs xl:text-sm z-[100] bg-popover border-2 border-border text-popover-foreground shadow-md p-05 xxxl:p-1">
                                        <TooltipArrow width={15} height={10} className="fill-border" />
                                        <div className="flex flex-col gap-1">
                                          <span>{statusMeta.help}</span>
                                        </div>
                                      </TooltipContent>
                                    </TooltipPortal>
                                  </Tooltip>
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

                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="gap-2 cursor-pointer text-sm">
                                          <FontAwesomeIcon icon={faClock} className="text-pink-600 w-3.5" />
                                          <span className="text-pink-600 font-semibold">Status</span>
                                        </DropdownMenuSubTrigger>

                                        <DropdownMenuSubContent className="w-40 text-sm">
                                          {LUCRARE_STATUS_OPTIONS.map((option) => (
                                            <DropdownMenuItem
                                              key={option.value}
                                              className="gap-2 cursor-pointer text-sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleChangeLucrareStatus(lucrare, option.value);
                                              }}
                                            >
                                              <FontAwesomeIcon icon={faCheck} className={cn("w-3.5", lucrare.status === option.value ? "opacity-100" : "opacity-0")} />
                                              <span>{option.label}</span>
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>

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
      <DeleteDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title={deleteTitle}
        description={deleteDescription}
        onSubmit={handleConfirmDelete}
        useCode={deleteTarget?.type === "lucrare"}
      />
    </div>
  );
}
