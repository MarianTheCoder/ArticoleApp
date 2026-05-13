import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect, memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrash, faCopy, faBoxOpen } from "@fortawesome/free-solid-svg-icons";
import { TableVirtuoso } from "react-virtuoso";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import photoAPI from "@/api/photoAPI";
import MaterialeSubList from "./MaterialeSubList"; // <-- Import corectat
import NoImage from "@/assets/no-image-icon.png"; // <-- Importați o iconiță default pentru materialele fără poză
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";

// --- VIRTUALIZATION COMPONENTS ---
const componentsMateriale = {
  Table: (props) => <table {...props} className="min-w-full table-fixed caption-bottom text-left border-collapse" />,
  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  TableRow: (props) => {
    const index = props["data-index"];
    const parent = props.context?.materiale?.[index];

    if (!parent) return <TableRow {...props} />;

    return (
      <ContextMenu key={parent.id}>
        <ContextMenuTrigger asChild>
          <TableRow
            {...props}
            className="cursor-pointer data-[state=open]:bg-muted border-b transition-colors group hover:bg-accent hover-row-border"
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

const MaterialeList = memo(({ materiale = [], visibleColumns, setDraft, setOpen, handleDeleteClick, displayLang = "RO", handleDuplicateClick }) => {
  const containerRef = useRef(null);
  const scrollPosRef = useRef(0);

  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);

  useEffect(() => {
    if (selectedParent) {
      const freshParent = materiale.find((p) => p.id === selectedParent.id);

      if (freshParent) {
        if (freshParent !== selectedParent) {
          setSelectedParent(freshParent);
        }
      } else {
        setSubDialogOpen(false);
        setSelectedParent(null);
      }
    }
  }, [materiale, selectedParent]);

  const handleScroll = (e) => {
    if (e.target) {
      scrollPosRef.current = e.target.scrollTop;
    }
  };

  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollPosRef.current;
    }
  }, [materiale]);

  const showCol = (colKey) => (visibleColumns ? visibleColumns[colKey] : true);

  const handleOpenSubs = useCallback((parent) => {
    setSelectedParent(parent);
    setSubDialogOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (e, parent) => {
      if (e.target.closest("a, button, input")) return;
      const selection = window.getSelection();
      if (selection.toString().length > 0) return;

      handleOpenSubs(parent);
    },
    [handleOpenSubs],
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
      materiale,
    };
  }, [handleRowClick, handleClickEdit, handleDeleteClick, handleDuplicateClick, materiale]);

  return (
    <>
      <div ref={containerRef} onScroll={handleScroll} className="rounded-md border bg-card w-full h-full overflow-auto relative">
        <TableVirtuoso
          totalCount={materiale.length}
          data={materiale}
          style={{ height: "100%", width: "100%" }}
          fixedHeaderContent={() => (
            <TableRow className="h-16 hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
              {showCol("poza") && <TableHead className="text-center px-4 w-[6rem] max-w-[6rem]">Poză</TableHead>}
              {showCol("limba") && <TableHead className="text-center px-4 w-[8rem] max-w-[8rem]">Limba</TableHead>}
              {showCol("variante") && <TableHead className="text-center px-4 w-[8rem] max-w-[8rem]">Variante</TableHead>}
              {showCol("cod") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Cod</TableHead>}
              {showCol("denumire") && <TableHead className="px-4 w-[22rem] max-w-[22rem]">Denumire</TableHead>}
              {showCol("descriere") && <TableHead className="px-4 min-w-[35rem]">Descriere</TableHead>}
              {showCol("unitate") && <TableHead className="text-center px-4 w-[10rem] max-w-[10rem]">Unitate</TableHead>}
              {showCol("cost") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Cost</TableHead>}
              {showCol("creat") && <TableHead className="text-left px-4 w-[14rem] max-w-[14rem]">Creat</TableHead>}
              {showCol("actualizat") && <TableHead className="text-left px-4 w-[14rem] max-w-[14rem]">Actualizat</TableHead>}
            </TableRow>
          )}
          components={componentsMateriale}
          context={context}
          itemContent={(index, parent) => {
            const afisareDenumire = displayLang === "FR" ? parent.denumire_fr || "" : parent.denumire;
            const afisareDescriere = displayLang === "FR" ? parent.descriere_fr || "" : parent.descriere;

            return (
              <>
                {/* COLOANA POZĂ NOUĂ */}
                {showCol("poza") && (
                  <TableCell onContextMenu={(e) => e.stopPropagation()} className="text-center px-4 py-2 w-[6rem] max-w-[6rem]">
                    <ImagePreviewTooltip
                      src={parent.photo_url ? `${photoAPI}/${parent.photo_url}` : null}
                      alt={parent.cod_definitie}
                      ringColor="hover:ring-amber-600"
                      fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                      containerClassName="h-20 w-20 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                    />
                  </TableCell>
                )}

                {showCol("limba") && (
                  <TableCell className="text-center px-4 py-2 min-w-[8rem] w-[8rem] max-w-[8rem]">
                    <div className="flex justify-center">
                      <div className={`rounded-md border ${parent.limba !== "FR" ? "bg-cyan-500/5 border-cyan-500" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
                        <span className={`text-base w-12 py-2 font-bold ${parent.limba !== "FR" ? "text-cyan-600 " : "text-lime-600"}`}>{parent.limba}</span>
                      </div>
                    </div>
                  </TableCell>
                )}

                {showCol("variante") && (
                  <TableCell className="text-center px-4 py-2 min-w-[8rem] w-[8rem] max-w-[8rem]">
                    <Badge
                      variant="outline"
                      className={`text-base px-4 py-2 shadow-none whitespace-nowrap ${parent.subcategorii.length > 0 ? (parent.limba !== "FR" ? "text-cyan-600 border-cyan-500" : "text-lime-600 border-lime-500") : "text-muted-foreground "}`}
                    >
                      {parent.subcategorii.length}
                    </Badge>
                  </TableCell>
                )}

                {showCol("cod") && (
                  <TableCell className="text-center px-4 py-2 min-w-[12rem] w-[12rem] max-w-[12rem] whitespace-nowrap">
                    <span className="text-base font-bold text-foreground">{parent.cod_definitie}</span>
                  </TableCell>
                )}

                {showCol("denumire") && (
                  <TableCell className="px-4 py-2 min-w-[22rem] w-[22rem] max-w-[22rem]">
                    {afisareDenumire ? (
                      <OverflowTooltip text={afisareDenumire} className="text-base whitespace-pre-wrap text-foreground leading-normal" maxLines={2} />
                    ) : (
                      <span className="text-base text-muted-foreground/40 italic">—</span>
                    )}
                  </TableCell>
                )}

                {showCol("descriere") && (
                  <TableCell className="px-4 py-2 min-w-[35rem]">
                    <div className="w-full">
                      {afisareDescriere ? (
                        <OverflowTooltip text={afisareDescriere} className="text-base whitespace-pre-wrap text-foreground leading-normal" maxLines={2} />
                      ) : (
                        <span className="text-base text-muted-foreground/40 italic">—</span>
                      )}
                    </div>
                  </TableCell>
                )}

                {showCol("unitate") && (
                  <TableCell className="text-center px-4 py-2 min-w-[10rem] w-[10rem] max-w-[10rem]">
                    <Badge variant="outline" className="text-base px-4 py-2 shadow-none whitespace-nowrap">
                      {parent.unitate_masura}
                    </Badge>
                  </TableCell>
                )}

                {showCol("cost") && (
                  <TableCell className="text-center px-4 py-2 min-w-[12rem] w-[12rem] max-w-[12rem]">
                    <span className="font-bold text-base text-foreground">{parseFloat(parent.cost).toFixed(3).replace(".", ",")}</span>
                  </TableCell>
                )}

                {showCol("creat") && (
                  <TableCell className="text-left px-4 py-2 min-w-[14rem] w-[14rem] max-w-[14rem]">
                    <div className="flex items-center gap-2.5 h-16 overflow-hidden">
                      <Avatar className="h-16 w-16 border rounded-md border-border shrink-0">
                        <AvatarImage src={`${photoAPI}/${parent.created_by_photo_url}`} alt={parent.created_by_name} className="object-cover" />
                        <AvatarFallback className="text-sm rounded-md bg-muted font-bold">
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
                      <Avatar className="h-16 w-16 border rounded-md border-border shrink-0">
                        <AvatarImage src={`${photoAPI}/${parent.updated_by_photo_url}`} alt={parent.updated_by_name} className="object-cover" />
                        <AvatarFallback className="text-sm rounded-md bg-muted font-bold">
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

      <MaterialeSubList open={subDialogOpen} setOpen={setSubDialogOpen} parentItem={selectedParent} />
    </>
  );
});

export default MaterialeList;
