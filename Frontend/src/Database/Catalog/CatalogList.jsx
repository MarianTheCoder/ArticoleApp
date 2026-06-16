import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect, memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrash, faCopy, faQuestion, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { TableVirtuoso } from "react-virtuoso";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import photoAPI from "@/api/photoAPI";
import CatalogSubList from "./CatalogSubList"; // <-- Componenta globală pentru variante
import NoImage from "@/assets/no-image-icon.png";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const getCatalogClassLevelDisplay = (item, levelNo, displayLang = "RO") => {
  const level = item?.cod_definitie_meta?.classLevels?.[Number(levelNo) - 1];
  if (!level || level.is_empty) return "";

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  return `${level.code_segment}. ${level.is_defined && denumire ? denumire : "Nedefinit"}`;
};

const getCatalogCodeTooltipParts = (item, displayLang = "RO") => {
  const meta = item?.cod_definitie_meta || {};
  const classParts = meta.levels
    .filter((level) => level && !level.is_empty && level.code_segment && String(level.code_segment) !== "00")
    .map((level, index) => {
      const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
      const isUndefined = !(level.is_defined && denumire);

      return {
        key: level.path_code || `${level.level_no || index + 1}-${level.code_segment}`,
        label: `${level.code_segment}. ${isUndefined ? "Nedefinit" : denumire}`,
        isUndefined,
      };
    });
  const specificParts = ([meta.specificSegments.join(" ")] || [meta.specific_segments.join(" ")] || []).filter(Boolean).map((segment, index) => ({ key: `specific-${index}`, label: segment }));

  return [...classParts, ...specificParts].length > 0 ? [...classParts, ...specificParts] : [{ key: "fallback", label: item?.cod_definitie || "Cod nedefinit" }];
};

