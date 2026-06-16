import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faDownload, faFilePdf, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import api from "@/api/axiosAPI";
import { useCompaniiInterne } from "@/hooks/useCompaniiInterne";

const FIRST_COLUMNS = [
  { key: "elemente", label: "Tip" },
  { key: "poza", label: "Poză" },
];

const LAST_COLUMNS = [
  { key: "cod", label: "Cod" },
  { key: "clasa", label: "Clasă" },
  { key: "denumire", label: "Denumire" },
  { key: "descriere", label: "Descriere" },
  { key: "unitate", label: "U.M." },
  { key: "cantitate", label: "Qty" },
  { key: "qtyTotal", label: "Qty total" },
  { key: "cost", label: "Cost" },
  { key: "costTotal", label: "Cost total" },
  { key: "coefProcent", label: "Coef" },
  { key: "coefPret", label: "Coef. preț" },
  { key: "pret", label: "Preț" },
];

const BASE_COLUMNS = [...FIRST_COLUMNS, ...LAST_COLUMNS];
const CATEGORY_LEVEL_COUNT = 5;
const DEFAULT_COLUMN_VISIBILITY = {
  clasa: false,
  coefPret: false,
};

const DEFAULT_OPTIONS = {
  pageSize: "A4",
  orientation: "landscape",
  displayLang: "RO",
  formType: "compact_retete",
  marginPreset: "normal",
  density: "normal",
  fontSize: 8,
  decimalPlaces: 3,
  logoCompanyId: "",
  recapitulatiiPercent: "0",
  tvaPercent: "0",
  showRecapitulatii: true,
  showTva: true,
  creatDe: "",
  aprobatDe: "",
  categoryConfig: Array.from({ length: CATEGORY_LEVEL_COUNT }, () => ""),
  showCategoryTotals: false,
};

const PDF_TYPE_FILENAME_LABELS = {
  compact_retete: "PDF_Compact",
  rasfirat_retete: "PDF_Rasfirat",
  manopere_retete: "PDF_Manopere",
  materiale_retete: "PDF_Materiale",
  utilaje_retete: "PDF_Utilaje",
  transport_retete: "PDF_Transport",
};

const buildInitialColumns = (visibleColumns = {}, dynamicColumns = []) => {
  const next = {};

  BASE_COLUMNS.forEach((col) => {
    if (col.key === "clasa") {
      next[col.key] = false;
      return;
    }

    next[col.key] = visibleColumns?.[col.key] !== undefined ? visibleColumns?.[col.key] !== false : DEFAULT_COLUMN_VISIBILITY[col.key] !== false;
  });

  dynamicColumns.forEach((col) => {
    next[`col_${col.id}`] = visibleColumns?.[`col_${col.id}`] !== false;
  });

  return next;
};

const normalizeExportPercentInput = (value) => {
  const next = String(value || "").replace(",", ".");

  if (next === "") return "";
  if (!/^\d{0,4}(\.\d{0,2})?$/.test(next)) return null;

  const parsed = Number(next);

  if (!Number.isFinite(parsed) || parsed > 1000) return null;

  return next;
};

const buildCategoryFields = (dynamicColumns = []) => {
  return [
    ...(dynamicColumns || []).slice(0, 5).map((col) => ({
      key: `dynamic_${col.id}`,
      label: col.nume,
    })),
    { key: "denumire", label: "Denumire" },
    { key: "clasa1", label: "Clasă 1" },
    { key: "clasa2", label: "Clasă 2" },
    { key: "clasa3", label: "Clasă 3" },
    { key: "clasa4", label: "Clasă 4" },
    { key: "clasa5", label: "Clasă 5" },
  ];
};

const normalizeCategoryConfig = (config = [], fields = []) => {
  const availableKeys = new Set((fields || []).map((field) => field.key));
  const usedKeys = new Set();
  const values = Array.isArray(config) ? config : [];

  return Array.from({ length: CATEGORY_LEVEL_COUNT }, (_, index) => {
    const key = values[index] || "";

    if (!key || !availableKeys.has(key) || usedKeys.has(key)) return "";

    usedKeys.add(key);
    return key;
  });
};

