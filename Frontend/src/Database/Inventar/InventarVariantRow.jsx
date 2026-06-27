import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan, faClockRotateLeft, faRightLeft } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import photoAPI from "@/api/photoAPI";
import NoImage from "@/assets/no-image-icon.png";

const formatNumber = (value, digits = 2) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(digits).replace(".", ",") : (0).toFixed(digits).replace(".", ",");
};

const getStockNumber = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return 0;
};

const getUserInitials = (name) =>
  String(name || "S")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.toLocaleDateString("ro-RO")} ${date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`;
};

const tableCellClass = "px-2 py-1 border-b text-xs xxxl:text-sm";
const tableCellCenterClass = `${tableCellClass} text-center`;
const tableCellLeftClass = `${tableCellClass} text-left`;

export default function InventarVariantRow({
  sub,
  parent,
  isVariantView,
  config,
  visibleColumns,
  displayLang,
  getColumnStyle,
  textAlignClasses,
  decimalPlaces,
  last,
  isSelected = false,
  selectedCount = 0,
  onToggleSelect,
  onContextSelect,
  onOpenTransaction,
  onOpenIstoric,
  onClearSelection,
  showExpandCell = true,
}) {
  const showCol = (key) => visibleColumns[key];
  const afisareDescriere = displayLang === "FR" ? sub.descriere_fr || sub.descriere || "" : sub.descriere || sub.descriere_fr || "";
  const furnizor = sub.furnizor_denumire || sub.detalii_extra?.furnizor || "";
  const marca = sub.marca_denumire || sub.detalii_extra?.marca || "";
  const status = sub.detalii_extra?.status_utilaj || "";
  const hasMarca = config.id === "material" || config.id === "utilaj";
  const stocTotal = getStockNumber(sub.stoc_total, sub.stocTotal);
  const stocInventar = getStockNumber(sub.stoc_inventar, sub.stocInventar, sub.stoc_total);

  const rowNode = (
    <TableRow
      className={`h-8 cursor-pointer border-b-0 ${!isVariantView ? "bg-zinc-500/35 hover:bg-zinc-500/50 dark:bg-zinc-700/80 dark:hover:bg-zinc-700/95" : "bg-card hover:bg-accent"} ${isSelected ? "!bg-primary/25 hover:!bg-primary/35 dark:!bg-primary/45 dark:hover:!bg-primary/60" : ""}`}
      onMouseDownCapture={(event) => {
        if (!event.shiftKey) return;
        event.preventDefault();
        window.getSelection?.()?.removeAllRanges?.();
      }}
      onClick={(event) => {
        if (event.target.closest("a, button, input, textarea, select")) return;
        onToggleSelect?.(parent, sub, event);
      }}
      onContextMenuCapture={() => onContextSelect?.(parent, sub)}
    >
      {showExpandCell && <TableCell style={getColumnStyle("expand")} className={`px-0 py-1 ${last ? "border-b " : ""} text-center bg-card dark:bg-card`} />}

      {config.hasPhoto && showCol("poza") && (
        <TableCell style={getColumnStyle("poza")} className={`${tableCellCenterClass} ${!isVariantView ? "border-l" : ""} border-b border-border`}>
          <ImagePreviewTooltip
            src={sub.photo_url ? `${photoAPI}/${sub.photo_url}` : null}
            alt={sub.cod_specific}
            ringColor={`hover:ring-${config.normalColor}`}
            fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
            containerClassName="h-8 w-8 xxxl:h-9 xxxl:w-9 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 mx-auto"
          />
        </TableCell>
      )}

      {showCol("limba") && (
        <TableCell style={getColumnStyle("limba")} className={tableCellCenterClass}>
          <span className="text-muted-foreground/40">—</span>
        </TableCell>
      )}

      {showCol("variante") && (
        <TableCell style={getColumnStyle("variante")} className={tableCellCenterClass}>
          <Badge variant="outline" className="h-6 px-2 text-xs xxxl:text-sm font-black shadow-none whitespace-nowrap border-primary bg-primary/10 text-primary">
            Variantă
          </Badge>
        </TableCell>
      )}

      {showCol("cod") && (
        <TableCell style={getColumnStyle("cod")} className={`${textAlignClasses.cell} ${tableCellClass} whitespace-nowrap`}>
          <span className="font-bold text-foreground">{sub.cod_specific || "—"}</span>
        </TableCell>
      )}

      {showCol("clasa1") && (
        <TableCell style={getColumnStyle("clasa1")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
          <span className="text-muted-foreground/40 italic">—</span>
        </TableCell>
      )}

      {showCol("clasa2") && (
        <TableCell style={getColumnStyle("clasa2")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
          <span className="text-muted-foreground/40 italic">—</span>
        </TableCell>
      )}

      {showCol("denumire") && (
        <TableCell style={getColumnStyle("denumire")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
          <OverflowTooltip align={textAlignClasses.tooltip} text={parent?.denumire || "Variantă"} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
        </TableCell>
      )}

      {showCol("descriere") && (
        <TableCell style={getColumnStyle("descriere")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
          {afisareDescriere ? (
            <OverflowTooltip align={textAlignClasses.tooltip} text={afisareDescriere} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
          ) : (
            <span className="text-muted-foreground/40 italic">—</span>
          )}
        </TableCell>
      )}

      {config.hasFurnizor && showCol("furnizor") && (
        <TableCell style={getColumnStyle("furnizor")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
          {furnizor ? (
            <OverflowTooltip align={textAlignClasses.tooltip} text={furnizor} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
          ) : (
            <span className="text-muted-foreground/40 italic">—</span>
          )}
        </TableCell>
      )}

      {hasMarca && showCol("marca") && (
        <TableCell style={getColumnStyle("marca")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
          {marca ? (
            <OverflowTooltip align={textAlignClasses.tooltip} text={marca} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
          ) : (
            <span className="text-muted-foreground/40 italic">—</span>
          )}
        </TableCell>
      )}

      {config.hasStatus && showCol("status") && (
        <TableCell style={getColumnStyle("status")} className={tableCellCenterClass}>
          {status ? (
            <Badge variant="outline" className="h-6 max-w-full truncate px-2 text-xs xxxl:text-sm font-black shadow-none">
              {status}
            </Badge>
          ) : (
            <span className="text-muted-foreground/40 italic">—</span>
          )}
        </TableCell>
      )}

      {showCol("greutate") && (
        <TableCell style={getColumnStyle("greutate")} className={tableCellCenterClass}>
          <span className="text-muted-foreground/40 italic">—</span>
        </TableCell>
      )}

      {showCol("unitate") && (
        <TableCell style={getColumnStyle("unitate")} className={tableCellCenterClass}>
          <Badge variant="outline" className="h-6 px-2 text-xs xxxl:text-sm shadow-none whitespace-nowrap">
            {parent?.unitate_masura || "—"}
          </Badge>
        </TableCell>
      )}

      {showCol("cost") && (
        <TableCell style={getColumnStyle("cost")} className={tableCellCenterClass}>
          <span className="font-bold text-foreground">{formatNumber(sub.cost, decimalPlaces)}</span>
        </TableCell>
      )}

      {showCol("stocInventar") && (
        <TableCell style={getColumnStyle("stocInventar")} className={tableCellCenterClass}>
          <span className="font-black text-foreground">{formatNumber(stocInventar, decimalPlaces)}</span>
        </TableCell>
      )}

      {showCol("stocTotal") && (
        <TableCell style={getColumnStyle("stocTotal")} className={tableCellCenterClass}>
          <span className="font-black text-primary">{formatNumber(stocTotal, decimalPlaces)}</span>
        </TableCell>
      )}

      {showCol("creat") && (
        <TableCell style={getColumnStyle("creat")} className={tableCellLeftClass}>
          <div className="flex items-center gap-1.5 h-8 overflow-hidden">
            <Avatar className="h-7 w-7 border rounded-md border-border shrink-0">
              <AvatarImage src={sub.created_by_photo_url ? `${photoAPI}/${sub.created_by_photo_url}` : undefined} alt={sub.created_by_name} className="object-cover" />
              <AvatarFallback className="text-xs rounded-md bg-muted font-bold">{getUserInitials(sub.created_by_name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-center min-w-0 leading-tight">
              <span className="text-xs font-bold text-foreground truncate block">{sub.created_by_name || "Sistem"}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(sub.created_at)}</span>
            </div>
          </div>
        </TableCell>
      )}

      {showCol("actualizat") && (
        <TableCell style={getColumnStyle("actualizat")} className={tableCellLeftClass}>
          <div className="flex items-center gap-1.5 h-8 overflow-hidden">
            <Avatar className="h-7 w-7 border rounded-md border-border shrink-0">
              <AvatarImage src={sub.updated_by_photo_url ? `${photoAPI}/${sub.updated_by_photo_url}` : undefined} alt={sub.updated_by_name} className="object-cover" />
              <AvatarFallback className="text-xs rounded-md bg-muted font-bold">{getUserInitials(sub.updated_by_name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-center min-w-0 leading-tight">
              <span className="text-xs font-bold text-foreground truncate block">{sub.updated_by_name || "Sistem"}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(sub.updated_at)}</span>
            </div>
          </div>
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{rowNode}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {selectedCount > 1 && (
          <>
            <div className="p-2">
              <p className="text-sm font-black uppercase tracking-wider text-foreground">Selecție multiplă</p>
              <p className="text-sm text-muted-foreground">{selectedCount} variante selectate</p>
            </div>
            <ContextMenuSeparator />
          </>
        )}

        <ContextMenuItem className="gap-3" onClick={() => onOpenTransaction?.(parent, sub)}>
          <FontAwesomeIcon icon={faRightLeft} className="text-primary" />
          Tranzacție stoc
        </ContextMenuItem>

        <ContextMenuItem className="gap-3" onClick={() => onOpenIstoric?.(parent, sub)}>
          <FontAwesomeIcon icon={faClockRotateLeft} className="text-primary" />
          Istoric mișcări
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem className="gap-3" onClick={onClearSelection}>
          <FontAwesomeIcon icon={faBan} className="text-destructive" />
          Anulează selecția
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
