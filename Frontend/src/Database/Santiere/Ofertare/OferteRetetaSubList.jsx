// src/components/Ofertare/OferteRetetaSubList.jsx
import React, { memo, useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEditOfertaRetetaElementVariant } from "@/hooks/Database/useOferte";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faColumns, faDatabase, faLanguage, faExclamationCircle } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import NoImage from "@/assets/no-image-icon.png";
import photoAPI from "@/api/photoAPI";

import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import OferteElementVariantDialog from "./OferteElementVariantDialog";
import { toast } from "sonner";

const EMPTY = "—";

const formatNumber = (value) => {
  return parseFloat(value || 0)
    .toFixed(3)
    .replace(".", ",");
};

const hasVariantSelected = (el) => {
  return !!(el?.oferta_subcategorie_id || el?.cod_specific);
};

const getSelectedVariant = (el) => {
  const originalSubId = el?.original_subcategorie_id;
  if (!originalSubId) return null;

  const list = Array.isArray(el?.subcategorii) ? el.subcategorii : [];
  return list.find((sub) => Number(sub.id) === Number(originalSubId)) || null;
};

const getDefinitionCode = (el) => {
  return el?.cod_definitie || el?.definitie_cod || EMPTY;
};

const getDefinitionName = (el, displayLang) => {
  if (displayLang === "FR") {
    return el?.denumire_fr || "";
  }

  return el?.denumire || "";
};

const getDefinitionDescription = (el, displayLang) => {
  if (displayLang === "FR") {
    return el?.descriere_fr || "";
  }

  return el?.descriere || "";
};

const getDefinitionPhoto = (el) => {
  return el?.photo_url || null;
};

const getDefinitionCost = (el) => {
  return Number(el?.cost_definitie ?? el?.definitie_cost ?? el?.cost ?? el?.cost_definitie_snapshot ?? 0);
};

const getVariantCode = (el) => {
  return el?.cod_specific || el?.sub_cod_specific || EMPTY;
};

const getVariantDescription = (el, displayLang) => {
  if (displayLang === "FR") {
    return el?.descriere_specifica_fr || el?.sub_descriere_fr || "";
  }

  return el?.descriere_specifica || el?.sub_descriere || "";
};

const getVariantPhoto = (el) => {
  return el?.photo_specific_url || el?.sub_photo_url || null;
};

const getVariantCost = (el) => {
  return Number(el?.cost_subcategorie ?? el?.sub_cost ?? el?.cost_subcategorie_snapshot ?? 0);
};

const getDisplayedCode = (el) => {
  return hasVariantSelected(el) ? getVariantCode(el) : getDefinitionCode(el);
};

const getDisplayedDescription = (el, displayLang) => {
  return hasVariantSelected(el) ? getVariantDescription(el, displayLang) : getDefinitionDescription(el, displayLang);
};

const getDisplayedPhoto = (el) => {
  return hasVariantSelected(el) ? getVariantPhoto(el) : getDefinitionPhoto(el);
};

const getUnitCost = (el) => {
  return hasVariantSelected(el) ? getVariantCost(el) : getDefinitionCost(el);
};

const getElementTotal = (el) => {
  return getUnitCost(el) * Number(el?.cantitate_in_reteta || 0);
};

const getRetetaCost = (reteta) => {
  const elemente = reteta?.elemente || [];
  return elemente.reduce((sum, el) => sum + getElementTotal(el), 0);
};

const getRetetaTotalLucrare = (reteta) => {
  return getRetetaCost(reteta) * Number(reteta?.cantitate_lucrare || 0);
};

const getVisibleColumnCount = (visibleColumns) => {
  return Math.max(1, Object.values(visibleColumns).filter(Boolean).length);
};

const getReferenceCost = (el) => {
  if (hasVariantSelected(el)) {
    const selectedVariant = getSelectedVariant(el);
    return selectedVariant?.cost ?? null;
  }

  return el?.original_definitie_cost ?? el?.cost_definitie_actual ?? el?.cost_catalog ?? null;
};

const hasChangedPrice = (el) => {
  const referenceCost = getReferenceCost(el);

  if (referenceCost === null || referenceCost === undefined) return false;

  const currentCost = getUnitCost(el);

  return Math.abs(Number(currentCost) - Number(referenceCost)) > 0.0001;
};

const getDefaultQuantity = (el) => {
  const value = el?.cantitate_in_reteta_default ?? el?.cantitate_default ?? el?.reteta_element_cantitate ?? null;

  if (value === null || value === undefined) return null;

  return Number(value);
};