const CatalogCodeValue = ({ item, displayLang }) => {
  const parts = getCatalogCodeTooltipParts(item, displayLang);

  return (
    <div className="flex min-w-0 items-center justify-center gap-1.5">
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm xxxl:text-base font-bold text-foreground">{String(item.cod_definitie)}</span>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full border border-border bg-card text-xs font-black text-foreground hover:border-foreground"
          >
            <FontAwesomeIcon icon={faQuestion} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="center"
          side="bottom"
          sideOffset={8}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="z-[100] max-w-[70rem] w-auto rounded-md border-2 border-border bg-popover p-3 text-sm text-popover-foreground shadow-md"
        >
          <div className="flex max-w-[68rem] flex-wrap items-center gap-1">
            {parts.map((part, index) => (
              <React.Fragment key={`${part.key}-${index}`}>
                <span
                  className={`inline-flex min-w-0 max-w-[22rem] rounded-md border p-1 text-xs xxxl:text-sm font-semibold ${
                    part.isUndefined ? "border-destructive/50 bg-destructive/10 text-destructive" : ""
                  }`}
                >
                  <OverflowTooltip text={part.label} align="center" className={`block max-w-full truncate ${part.isUndefined ? "text-destructive" : "text-foreground"}`} maxLines={1} textSize="sm" />
                </span>

                {index < parts.length - 1 && (
                  <span className="text-base">
                    <FontAwesomeIcon icon={faArrowRight} />
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// --- VIRTUALIZATION COMPONENTS ---
const componentsCatalog = {
  Table: (props) => <table {...props} className="min-w-full table-fixed caption-bottom text-left border-collapse" />,
  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  TableRow: (props) => {
    const index = props["data-index"];
    const parent = props.context?.catalogItems?.[index];

    if (!parent) return <TableRow {...props} />;

    return (
      <ContextMenu key={parent.id}>
        <ContextMenuTrigger asChild>
          <TableRow
            {...props}
            className={`cursor-pointer data-[state=open]:bg-muted border-b transition-colors group hover:bg-accent  ${props.context?.selectedItemId === parent.id ? "bg-primary/10 hover:bg-primary/15" : " hover-row-border"}`}
            onClick={(e) => props.context?.handleRowClick(e, parent)}
          >
            {props.children}
          </TableRow>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem className="gap-3" onClick={() => props.context?.handleClickEdit(parent)}>
            <FontAwesomeIcon className="text-low" icon={faPenToSquare} /> Editează
          </ContextMenuItem>
          <ContextMenuItem className="gap-3" onClick={() => props.context?.handleDuplicateClick(parent)}>
            <FontAwesomeIcon icon={faCopy} className="text-medium" /> Dublează
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => props.context?.handleDeleteClick(parent)}>
            <FontAwesomeIcon icon={faTrash} /> Șterge
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};

const CatalogList = memo(
  ({ selectedItemId, config, catalogItems = [], visibleColumns, setDraft, setOpen, handleDeleteClick, displayLang = "RO", handleDuplicateClick, isSelectionMode = false, onSelectElement }) => {
    const containerRef = useRef(null);
    const scrollPosRef = useRef(0);
    const selectedParentIdRef = useRef(null);

    const [subDialogOpen, setSubDialogOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState(null);

    useEffect(() => {
      if (!selectedParentIdRef.current || !subDialogOpen) return;
      // Căutăm varianta "fresh" din lista abia venită de la server
      const fresh = catalogItems.find((p) => p.id === selectedParentIdRef.current);
      // Dacă o găsim, o actualizăm (astfel încât tabelul de copii să arate noile variante)
      if (fresh) {
        setSelectedParent(fresh);
      }
    }, [catalogItems]); // only catalogItems now

    const handleScroll = (e) => {
      if (e.target) {
        scrollPosRef.current = e.target.scrollTop;
      }
    };

    useLayoutEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollPosRef.current;
      }
    }, [catalogItems]);

    const showCol = (colKey) => (visibleColumns ? visibleColumns[colKey] : true);

    const handleOpenSubs = useCallback((parent) => {
      selectedParentIdRef.current = parent.id;
      setSelectedParent(parent);
      setSubDialogOpen(true);
    }, []);

    const handleRowClick = useCallback(
      (e, parent) => {
        if (e.target.closest("a, button, input")) return;

        // Dacă suntem în modul selecție, click-ul simplu pe rând SELECTEAZĂ.
        if (isSelectionMode && onSelectElement) {
          onSelectElement(parent);
        } else {
          // În modul normal de catalog, deschide sublista.
          handleOpenSubs(parent);
        }
      },
      [handleOpenSubs, isSelectionMode, onSelectElement],
    );

    const handleClickEdit = useCallback(
      (parent) => {
        setDraft(parent);
        setOpen(true);
      },
      [setDraft, setOpen],
    );

    const context = useMemo(() => {
      return {
        handleRowClick,
        handleClickEdit,
        handleDeleteClick,
        handleDuplicateClick,
        catalogItems,
        selectedItemId,
      };
    }, [handleRowClick, handleClickEdit, handleDeleteClick, handleDuplicateClick, catalogItems, selectedItemId]);

    return (
      <>
        <div ref={containerRef} onScroll={handleScroll} className="rounded-md border bg-card w-full h-full overflow-auto relative">
          <TableVirtuoso
            overscan={5}
            totalCount={catalogItems.length}
            data={catalogItems}
            style={{ height: "100%", width: "100%" }}
            fixedHeaderContent={() => (
              <TableRow className="h-9 xxxl:h-10 hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
                {/* Afișăm Header-ul de Poză doar dacă resursa o suportă (din config) ȘI e selectată în visibleColumns */}
                {config.hasPhoto && showCol("poza") && <TableHead className="text-center px-3 xxxl:px-4 w-[5.5rem] xxxl:w-[6rem] max-w-[5.5rem] xxxl:max-w-[6rem]">Poză</TableHead>}
                {showCol("limba") && <TableHead className="text-center px-3 xxxl:px-4 w-[7rem] xxxl:w-[8rem] max-w-[7rem] xxxl:max-w-[8rem]">Limba</TableHead>}
                {showCol("variante") && <TableHead className="text-center px-3 xxxl:px-4 w-[7rem] xxxl:w-[8rem] max-w-[7rem] xxxl:max-w-[8rem]">Variante</TableHead>}
                {showCol("cod") && <TableHead className="text-center px-3 xxxl:px-4 w-[12rem] xxxl:w-[14rem] max-w-[12rem] xxxl:max-w-[14rem]">Cod</TableHead>}
                {showCol("clasa1") && <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Clasă</TableHead>}
                {showCol("clasa2") && <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Subclasă</TableHead>}
                {showCol("denumire") && <TableHead className="px-3 xxxl:px-4 w-[19rem] xxxl:w-[22rem] max-w-[19rem] xxxl:max-w-[22rem]">Denumire</TableHead>}
                {showCol("descriere") && <TableHead className="px-3 xxxl:px-4 min-w-[28rem] xxxl:min-w-[35rem]">Descriere</TableHead>}
                {showCol("unitate") && <TableHead className="text-center px-3 xxxl:px-4 w-[8rem] xxxl:w-[10rem] max-w-[8rem] xxxl:max-w-[10rem]">Unitate</TableHead>}
                {showCol("cost") && <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Cost</TableHead>}
                {showCol("creat") && <TableHead className="text-left px-3 xxxl:px-4 w-[12.5rem] xxxl:w-[14rem] max-w-[12.5rem] xxxl:max-w-[14rem]">Creat</TableHead>}
                {showCol("actualizat") && <TableHead className="text-left px-3 xxxl:px-4 w-[12.5rem] xxxl:w-[14rem] max-w-[12.5rem] xxxl:max-w-[14rem]">Actualizat</TableHead>}
              </TableRow>
            )}
            components={componentsCatalog}
            context={context}
            itemContent={(index, parent) => {
              const afisareDenumire = displayLang === "FR" ? parent.denumire_fr || "" : parent.denumire;
              const afisareDescriere = displayLang === "FR" ? parent.descriere_fr || "" : parent.descriere;

              return (
                <>
                  {/* COLOANA POZĂ NOUĂ */}
                  {config.hasPhoto && showCol("poza") && (
                    <TableCell onContextMenu={(e) => e.stopPropagation()} className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 w-[5.5rem] xxxl:w-[6rem] max-w-[5.5rem] xxxl:max-w-[6rem]">
                      <ImagePreviewTooltip
                        src={parent.photo_url ? `${photoAPI}/${parent.photo_url}` : null}
                        alt={parent.cod_definitie}
                        ringColor={`hover:ring-${config.normalColor}`} // Folosim culoarea inelului din config (ex: hover:ring-amber-600)
                        fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                        containerClassName="h-14 w-14 xxxl:h-16 xxxl:w-16 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                      />
                    </TableCell>
                  )}

                  {showCol("limba") && (
                    <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[7rem] xxxl:min-w-[8rem] w-[7rem] xxxl:w-[8rem] max-w-[7rem] xxxl:max-w-[8rem]">
                      <div className="flex justify-center">
                        <div className={`rounded-md border ${parent.limba !== "FR" ? "bg-cyan-500/5 border-cyan-500" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
                          <span className={`text-sm xxxl:text-base w-10 xxxl:w-12 py-1.5 xxxl:py-2 font-bold ${parent.limba !== "FR" ? "text-cyan-600 " : "text-lime-600"}`}>{parent.limba}</span>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {showCol("variante") && (
                    <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[7rem] xxxl:min-w-[8rem] w-[7rem] xxxl:w-[8rem] max-w-[7rem] xxxl:max-w-[8rem]">
                      <Badge
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSubs(parent); // <-- Accesăm direct funcția, fără props.context
                        }}
                        className={`text-sm xxxl:text-base px-3 xxxl:px-4 py-1.5 xxxl:py-2 shadow-none whitespace-nowrap ${isSelectionMode ? "cursor-pointer transition-all hover:scale-110" : ""}
                        ${parent.subcategorii.length > 0 ? (parent.limba !== "FR" ? "text-cyan-600 border-cyan-500" : "text-lime-600 border-lime-500") : "text-muted-foreground "}`}
                      >
                        {parent.subcategorii.length}
                      </Badge>
                    </TableCell>
                  )}

                  {showCol("cod") && (
                    <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[12rem] xxxl:min-w-[14rem] w-[12rem] xxxl:w-[14rem] max-w-[12rem] xxxl:max-w-[14rem] whitespace-nowrap">
                      <CatalogCodeValue item={parent} displayLang={displayLang} />
                    </TableCell>
                  )}

                  {showCol("clasa1") && (
                    <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[10rem] xxxl:min-w-[12rem] w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">
                      {getCatalogClassLevelDisplay(parent, 1, displayLang) ? (
                        <OverflowTooltip
                          align="center"
                          text={getCatalogClassLevelDisplay(parent, 1, displayLang)}
                          className="text-sm xxxl:text-base truncate whitespace-pre-wrap text-foreground leading-normal"
                          maxLines={1}
                        />
                      ) : (
                        <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("clasa2") && (
                    <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[10rem] xxxl:min-w-[12rem] w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">
                      {getCatalogClassLevelDisplay(parent, 2, displayLang) ? (
                        <OverflowTooltip
                          align="center"
                          text={getCatalogClassLevelDisplay(parent, 2, displayLang)}
                          className="text-sm xxxl:text-base truncate whitespace-pre-wrap text-foreground leading-normal"
                          maxLines={1}
                        />
                      ) : (
                        <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("denumire") && (
                    <TableCell className="px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[19rem] xxxl:min-w-[22rem] w-[19rem] xxxl:w-[22rem] max-w-[19rem] xxxl:max-w-[22rem]">
                      {afisareDenumire ? (
                        <OverflowTooltip align="left" text={afisareDenumire} className="text-sm xxxl:text-base truncate whitespace-pre-wrap text-foreground leading-normal" maxLines={2} />
                      ) : (
                        <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("descriere") && (
                    <TableCell className="px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[28rem] xxxl:min-w-[35rem]">
                      <div className="w-full">
                        {afisareDescriere ? (
                          <OverflowTooltip align="left" text={afisareDescriere} className="text-sm xxxl:text-base whitespace-pre-wrap text-foreground leading-normal" maxLines={2} />
                        ) : (
                          <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {showCol("unitate") && (
                    <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[8rem] xxxl:min-w-[10rem] w-[8rem] xxxl:w-[10rem] max-w-[8rem] xxxl:max-w-[10rem]">
                      <Badge variant="outline" className="text-sm xxxl:text-base px-3 xxxl:px-4 py-1.5 xxxl:py-2 shadow-none whitespace-nowrap">
                        {parent.unitate_masura}
                      </Badge>
                    </TableCell>
                  )}

                  {showCol("cost") && (
                    <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[10rem] xxxl:min-w-[12rem] w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">
                      <span className="font-bold text-sm xxxl:text-base text-foreground">{parseFloat(parent.cost).toFixed(3).replace(".", ",")}</span>
                    </TableCell>
                  )}

                  {showCol("creat") && (
                    <TableCell className="text-left px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[12.5rem] xxxl:min-w-[14rem] w-[12.5rem] xxxl:w-[14rem] max-w-[12.5rem] xxxl:max-w-[14rem]">
                      <div className="flex items-center gap-2 xxxl:gap-2.5 h-10 xxxl:h-12 overflow-hidden">
                        <Avatar className="h-9 w-9 xxxl:h-10 xxxl:w-10 border rounded-md border-border shrink-0">
                          <AvatarImage src={`${photoAPI}/${parent.created_by_photo_url}`} alt={parent.created_by_name} className="object-cover" />
                          <AvatarFallback className="text-xs xxxl:text-sm rounded-md bg-muted font-bold">
                            {parent.created_by_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col justify-center min-w-0 leading-tight">
                          <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{parent.created_by_name || "Sistem"}</span>
                          <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">
                            {new Date(parent.created_at).toLocaleDateString("ro-RO")} {new Date(parent.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {showCol("actualizat") && (
                    <TableCell className="text-left px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[12.5rem] xxxl:min-w-[14rem] w-[12.5rem] xxxl:w-[14rem] max-w-[12.5rem] xxxl:max-w-[14rem]">
                      <div className="flex items-center gap-2 xxxl:gap-2.5 h-10 xxxl:h-12 overflow-hidden">
                        <Avatar className="h-9 w-9 xxxl:h-10 xxxl:w-10 border rounded-md border-border shrink-0">
                          <AvatarImage src={`${photoAPI}/${parent.updated_by_photo_url}`} alt={parent.updated_by_name} className="object-cover" />
                          <AvatarFallback className="text-xs xxxl:text-sm rounded-md bg-muted font-bold">
                            {parent.updated_by_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col justify-center min-w-0 leading-tight">
                          <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{parent.updated_by_name || "Sistem"}</span>
                          <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">
                            {new Date(parent.updated_at).toLocaleDateString("ro-RO")} {new Date(parent.updated_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  )}
                </>
              );
            }}
          />
        </div>

        <CatalogSubList config={config} open={subDialogOpen} setOpen={setSubDialogOpen} parentItem={selectedParent} />
      </>
    );
  },
);

export default CatalogList;