const sanitizeFileNamePart = (value, fallback) => {
  const withoutControlChars = String(value || fallback)
    .trim()
    .split("")
    .map((char) => (char.charCodeAt(0) < 32 ? "_" : char))
    .join("");

  const name = withoutControlChars
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return name || fallback;
};

const getPdfFileName = ({ selectedOferta, selectedLucrare, options }) => {
  const santierName = selectedOferta?.santier_nume || selectedOferta?.nume_santier || selectedLucrare?.santier_nume || (selectedOferta?.santier_id ? `Santier_${selectedOferta.santier_id}` : "Santier");
  const ofertaName = selectedOferta?.nume || selectedOferta?.oferta_nume || selectedLucrare?.oferta_nume || "Oferta";
  const lucrareName = selectedLucrare?.nume || selectedLucrare?.lucrare_nume || "Lucrare";
  const pdfType = PDF_TYPE_FILENAME_LABELS[options?.formType] || "PDF";
  const pdfLang = options?.displayLang || "RO";

  return `${[santierName, ofertaName, lucrareName, pdfType, pdfLang].map((part) => sanitizeFileNamePart(part, "PDF")).join("_")}.pdf`;
};

export default function OferteExportPdfDialog({
  open,
  setOpen,
  selectedOferta,
  selectedLucrare,
  displayLang = "RO",
  visibleColumns,
  dynamicColumns = [],
  decimalPlaces = 3,
  recapitulatiiPercent = "0",
  tvaPercent = "0",
  onRecapitulatiiPercentChange,
  onTvaPercentChange,
}) {
  const { data: companiiInterneData } = useCompaniiInterne();
  const companiiInterne = companiiInterneData?.companies || [];

  const [options, setOptions] = useState(() => ({
    ...DEFAULT_OPTIONS,
    displayLang,
    decimalPlaces,
  }));
  const [pdfColumns, setPdfColumns] = useState(() => buildInitialColumns(visibleColumns, dynamicColumns));
  const [recapOpen, setRecapOpen] = useState(true);
  const [columnsOpen, setColumnsOpen] = useState(true);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  const allColumns = useMemo(() => {
    return [
      ...FIRST_COLUMNS,
      ...dynamicColumns.map((col) => ({
        key: `col_${col.id}`,
        label: col.nume,
      })),
      ...LAST_COLUMNS,
    ];
  }, [dynamicColumns]);

  const categoryFields = useMemo(() => buildCategoryFields(dynamicColumns), [dynamicColumns]);
  const selectedCategoryKeys = useMemo(() => new Set((options.categoryConfig || []).filter(Boolean)), [options.categoryConfig]);

  useEffect(() => {
    if (!open) return;

    setOptions((prev) => ({
      ...prev,
      displayLang,
      decimalPlaces,
      categoryConfig: normalizeCategoryConfig(prev.categoryConfig, buildCategoryFields(dynamicColumns)),
    }));
    setPdfColumns(buildInitialColumns(visibleColumns, dynamicColumns));
  }, [decimalPlaces, displayLang, dynamicColumns, open, visibleColumns]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const updateOption = useCallback((key, value) => {
    setOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const toggleColumn = useCallback((key) => {
    setPdfColumns((prev) => ({
      ...prev,
      [key]: !(prev?.[key] !== false),
    }));
  }, []);

  const handleRecapitulatiiPercentChange = useCallback(
    (value) => {
      const next = normalizeExportPercentInput(value);

      if (next !== null) {
        onRecapitulatiiPercentChange?.(next);
      }
    },
    [onRecapitulatiiPercentChange],
  );

  const handleTvaPercentChange = useCallback(
    (value) => {
      const next = normalizeExportPercentInput(value);

      if (next !== null) {
        onTvaPercentChange?.(next);
      }
    },
    [onTvaPercentChange],
  );

  const updateCategoryLevel = useCallback(
    (levelIndex, fieldKey) => {
      setOptions((prev) => {
        const nextConfig = normalizeCategoryConfig(prev.categoryConfig, categoryFields);

        nextConfig[levelIndex] = fieldKey || "";

        return {
          ...prev,
          categoryConfig: normalizeCategoryConfig(nextConfig, categoryFields),
        };
      });
    },
    [categoryFields],
  );

  const clearPdfCategories = useCallback(() => {
    setOptions((prev) => ({
      ...prev,
      categoryConfig: Array.from({ length: CATEGORY_LEVEL_COUNT }, () => ""),
      showCategoryTotals: false,
    }));
  }, []);

  const fetchPdfBlob = useCallback(async () => {
    if (!selectedLucrare?.id) {
      toast.warning("Selectează o lucrare pentru export PDF.");
      return null;
    }

    const response = await api.post(
      `/Formulare/generarePDF/${selectedLucrare.id}/pdf`,
      {
        options: {
          ...options,
          recapitulatiiPercent,
          tvaPercent,
          visibleColumns: pdfColumns,
        },
      },
      {
        responseType: "blob",
      },
    );

    return response.data;
  }, [options, pdfColumns, recapitulatiiPercent, selectedLucrare?.id, tvaPercent]);

  const handleRefreshPreview = useCallback(async () => {
    setLoadingPreview(true);

    try {
      const blob = await fetchPdfBlob();

      if (!blob) return;

      const nextUrl = URL.createObjectURL(blob);

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la generarea preview-ului PDF.");
    } finally {
      setLoadingPreview(false);
    }
  }, [fetchPdfBlob]);

  const handleDownload = useCallback(async () => {
    try {
      const blob = await fetchPdfBlob();

      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = getPdfFileName({ selectedOferta, selectedLucrare, options });
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la exportul PDF.");
    }
  }, [fetchPdfBlob, options, selectedLucrare, selectedOferta]);

  const previewSrc = previewUrl ? `${previewUrl}#toolbar=1&navpanes=0&scrollbar=1&view=Fit` : "";

  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection max-w-[99vw] xxxl:max-w-[150rem] h-[92vh] xxxl:h-[94vh] p-0 gap-0 overflow-hidden border shadow-2xl flex flex-col text-sm">
        <DialogHeader className="px-4 py-3 xxxl:px-6 xxxl:py-4 border-b bg-muted">
          <div className="flex items-center gap-3 xxxl:gap-4 min-w-0">
            <div className="h-10 w-10 xxxl:h-14 xxxl:w-14 rounded-lg xxxl:rounded-xl bg-primary/15 border border-primary/50 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faFilePdf} className="text-primary text-xl xxxl:text-2xl" />
            </div>

            <div className="grid gap-1 min-w-0 text-left">
              <DialogTitle className="text-lg xxxl:text-xl font-black text-foreground">Export PDF</DialogTitle>

              <DialogDescription className="text-xs xxxl:text-sm text-muted-foreground leading-relaxed">
                Preview PDF pentru rețetele și elementele lucrării, în format compact de ofertare.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[18rem_minmax(0,1fr)] xxxl:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-auto border-r p-2 xxxl:p-3">
            <div className="grid gap-2 xxxl:gap-3">
              <div className="rounded-md border bg-card p-2 xxxl:p-3">
                <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">Setări PDF</p>

                <div className="mt-2 xxxl:mt-3 grid gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-foreground">Tip formular</Label>
                    <Select value={options.formType} onValueChange={(value) => updateOption("formType", value)}>
                      <SelectTrigger className="h-8 bg-background  text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact_retete">PDF Compact (F3)</SelectItem>
                        <SelectItem value="rasfirat_retete">PDF Răsfirat (C5)</SelectItem>
                        <SelectItem value="manopere_retete">PDF Manopere (C6)</SelectItem>
                        <SelectItem value="materiale_retete">PDF Materiale (C7)</SelectItem>
                        <SelectItem value="utilaje_retete">PDF Utilaje (C8)</SelectItem>
                        <SelectItem value="transport_retete">PDF Transport (C9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-foreground">Limbă PDF</Label>
                    <div className="grid grid-cols-2 gap-1">
                      <Button type="button" variant={options.displayLang === "RO" ? "default" : "outline"} className="h-8 text-xs font-black" onClick={() => updateOption("displayLang", "RO")}>
                        RO
                      </Button>
                      <Button type="button" variant={options.displayLang === "FR" ? "default" : "outline"} className="h-8 text-xs font-black" onClick={() => updateOption("displayLang", "FR")}>
                        FR
                      </Button>
                    </div>
                  </div>

                  <div className="my-1 border-t" />

                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-foreground">Format foaie</Label>
                    <Select value={options.pageSize} onValueChange={(value) => updateOption("pageSize", value)}>
                      <SelectTrigger className="h-8 bg-background text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="A3">A3</SelectItem>
                        <SelectItem value="A2">A2</SelectItem>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A0">A0</SelectItem>
                        <SelectItem value="A5">A5</SelectItem>
                        <SelectItem value="LETTER">Letter</SelectItem>
                        <SelectItem value="LEGAL">Legal</SelectItem>
                        <SelectItem value="TABLOID">Tabloid</SelectItem>
                        <SelectItem value="EXECUTIVE">Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-foreground">Margini</Label>
                    <Select value={options.marginPreset} onValueChange={(value) => updateOption("marginPreset", value)}>
                      <SelectTrigger className="h-8 text-xs bg-background  font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very_small">Foarte mici</SelectItem>
                        <SelectItem value="small">Mici</SelectItem>
                        <SelectItem value="normal">Normale</SelectItem>
                        <SelectItem value="large">Mari</SelectItem>
                        <SelectItem value="very_large">Foarte mari</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-foreground">Logo</Label>
                    <Select value={options.logoCompanyId ? String(options.logoCompanyId) : "none"} onValueChange={(value) => updateOption("logoCompanyId", value === "none" ? "" : value)}>
                      <SelectTrigger className="h-8 text-xs bg-background  font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Fără logo</SelectItem>
                        {companiiInterne.map((company) => (
                          <SelectItem key={company.id} value={String(company.id)}>
                            {company.nume}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-foreground">Orientare</Label>
                    <Select value={options.orientation} onValueChange={(value) => updateOption("orientation", value)}>
                      <SelectTrigger className="h-8 bg-background   text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landscape">Landscape</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-foreground">Font tabel</Label>
                    <Input value={options.fontSize} onChange={(e) => updateOption("fontSize", e.target.value)} className="h-8 bg-background  text-xs font-semibold" inputMode="numeric" />
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs font-bold text-foreground">Zecimale</Label>
                    <Select value={String(options.decimalPlaces || 3)} onValueChange={(value) => updateOption("decimalPlaces", Number(value))}>
                      <SelectTrigger className="h-8 bg-background text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 zecimală</SelectItem>
                        <SelectItem value="2">2 zecimale</SelectItem>
                        <SelectItem value="3">3 zecimale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </div>

              <Collapsible open={recapOpen} onOpenChange={setRecapOpen} className="rounded-md border ">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex h-auto w-full items-center justify-between rounded-md gap-2  px-3 py-2 text-left text-sm font-black uppercase tracking-wide text-muted-foreground"
                  >
                    Recapitulare
                    <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${recapOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="border-t px-3 py-2">
                  <div className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <Label className="flex items-center justify-between gap-2 text-xs font-bold text-foreground">
                          <span>Recapitulații %</span>
                          <Checkbox className="h-4 w-4" checked={options.showRecapitulatii} onCheckedChange={(checked) => updateOption("showRecapitulatii", !!checked)} />
                        </Label>
                        <Input value={recapitulatiiPercent} onChange={(e) => handleRecapitulatiiPercentChange(e.target.value)} className="h-8 bg-background text-xs font-semibold" inputMode="decimal" />
                      </div>

                      <div className="grid gap-1">
                        <Label className="flex items-center justify-between gap-2 text-xs font-bold text-foreground">
                          <span>TVA %</span>
                          <Checkbox className="h-4 w-4" checked={options.showTva} onCheckedChange={(checked) => updateOption("showTva", !!checked)} />
                        </Label>
                        <Input value={tvaPercent} onChange={(e) => handleTvaPercentChange(e.target.value)} className="h-8 bg-background text-xs font-semibold" inputMode="decimal" />
                      </div>
                    </div>

                    <div className="grid gap-1">
                      <Label className="text-xs font-bold text-foreground">Creat de</Label>
                      <Input value={options.creatDe} onChange={(e) => updateOption("creatDe", e.target.value)} className="h-8 bg-background text-xs font-semibold" />
                    </div>

                    <div className="grid gap-1">
                      <Label className="text-xs font-bold text-foreground">Aprobat de</Label>
                      <Input value={options.aprobatDe} onChange={(e) => updateOption("aprobatDe", e.target.value)} className="h-8 bg-background text-xs font-semibold" />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={columnsOpen} onOpenChange={setColumnsOpen} className="rounded-md border ">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex h-auto w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-black uppercase tracking-wide text-muted-foreground"
                  >
                    Coloane PDF
                    <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${columnsOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="border-t px-3 py-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {allColumns.map((col) => (
                      <Label key={col.key} className="flex min-w-0 items-center justify-between gap-2 px-0 py-0.5 text-xs font-bold text-foreground">
                        <span className="min-w-0 truncate">{col.label}</span>
                        <Checkbox className="h-5 w-5" checked={pdfColumns?.[col.key] !== false} onCheckedChange={() => toggleColumn(col.key)} />
                      </Label>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen} className="rounded-md border ">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex h-auto w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-black uppercase tracking-wide text-muted-foreground"
                  >
                    Categorii PDF
                    <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="border-t px-3 py-2">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Checkbox className="h-5 w-5" checked={options.showCategoryTotals} onCheckedChange={(checked) => updateOption("showCategoryTotals", !!checked)} />
                      Totaluri pe categorii
                    </Label>

                    {Array.from({ length: CATEGORY_LEVEL_COUNT }, (_, levelIndex) => {
                      const selectedKey = options.categoryConfig?.[levelIndex] || "";

                      return (
                        <div key={levelIndex} className="grid grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-2">
                          <Label className="text-xs font-black text-foreground">Nivel {levelIndex + 1}</Label>
                          <Select value={selectedKey || "none"} onValueChange={(value) => updateCategoryLevel(levelIndex, value === "none" ? "" : value)}>
                            <SelectTrigger className="h-8 bg-background text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Fără categorie</SelectItem>
                              {categoryFields.map((field) => {
                                const unavailable = selectedCategoryKeys.has(field.key) && field.key !== selectedKey;

                                return (
                                  <SelectItem key={field.key} value={field.key} disabled={unavailable}>
                                    {unavailable ? `${field.label} (folosit)` : field.label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 text-xs font-bold"
                      onClick={clearPdfCategories}
                      disabled={!options.categoryConfig?.some(Boolean) && !options.showCategoryTotals}
                    >
                      Curăță categoriile
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </aside>

          <section className="min-h-0 p-2 xxxl:p-4">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-muted/10">
              <div className="flex items-center justify-between gap-3 border-b bg-background px-3 py-2 xxxl:px-4 xxxl:py-3">
                <div>
                  <p className="text-sm font-black text-foreground">Preview PDF</p>
                  <p className="text-xs font-semibold text-muted-foreground">{selectedLucrare?.nume || "Nicio lucrare selectată"}</p>
                </div>

                <Button type="button" variant="outline" className="gap-2" onClick={handleRefreshPreview} disabled={loadingPreview || !selectedLucrare?.id}>
                  <FontAwesomeIcon icon={faRotateRight} className={loadingPreview ? "animate-spin" : ""} />
                  Reîncarcă
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-b-lg bg-muted/20">
                {previewUrl ? (
                  <iframe title="Preview PDF ofertă" src={previewSrc} className="h-full w-full rounded-b-lg bg-background" />
                ) : (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <FontAwesomeIcon icon={faFilePdf} className="text-4xl text-primary" />
                      <p className="mt-3 text-lg font-black text-foreground">Preview neîncărcat</p>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">Apasă Reîncarcă pentru generarea PDF-ului.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 xxxl:gap-3 sm:justify-end w-full border-t bg-muted/20 px-4 py-3 xxxl:px-6 xxxl:py-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-w-[7.5rem]">
            Închide
          </Button>

          <Button type="button" onClick={handleDownload} disabled={loadingPreview || !selectedLucrare?.id} className="gap-2 min-w-[9rem] text-white">
            <FontAwesomeIcon icon={faDownload} />
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