const hasChangedQuantity = (el) => {
  const defaultQuantity = getDefaultQuantity(el);

  if (defaultQuantity === null || defaultQuantity === undefined || !Number.isFinite(defaultQuantity)) {
    return false;
  }

  const currentQuantity = Number(el?.cantitate_in_reteta || 0);

  return Math.abs(currentQuantity - defaultQuantity) > 0.0001;
};

const getRetetaName = (reteta, displayLang) => {
  if (displayLang === "FR") {
    return reteta?.denumire_fr || "";
  }

  return reteta?.denumire || "";
};

const ResourceMiniHeaderRow = memo(function ResourceMiniHeaderRow({ config, elements, colSpan }) {
  return (
    <TableRow className={`${config.lessBg} border-y-2`}>
      <TableCell colSpan={colSpan} className="p-0">
        <div className="flex items-center justify-between p-2 px-4">
          <div className="flex items-center justify-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${config.bgClass}`}>
              <FontAwesomeIcon icon={config.icon} className={`${config.colorClass} text-base`} />
            </div>

            <div className="flex items-center justify-center gap-2">
              <h3 className={`font-bold text-base leading-none ${config.colorClass}`}>{config.titlePlural}</h3>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
});

const ResourceRows = memo(function ResourceRows({ elements, config, onOpenElement, displayLang, visibleColumns, colSpan }) {
  const showCol = (key) => visibleColumns[key];

  if (elements.length === 0) {
    return (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colSpan} className="p-3 text-center text-muted-foreground">
          <div className="flex gap-2 items-center justify-center">
            <FontAwesomeIcon icon={faBoxOpen} className="text-base text-muted-foreground/50" />
            <p className="text-sm font-medium">Nu există {config.titlePlural.toLowerCase()} în această rețetă.</p>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return elements.map((el) => {
    const selectedIsVariant = hasVariantSelected(el);

    const afisareCod = getDisplayedCode(el);
    const afisarePhoto = getDisplayedPhoto(el);
    const afisareDescriere = getDisplayedDescription(el, displayLang);
    const afisareDenumire = getDefinitionName(el, displayLang);

    const varianteCount = el.subcategorii?.length || 0;
    const unitCost = getUnitCost(el);
    const totalElement = getElementTotal(el);
    const priceChanged = hasChangedPrice(el);
    const defaultQuantity = getDefaultQuantity(el);
    const quantityChanged = hasChangedQuantity(el);

    return (
      <TableRow
        key={el.id}
        onClick={(e) => {
          e.stopPropagation();
          onOpenElement(el, config);
        }}
        className="cursor-pointer h-20 p-0 border-b transition-colors group hover:bg-accent hover-row-border"
      >
        {showCol("poza") && (
          <TableCell onClick={(e) => e.stopPropagation()} className="text-center px-4 w-[6rem] max-w-[6rem]">
            <ImagePreviewTooltip
              src={config.hasPhoto && afisarePhoto ? `${photoAPI}/${afisarePhoto}` : null}
              alt={afisareCod || getDefinitionCode(el)}
              ringColor={`hover:ring-${config.normalColor}`}
              fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
              containerClassName="h-16 w-16 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
            />
          </TableCell>
        )}

        {showCol("variante") && (
          <TableCell className="text-center px-4 whitespace-nowrap">
            <Badge
              variant="outline"
              className={`text-base w-10 text-center justify-center px-2 shadow-none whitespace-nowrap cursor-pointer ${varianteCount > 0 ? "text-cyan-600 border-cyan-500" : "text-muted-foreground"}`}
            >
              {varianteCount}
            </Badge>
          </TableCell>
        )}

        {showCol("specific") && (
          <TableCell className="px-4 min-w-[10rem] w-[10rem] max-w-[10rem] text-center">
            <Badge variant="outline" className={`font-black ${selectedIsVariant ? "bg-primary/10 border-primary text-primary" : "bg-card border-foreground/40 text-foreground"}`}>
              {selectedIsVariant ? "Variantă" : "Definiție"}
            </Badge>
          </TableCell>
        )}

        {showCol("cod") && (
          <TableCell className="text-center px-4 whitespace-nowrap">
            <span className="text-base font-bold text-foreground">{afisareCod || EMPTY}</span>
          </TableCell>
        )}

        {showCol("denumire") && (
          <TableCell className="px-4 min-w-[16rem] w-[16rem] max-w-[16rem]">
            {afisareDenumire ? (
              <OverflowTooltip align="left" text={afisareDenumire} className="text-base text-foreground whitespace-pre-wrap leading-normal" maxLines={2} />
            ) : (
              <span className="text-base text-muted-foreground/40 italic">{EMPTY}</span>
            )}
          </TableCell>
        )}

        {showCol("descriere") && (
          <TableCell className="px-4 min-w-[20rem]">
            {afisareDescriere ? (
              <OverflowTooltip align="left" text={afisareDescriere} className="text-base text-foreground whitespace-pre-wrap leading-normal" maxLines={2} />
            ) : (
              <span className="text-base text-muted-foreground/40 italic">{EMPTY}</span>
            )}
          </TableCell>
        )}

        {showCol("unitate") && (
          <TableCell className="text-center px-4 whitespace-nowrap">
            <Badge variant="outline" className="text-base px-2 w-10 justify-center py-2 shadow-none whitespace-nowrap">
              {el.unitate_masura || EMPTY}
            </Badge>
          </TableCell>
        )}

        {showCol("costUnitar") && (
          <TableCell className="text-center px-4 whitespace-nowrap">
            <div className="flex items-center justify-center gap-1">
              <span className={`text-base ${priceChanged ? "text-high font-black" : "text-muted-foreground"}`}>{formatNumber(unitCost)}</span>

              {priceChanged && <FontAwesomeIcon icon={faExclamationCircle} className="text-high text-lg" title="Preț modificat față de original" />}
            </div>
          </TableCell>
        )}

        {showCol("cantitate") && (
          <TableCell className="text-center px-4 whitespace-nowrap">
            <div className="flex flex-col items-center justify-center gap-0.5">
              <div className="flex items-center justify-center gap-1">
                <span className={`text-base font-bold ${quantityChanged ? "text-high font-black" : "text-foreground"}`}>{formatNumber(el.cantitate_in_reteta)}</span>

                {quantityChanged && <FontAwesomeIcon icon={faExclamationCircle} className="text-high text-lg" title={`Cantitate modificată față de rețetă: ${formatNumber(defaultQuantity)}`} />}
              </div>
            </div>
          </TableCell>
        )}

        {showCol("costTotal") && (
          <TableCell className="text-center px-4 whitespace-nowrap">
            <span className="font-bold text-base">{formatNumber(totalElement)}</span>
          </TableCell>
        )}
      </TableRow>
    );
  });
});

const ResourcesTable = memo(function ResourcesTable({ sections, visibleColumns, displayLang, onOpenElement }) {
  const showCol = (key) => visibleColumns[key];
  const colSpan = getVisibleColumnCount(visibleColumns);

  return (
    <div className="rounded-md border bg-card w-full h-full overflow-auto relative shadow-sm">
      <Table className="min-w-full table-fixed caption-bottom text-left border-collapse">
        <TableHeader className="bg-background sticky top-0 z-50 shadow-sm">
          <TableRow className="h-12 hover:bg-muted-foreground/25 bg-muted-foreground/25">
            {showCol("poza") && <TableHead className="text-center px-4 w-[6rem] max-w-[6rem]">Poză</TableHead>}
            {showCol("variante") && <TableHead className="text-center px-4 w-[6rem] max-w-[6rem]">Variante</TableHead>}
            {showCol("specific") && <TableHead className="px-4 text-center w-[10rem] max-w-[10rem]">Specific</TableHead>}
            {showCol("cod") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Cod</TableHead>}
            {showCol("denumire") && <TableHead className="px-4 min-w-[16rem] w-[16rem] max-w-[16rem]">Denumire</TableHead>}
            {showCol("descriere") && <TableHead className="px-4 min-w-[20rem]">Descriere</TableHead>}
            {showCol("unitate") && <TableHead className="text-center px-4 w-[8rem] max-w-[8rem]">Unitate</TableHead>}
            {showCol("costUnitar") && <TableHead className="text-center px-4 w-[10rem] max-w-[10rem]">Cost Unitar</TableHead>}
            {showCol("cantitate") && <TableHead className="text-center px-4 w-[10rem] max-w-[10rem]">Cantitate</TableHead>}
            {showCol("costTotal") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Cost Total</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sections.map((section) => (
            <React.Fragment key={section.config.id}>
              <ResourceMiniHeaderRow config={section.config} elements={section.elements} colSpan={colSpan} />

              <ResourceRows elements={section.elements} config={section.config} onOpenElement={onOpenElement} displayLang={displayLang} visibleColumns={visibleColumns} colSpan={colSpan} />
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

export default function OferteRetetaSubList({ open, setOpen, parentItem, selectedLucrare }) {
  const [localDisplayLang, setLocalDisplayLang] = useState("RO");

  const [visibleColumns, setVisibleColumns] = useState({
    poza: true,
    variante: true,
    specific: true,
    cod: true,
    denumire: true,
    descriere: true,
    unitate: true,
    costUnitar: true,
    cantitate: true,
    costTotal: true,
  });

  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElementConfig, setSelectedElementConfig] = useState(null);

  const editElementVariant = useEditOfertaRetetaElementVariant();

  useEffect(() => {
    if (!variantDialogOpen || !selectedElement?.id || !parentItem?.elemente) return;

    const freshElement = parentItem.elemente.find((el) => Number(el.id) === Number(selectedElement.id));

    if (freshElement) {
      setSelectedElement(freshElement);
    }
  }, [parentItem, selectedElement?.id, variantDialogOpen]);

  const toggleCol = useCallback((key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleOpenElement = useCallback((element, config) => {
    setSelectedElement(element);
    setSelectedElementConfig(config);
    setVariantDialogOpen(true);
  }, []);

  const handleSaveElementSnapshot = useCallback(
    async (payload) => {
      await editElementVariant.mutateAsync({
        ...payload,
        lucrare_id: selectedLucrare?.id,
      });

      toast.success("Elementul a fost actualizat.");
    },
    [editElementVariant, selectedLucrare?.id],
  );

  if (!parentItem) return null;

  const elemente = parentItem.elemente || [];

  const materiale = elemente.filter((el) => el.tip_resursa === "material");
  const manopere = elemente.filter((el) => el.tip_resursa === "manopera");
  const utilaje = elemente.filter((el) => el.tip_resursa === "utilaj");
  const transporturi = elemente.filter((el) => el.tip_resursa === "transport");

  const sections = [
    {
      config: resurseConfig.manopera,
      elements: manopere,
    },
    {
      config: resurseConfig.material,
      elements: materiale,
    },
    {
      config: resurseConfig.utilaj,
      elements: utilaje,
    },
    {
      config: resurseConfig.transport,
      elements: transporturi,
    },
  ];

  const costReteta = getRetetaCost(parentItem);
  const totalLucrare = getRetetaTotalLucrare(parentItem);
  const retetaName = getRetetaName(parentItem, localDisplayLang);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[85vw] max-h-[90vh] h-[90vh] flex flex-col p-0" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
          <DialogHeader className="px-6 py-4 rounded-md rounded-b-none border-b bg-muted flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 bg-sky-600/25 border border-sky-600/25">
                <FontAwesomeIcon icon={faDatabase} className="text-sky-600 text-2xl" />
              </div>

              <DialogTitle className="text-left flex flex-col gap-0 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-sky-600 font-bold uppercase tracking-wider">{parentItem.cod_reteta || EMPTY}</p>
                </div>

                {retetaName ? (
                  <OverflowTooltip align="left" text={retetaName} className="text-xl font-bold text-foreground" maxLines={1} />
                ) : (
                  <span className="text-xl font-bold text-muted-foreground/40 italic">{EMPTY}</span>
                )}
              </DialogTitle>
            </div>

            <div className="flex items-center gap-8 mr-12 shrink-0">
              <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2 h-10 w-20 text-foreground" onClick={() => setLocalDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"))}>
                  <FontAwesomeIcon icon={faLanguage} />
                  <span className="font-bold">{localDisplayLang}</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 h-10 text-foreground">
                      <FontAwesomeIcon icon={faColumns} />
                      <span>Coloane</span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuCheckboxItem checked={visibleColumns.poza} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("poza")}>
                      Poză
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.variante} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("variante")}>
                      Variante
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.specific} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("specific")}>
                      Specific
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.cod} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("cod")}>
                      Cod
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.denumire} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("denumire")}>
                      Denumire
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.descriere} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("descriere")}>
                      Descriere
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.unitate} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("unitate")}>
                      Unitate
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.costUnitar} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("costUnitar")}>
                      Cost Unitar
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.cantitate} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("cantitate")}>
                      Cantitate
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.costTotal} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("costTotal")}>
                      Cost Total
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-col justify-center items-center gap-1">
                <span className="text-sm text-foreground font-semibold uppercase tracking-wider">Cost Rețetă</span>

                <div className="flex items-baseline gap-1.5 bg-card px-3 py-1 rounded-md border border-foreground/40">
                  <span className="text-lg font-extrabold">{formatNumber(costReteta)}</span>
                  <span className="text-sm font-bold">/ {parentItem.unitate_masura || EMPTY}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 flex-1 min-h-0 rounded-md bg-card">
            <ResourcesTable sections={sections} visibleColumns={visibleColumns} displayLang={localDisplayLang} onOpenElement={handleOpenElement} />
          </div>
        </DialogContent>
      </Dialog>

      {selectedElementConfig && selectedElement && (
        <OferteElementVariantDialog
          open={variantDialogOpen}
          setOpen={setVariantDialogOpen}
          config={selectedElementConfig}
          elementItem={selectedElement}
          parentItem={parentItem}
          onSave={handleSaveElementSnapshot}
        />
      )}
    </>
  );
}
