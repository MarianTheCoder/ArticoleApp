import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect, memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrash, faCopy, faScrewdriverWrench, faPerson, faTruck, faCar } from "@fortawesome/free-solid-svg-icons";
import { TableVirtuoso } from "react-virtuoso";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import photoAPI from "@/api/photoAPI";
import ReteteSubList from "./ReteteSubList"; // <-- Componenta globală pentru elementele rețetei

// --- VIRTUALIZATION COMPONENTS ---
const componentsRetete = {
  Table: (props) => <table {...props} className="min-w-full table-fixed caption-bottom text-left border-collapse" />,
  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  TableRow: (props) => {
    const index = props["data-index"];
    const parent = props.context?.reteteItems?.[index];

    if (!parent) return <TableRow {...props} />;

    return (
      <ContextMenu key={parent.id}>
        <ContextMenuTrigger asChild>
          <TableRow
            {...props}
            className={`cursor-pointer data-[state=open]:bg-muted border-b transition-colors group hover-row-border ${
              props.context?.selectedRetetaId === parent.id ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-accent"
            }`}
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

const ReteteList = memo(
  ({ reteteItems = [], visibleColumns, setDraft, setOpen, handleDeleteClick, displayLang = "RO", handleDuplicateClick, isSelectionMode = false, selectedRetetaId = null, onSelectReteta }) => {
    const containerRef = useRef(null);
    const scrollPosRef = useRef(0);
    const selectedParentIdRef = useRef(null);

    const [subDialogOpen, setSubDialogOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState(null);

    useEffect(() => {
      if (!selectedParentIdRef.current || !subDialogOpen) return;
      const fresh = reteteItems.find((p) => p.id === selectedParentIdRef.current);
      if (fresh) {
        setSelectedParent(fresh);
      }
    }, [reteteItems, subDialogOpen]);

    const handleScroll = (e) => {
      if (e.target) {
        scrollPosRef.current = e.target.scrollTop;
      }
    };

    useLayoutEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollPosRef.current;
      }
    }, [reteteItems]);

    const showCol = (colKey) => (visibleColumns ? visibleColumns[colKey] : true);

    const handleOpenSubs = useCallback((parent) => {
      selectedParentIdRef.current = parent.id;
      setSelectedParent(parent);
      setSubDialogOpen(true);
    }, []);

    const handleRowClick = useCallback(
      (e, parent) => {
        if (e.target.closest("a, button, input")) return;

        const selection = window.getSelection();
        if (selection.toString().length > 0) return;

        if (isSelectionMode && onSelectReteta) {
          onSelectReteta(parent);
          return;
        }

        handleOpenSubs(parent);
      },
      [handleOpenSubs, isSelectionMode, onSelectReteta],
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
        reteteItems,
        selectedRetetaId,
      };
    }, [handleRowClick, handleClickEdit, handleDeleteClick, handleDuplicateClick, reteteItems, selectedRetetaId]);

    return (
      <>
        <div ref={containerRef} onScroll={handleScroll} className="rounded-md border bg-card w-full h-full overflow-auto relative">
          <TableVirtuoso
            customScrollParent={containerRef.current}
            overscan={10}
            totalCount={reteteItems.length}
            data={reteteItems}
            style={{ height: "100%", width: "100%" }}
            fixedHeaderContent={() => (
              <TableRow className="h-10  hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
                {showCol("limba") && <TableHead className="text-center px-4 w-[8rem] max-w-[8rem]">Limba</TableHead>}
                {/* COLOANA NOUĂ PENTRU VARIANTE/ELEMENTE */}
                {showCol("elemente") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Elemente</TableHead>}

                {showCol("cod") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Cod</TableHead>}
                {showCol("clasa") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Clasa</TableHead>}
                {showCol("denumire") && <TableHead className="px-4 w-[22rem] max-w-[22rem]">Denumire</TableHead>}
                {showCol("descriere") && <TableHead className="px-4 min-w-[35rem]">Descriere</TableHead>}
                {showCol("unitate") && <TableHead className="text-center px-4 w-[10rem] max-w-[10rem]">Unitate</TableHead>}

                {showCol("cost") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Cost Total</TableHead>}

                {showCol("creat") && <TableHead className="text-left px-4 w-[14rem] max-w-[14rem]">Creat</TableHead>}
                {showCol("actualizat") && <TableHead className="text-left px-4 w-[14rem] max-w-[14rem]">Actualizat</TableHead>}
              </TableRow>
            )}
            components={componentsRetete}
            context={context}
            itemContent={(index, parent) => {
              const afisareDenumire = displayLang === "FR" ? parent.denumire_fr || "" : parent.denumire;
              const afisareDescriere = displayLang === "FR" ? parent.descriere_fr || "" : parent.descriere;

              // Logica de numărare a elementelor pentru coloana Variante
              const elemente = parent.elemente || [];
              const counts = { material: 0, manopera: 0, utilaj: 0, transport: 0 };
              elemente.forEach((el) => {
                if (counts[el.tip_resursa] !== undefined) counts[el.tip_resursa]++;
              });

              return (
                <>
                  {showCol("limba") && (
                    <TableCell className="text-center px-4 py-2 min-w-[8rem] w-[8rem] max-w-[8rem]">
                      <div className="flex justify-center">
                        <div className={`rounded-md border ${parent.limba !== "FR" ? "bg-cyan-500/5 border-cyan-500" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
                          <span className={`text-base w-12 py-2 font-bold ${parent.limba !== "FR" ? "text-cyan-600" : "text-lime-600"}`}>{parent.limba}</span>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* RANDARE ICONIȚE ELEMENTE INTERIOARE */}
                  {showCol("elemente") && (
                    <TableCell
                      className="text-center px-4  py-2 min-w-[12rem] w-[12rem] max-w-[12rem]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSubs(parent);
                      }}
                    >
                      <div className={`grid grid-cols-2 items-center ${isSelectionMode ? "cursor-pointer transition-all hover:scale-105" : ""}  justify-center  gap-1.5 cursor-pointer`}>
                        {counts.manopera > 0 && (
                          <div className="flex items-center justify-center gap-1.5 text-indigo-500 bg-indigo-500/10 border border-indigo-500/50 px-2 py-0.5 rounded-md" title="Manoperă">
                            <FontAwesomeIcon icon={faPerson} className="text-xs" />
                            <span className="text-sm font-bold">{counts.manopera}</span>
                          </div>
                        )}

                        {counts.material > 0 && (
                          <div className="flex items-center justify-center gap-1.5 text-amber-600 bg-amber-600/10 border border-amber-600/50 px-2 py-0.5 rounded-md" title="Materiale">
                            <FontAwesomeIcon icon={faScrewdriverWrench} className="text-xs" />
                            <span className="text-sm font-bold">{counts.material}</span>
                          </div>
                        )}

                        {counts.utilaj > 0 && (
                          <div className="flex items-center justify-center gap-1.5 text-rose-600 bg-rose-600/10 border border-rose-600/50 px-2 py-0.5 rounded-md" title="Utilaje">
                            <FontAwesomeIcon icon={faTruck} className="text-xs" />
                            <span className="text-sm font-bold">{counts.utilaj}</span>
                          </div>
                        )}

                        {counts.transport > 0 && (
                          <div className="flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-600/10 border border-emerald-600/50 px-2 py-0.5 rounded-md" title="Transport">
                            <FontAwesomeIcon icon={faCar} className="text-xs" />
                            <span className="text-sm font-bold">{counts.transport}</span>
                          </div>
                        )}

                        {elemente.length === 0 && <div className="text-xs col-span-2 text-center text-muted-foreground italic font-medium">Gol</div>}
                      </div>
                    </TableCell>
                  )}

                  {showCol("cod") && (
                    <TableCell className="text-center px-4 py-2 min-w-[12rem] w-[12rem] max-w-[12rem] whitespace-nowrap">
                      <span className="text-base font-bold text-foreground">{parent.cod_reteta}</span>
                    </TableCell>
                  )}

                  {showCol("clasa") && (
                    <TableCell className="text-center px-4 py-2 min-w-[12rem] w-[12rem] max-w-[12rem] whitespace-nowrap">
                      <Badge variant="secondary" className="text-sm bg-card border-border font-medium">
                        {parent.clasa_reteta}
                      </Badge>
                    </TableCell>
                  )}

                  {showCol("denumire") && (
                    <TableCell className="px-4 py-2 min-w-[22rem] w-[22rem] max-w-[22rem]">
                      {afisareDenumire ? (
                        <OverflowTooltip align="left" text={afisareDenumire} className="text-base whitespace-pre-wrap text-foreground leading-normal" maxLines={2} />
                      ) : (
                        <span className="text-base text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("descriere") && (
                    <TableCell className="px-4 py-2 min-w-[35rem]">
                      <div className="w-full">
                        {afisareDescriere ? (
                          <OverflowTooltip align="left" text={afisareDescriere} className="text-base whitespace-pre-wrap text-foreground leading-normal" maxLines={2} />
                        ) : (
                          <span className="text-base text-muted-foreground/40 italic">—</span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {showCol("unitate") && (
                    <TableCell className="text-center px-4 py-2 min-w-[10rem] w-[10rem] max-w-[10rem]">
                      <Badge variant="secondary" className="text-base bg-card border-border px-4 py-2 shadow-none whitespace-nowrap ">
                        {parent.unitate_masura}
                      </Badge>
                    </TableCell>
                  )}

                  {/* COSTUL TOTAL COMBINAT SCOS ÎN EVIDENȚĂ */}
                  {showCol("cost") && (
                    <TableCell className="text-center px-4 py-2 min-w-[12rem] w-[12rem] max-w-[12rem]">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-extrabold text-lg ">
                          {parseFloat(parent.cost || 0)
                            .toFixed(3)
                            .replace(".", ",")}
                        </span>
                      </div>
                    </TableCell>
                  )}

                  {showCol("creat") && (
                    <TableCell className="text-left px-4 py-2 min-w-[14rem] w-[14rem] max-w-[14rem]">
                      <div className="flex items-center gap-2.5 h-16 overflow-hidden">
                        <Avatar className="h-10 w-10 border rounded-md border-border shrink-0">
                          <AvatarImage src={`${photoAPI}/${parent.created_by_photo_url}`} alt={parent.created_by_name} className="object-cover" />
                          <AvatarFallback className="text-xs rounded-md bg-muted font-bold">
                            {parent.created_by_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col justify-center min-w-0 leading-tight">
                          <span className="text-sm font-bold text-foreground truncate block">{parent.created_by_name || "Sistem"}</span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(parent.created_at).toLocaleDateString("ro-RO")} {new Date(parent.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {showCol("actualizat") && (
                    <TableCell className="text-left px-4 py-2 min-w-[14rem] w-[14rem] max-w-[14rem]">
                      <div className="flex items-center gap-2.5 h-16 overflow-hidden">
                        <Avatar className="h-10 w-10 border rounded-md border-border shrink-0">
                          <AvatarImage src={`${photoAPI}/${parent.updated_by_photo_url}`} alt={parent.updated_by_name} className="object-cover" />
                          <AvatarFallback className="text-xs rounded-md bg-muted font-bold">
                            {parent.updated_by_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col justify-center min-w-0 leading-tight">
                          <span className="text-sm font-bold text-foreground truncate block">{parent.updated_by_name || "Sistem"}</span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">
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

        <ReteteSubList open={subDialogOpen} setOpen={setSubDialogOpen} parentItem={selectedParent} displayLang={displayLang} />
      </>
    );
  },
);

export default ReteteList;
