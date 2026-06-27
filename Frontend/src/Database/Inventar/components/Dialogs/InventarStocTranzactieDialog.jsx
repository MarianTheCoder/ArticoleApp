import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronDown, faPlus, faRightLeft, faSearch, faTrash, faUser } from "@fortawesome/free-solid-svg-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import { AuthContext } from "@/context/TokenContext";
import { useConturi } from "@/hooks/useConturi";
import { useSantiereByCompany } from "@/hooks/useSantiere";
import { useInventarStocLocatii, useSaveInventarTranzactie } from "@/hooks/Database/useInventar";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import photoAPI from "@/api/photoAPI";
import NoImage from "@/assets/no-image-icon.png";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMPTY = "—";

const getLineKey = (item) => String(item?.key || `${item?.parent?.inventar_resursa_id || item?.parent?.id || "p"}:${item?.sub?.id || "s"}`);

const getVariantTitle = (item) => {
  const parentName = item?.parent?.denumire || item?.parent?.denumire_fr || "Resursă";
  const variantCode = item?.sub?.cod_specific || item?.sub?.cod || "";
  return variantCode ? `${parentName} · ${variantCode}` : parentName;
};

const getMetaParts = (item) => ({
  furnizor: item?.sub?.furnizor_denumire || item?.sub?.detalii_extra?.furnizor || EMPTY,
  marca: item?.sub?.marca_denumire || item?.sub?.detalii_extra?.marca || EMPTY,
});

const getItemStatus = (item) => item?.sub?.detalii_extra?.status_utilaj || item?.sub?.status_utilaj || "";

const getStockValue = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return 0;
};

const formatNumber = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2).replace(".", ",") : "0,00";
};

const parseNumber = (value) => {
  const numberValue = Number(String(value || "").replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const toPositiveInt = (value) => {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const getItemDefinitionId = (item) =>
  toPositiveInt(item?.sub?.definitie_id) || toPositiveInt(item?.parent?.original_definitie_id) || toPositiveInt(item?.parent?.catalog_definitie_id) || toPositiveInt(item?.parent?.id);

const getItemSubcategorieId = (item) => toPositiveInt(item?.sub?.id) || toPositiveInt(item?.sub?.original_subcategorie_id) || toPositiveInt(item?.sub?.catalog_subcategorie_id);

const getDefaultDraftLine = () => ({
  cantitate: "",
});

const getItemPhotoUrl = (item) => item?.sub?.photo_url || item?.parent?.photo_url || "";

const getUserInitials = (name) =>
  String(name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const isActiveValue = (value) => value === 1 || value === true || value === "1";

const getSantierName = (santier) => santier?.nume || santier?.name || `Șantier ${santier?.id || ""}`.trim();

const locationButtonClass = (active) =>
  cn("h-9 min-w-0 rounded-md px-2 text-xs font-black transition-colors", active ? "border-primary bg-primary/15 text-primary hover:bg-primary/25" : "bg-card text-foreground hover:bg-accent");

// Mic badge cu stocul locației. Single -> cantitatea; multi-select -> "x/y" (x din y variante au stoc aici),
// iar la hover/click deschide lista cu fiecare variantă și cantitatea ei (pattern din RecipeCodeTooltip).
function StockBadge({ variants = [], qtyById = null, align = "end", noBg = false }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const rows = useMemo(() => variants.map((variant) => ({ name: variant.name, qty: getStockValue(qtyById?.[variant.id]) })), [variants, qtyById]);
  const count = rows.filter((row) => row.qty > 0).length;
  const total = rows.reduce((sum, row) => sum + row.qty, 0);
  const multi = variants.length > 1;
  const label = multi ? `${count}/${variants.length}` : count > 0 ? formatNumber(total) : null;
  const canExpand = multi && rows.length > 0;

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => () => cancelClose(), []);

  if (label === null) return null;

  const badgeClass = cn(
    "inline-flex h-5 shrink-0 items-center justify-center rounded-md text-xs font-black tabular-nums text-primary",
    noBg ? "px-0" : "px-1.5",
    noBg ? (canExpand ? "cursor-pointer hover:underline" : "") : canExpand ? "cursor-pointer bg-primary/10 hover:bg-primary/20" : "bg-primary/10",
  );

  if (!canExpand) {
    return <span className={badgeClass}>{label}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          data-no-row-open
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            cancelClose();
            setOpen((prev) => !prev);
          }}
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
          className={badgeClass}
        >
          {label}
        </span>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={6}
        avoidCollisions={false}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        className="z-[120] w-72 rounded-md border-2 border-border bg-popover p-2 text-popover-foreground shadow-md"
      >
        <div className="flex max-h-64 flex-col gap-1 overflow-auto">
          {rows.map((entry, index) => (
            <div key={index} className={cn("flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1", entry.qty <= 0 ? "opacity-40" : "")}>
              <span className="min-w-0 truncate text-xs font-semibold text-foreground">{entry.name}</span>
              <span className="shrink-0 text-xs font-black tabular-nums text-primary">{formatNumber(entry.qty)}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LocationField({
  label,
  type,
  santierId,
  userId,
  onTypeChange,
  onSantierChange,
  onUserChange,
  santiere = [],
  users = [],
  allowPurchase = false,
  allowUser = false,
  selectedVariants = [],
  inventarQtyById = null,
  santiereQtyById = {},
  usersQtyById = {},
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userOpen, setUserOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const selectedSantier = useMemo(() => santiere.find((item) => String(item.id) === String(santierId)), [santiere, santierId]);
  const selectedUser = useMemo(() => users.find((item) => String(item.id) === String(userId)), [users, userId]);
  const filteredSantiere = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return santiere;
    return santiere.filter((item) => [item.nume, item.name, item.companie_nume, item.filiala_nume, item.adresa].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
  }, [santiere, search]);
  const filteredUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((item) => [item.name, item.email, item.specializare].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
  }, [users, userSearch]);

  // Șantierele care au stoc din variantele selectate apar primele (sortarea e stabilă, deci ordinea alfabetică se păstrează în interiorul grupelor).
  const santierHasStock = (id) => Object.values(santiereQtyById?.[String(id)] || {}).some((qty) => getStockValue(qty) > 0);
  const userHasStock = (id) => Object.values(usersQtyById?.[String(id)] || {}).some((qty) => getStockValue(qty) > 0);
  const sortedSantiere = useMemo(() => {
    return [...filteredSantiere].sort((a, b) => {
      const aHas = santierHasStock(a.id) ? 1 : 0;
      const bHas = santierHasStock(b.id) ? 1 : 0;
      return bHas - aHas;
    });
  }, [filteredSantiere, santiereQtyById]);
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aHas = userHasStock(a.id) ? 1 : 0;
      const bHas = userHasStock(b.id) ? 1 : 0;
      return bHas - aHas;
    });
  }, [filteredUsers, usersQtyById]);
  const gridClass = allowPurchase
    ? allowUser
      ? "grid-cols-[auto_auto_minmax(8rem,1fr)_minmax(12rem,1.3fr)]"
      : "grid-cols-[auto_auto_minmax(0,1fr)]"
    : allowUser
      ? "grid-cols-[auto_minmax(8rem,1fr)_minmax(12rem,1.3fr)]"
      : "grid-cols-[auto_minmax(0,1fr)]";

  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</div>

      <div className={cn("grid gap-1.5", gridClass)}>
        {allowPurchase ? (
          <Button type="button" variant="outline" className={locationButtonClass(type === "cumparare")} onClick={() => onTypeChange("cumparare")}>
            Cumpărare
          </Button>
        ) : null}

        <Button type="button" variant="outline" className={cn(locationButtonClass(type === "inventar"), "justify-between gap-1.5")} onClick={() => onTypeChange("inventar")}>
          <span>Magazie</span>
          <StockBadge variants={selectedVariants} qtyById={inventarQtyById} noBg />
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className={cn(locationButtonClass(type === "santier"), "justify-between gap-2")} onClick={() => onTypeChange("santier")}>
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-4 w-4 shrink-0 rounded-sm border border-border" style={{ backgroundColor: selectedSantier?.culoare_hex || selectedSantier?.color_hex || "#94a3b8" }} />
                <span className="min-w-0 truncate">{selectedSantier ? getSantierName(selectedSantier) : "Șantier"}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {selectedSantier ? <StockBadge variants={selectedVariants} qtyById={santiereQtyById?.[String(santierId)]} noBg /> : null}
                <FontAwesomeIcon icon={faChevronDown} className="shrink-0 text-xs" />
              </span>
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" side="bottom" avoidCollisions={false} className="w-[22rem] p-2" onWheel={(event) => event.stopPropagation()}>
            <div className="relative mb-2">
              <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută șantier..." className="h-8 bg-background pl-7 text-sm" />
            </div>

            <div className="max-h-72 overflow-auto rounded-md border">
              {sortedSantiere.map((santier) => {
                const selected = String(santier.id) === String(santierId);
                const color = santier.culoare_hex || santier.color_hex || "#94a3b8";

                return (
                  <button
                    key={santier.id}
                    type="button"
                    className="flex w-full items-center gap-2 border-b px-2 py-2 text-left last:border-b-0 hover:bg-accent"
                    onClick={() => {
                      onSantierChange(String(santier.id));
                      onTypeChange("santier");
                      setOpen(false);
                    }}
                  >
                    <span className="h-7 w-7 shrink-0 rounded-sm border border-border" style={{ backgroundColor: color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-foreground">{getSantierName(santier)}</span>
                      <span className="block truncate text-xs font-semibold text-muted-foreground">{santier.companie_nume || santier.filiala_nume || santier.adresa || "Șantier activ"}</span>
                    </span>
                    <StockBadge variants={selectedVariants} qtyById={santiereQtyById?.[String(santier.id)]} />
                    {selected ? <FontAwesomeIcon icon={faCheck} className="shrink-0 text-primary" /> : null}
                  </button>
                );
              })}

              {sortedSantiere.length === 0 ? <div className="px-3 py-6 text-center text-sm font-semibold text-muted-foreground">Niciun șantier activ.</div> : null}
            </div>
          </PopoverContent>
        </Popover>

        {allowUser ? (
          <Popover open={userOpen} onOpenChange={setUserOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className={cn(locationButtonClass(type === "user"), "min-w-[12rem] justify-between gap-2")} onClick={() => onTypeChange("user")}>
                <span className="flex min-w-0 items-center gap-2">
                  <ImagePreviewTooltip
                    src={selectedUser?.photo_url ? `${photoAPI}/${selectedUser.photo_url}` : null}
                    alt={selectedUser?.name || selectedUser?.email || "Persoană"}
                    fallback={
                      <span className="flex h-full w-full items-center justify-center bg-muted text-xs font-black text-muted-foreground">
                        {selectedUser ? getUserInitials(selectedUser.name || selectedUser.email) : <FontAwesomeIcon icon={faUser} />}
                      </span>
                    }
                    containerClassName="h-5 w-5 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden"
                    ringColor="hover:ring-primary"
                  />
                  <span className="min-w-0 truncate">{selectedUser ? selectedUser.name || selectedUser.email : "Alege persoana"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {selectedUser ? <StockBadge variants={selectedVariants} qtyById={usersQtyById?.[String(userId)]} noBg /> : null}
                  <FontAwesomeIcon icon={faChevronDown} className="shrink-0 text-xs" />
                </span>
              </Button>
            </PopoverTrigger>

            <PopoverContent align="start" side="bottom" avoidCollisions={false} className="w-[22rem] p-2" onWheel={(event) => event.stopPropagation()}>
              <div className="relative mb-2">
                <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                <Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Caută persoană..." className="h-8 bg-background pl-7 text-sm" />
              </div>

              <div className="rounded-md border">
                {sortedUsers.length > 0 ? (
                  <Virtuoso
                    style={{ height: Math.min(Math.max(sortedUsers.length, 1) * 49, 288), overflowY: "auto" }}
                    data={sortedUsers}
                    overscan={160}
                    increaseViewportBy={160}
                    itemContent={(_, item) => {
                      const selected = String(item.id) === String(userId);

                      return (
                        <button
                          type="button"
                          className="flex h-[49px] w-full items-center gap-2 border-b px-2 py-1.5 text-left last:border-b-0 hover:bg-accent"
                          onClick={() => {
                            onUserChange(String(item.id));
                            onTypeChange("user");
                            setUserOpen(false);
                          }}
                        >
                          <ImagePreviewTooltip
                            src={item.photo_url ? `${photoAPI}/${item.photo_url}` : null}
                            alt={item.name || item.email || "Persoană"}
                            fallback={
                              <span className="flex h-full w-full items-center justify-center bg-muted text-xs font-black text-muted-foreground">{getUserInitials(item.name || item.email)}</span>
                            }
                            containerClassName="h-8 w-8 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden"
                            ringColor="hover:ring-primary"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-foreground">{item.name || item.email || `Utilizator ${item.id}`}</span>
                            <span className="block truncate text-xs font-semibold text-muted-foreground">{item.email || item.specializare || "Utilizator activ"}</span>
                          </span>
                          <StockBadge variants={selectedVariants} qtyById={usersQtyById?.[String(item.id)]} />
                          {selected ? <FontAwesomeIcon icon={faCheck} className="shrink-0 text-primary" /> : null}
                        </button>
                      );
                    }}
                  />
                ) : (
                  <div className="px-3 py-6 text-center text-sm font-semibold text-muted-foreground">Nicio persoană activă.</div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}

function UserSearchSelect({ label, value, onChange, options, includeNone = false, active = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedUser = useMemo(() => options.find((option) => String(option.id) === String(value)), [options, value]);
  const filteredOptions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((item) => [item.name, item.email, item.specializare].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
  }, [options, search]);
  const listHeight = Math.min(Math.max(filteredOptions.length, 1) * 49, 288);

  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 w-full justify-between gap-2 px-2 text-left", active ? "border-primary bg-primary/15 text-primary hover:bg-primary/25" : "bg-card hover:bg-accent")}
          >
            <span className="flex min-w-0 items-center gap-2">
              <ImagePreviewTooltip
                src={selectedUser?.photo_url ? `${photoAPI}/${selectedUser.photo_url}` : null}
                alt={selectedUser?.name || selectedUser?.email || "Persoană"}
                fallback={
                  <span className="flex h-full w-full items-center justify-center bg-muted text-xs font-black text-muted-foreground">
                    {value && value !== "none" ? getUserInitials(selectedUser?.name || selectedUser?.email) : <FontAwesomeIcon icon={faUser} />}
                  </span>
                }
                containerClassName="h-6 w-6 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden"
                ringColor="hover:ring-primary"
              />
              <span className={cn("min-w-0 truncate text-sm font-black", active ? "text-primary" : "text-foreground")}>
                {value === "none" || !value ? "Fără persoană" : selectedUser?.name || selectedUser?.email || "Selectează persoana"}
              </span>
            </span>
            <FontAwesomeIcon icon={faChevronDown} className="shrink-0 text-xs text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" side="bottom" avoidCollisions={false} className="w-[20rem] p-2" onWheel={(event) => event.stopPropagation()}>
          <div className="relative mb-2">
            <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută persoană..." className="h-8 bg-background pl-7 text-sm" />
          </div>

          <div className="rounded-md border">
            {includeNone ? (
              <button
                type="button"
                className="flex w-full items-center justify-between border-b px-2 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange("none");
                  setOpen(false);
                }}
              >
                <span className="font-semibold text-muted-foreground">Fără persoană</span>
                {value === "none" || !value ? <FontAwesomeIcon icon={faCheck} className="text-primary" /> : null}
              </button>
            ) : null}

            {filteredOptions.length > 0 ? (
              <Virtuoso
                style={{ height: listHeight, overflowY: "auto" }}
                data={filteredOptions}
                overscan={160}
                increaseViewportBy={160}
                itemContent={(_, item) => {
                  const selected = String(item.id) === String(value);

                  return (
                    <button
                      type="button"
                      className="flex h-[49px] w-full items-center gap-2 border-b px-2 py-1.5 text-left last:border-b-0 hover:bg-accent"
                      onClick={() => {
                        onChange(String(item.id));
                        setOpen(false);
                      }}
                    >
                      <ImagePreviewTooltip
                        src={item.photo_url ? `${photoAPI}/${item.photo_url}` : null}
                        alt={item.name || item.email || "Persoană"}
                        fallback={<span className="flex h-full w-full items-center justify-center bg-muted text-xs font-black text-muted-foreground">{getUserInitials(item.name || item.email)}</span>}
                        containerClassName="h-8 w-8 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden"
                        ringColor="hover:ring-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-foreground">{item.name || item.email || `Utilizator ${item.id}`}</span>
                        <span className="block truncate text-xs font-semibold text-muted-foreground">{item.email || item.specializare || "Utilizator activ"}</span>
                      </span>
                      {selected ? <FontAwesomeIcon icon={faCheck} className="shrink-0 text-primary" /> : null}
                    </button>
                  );
                }}
              />
            ) : (
              <div className="px-3 py-6 text-center text-sm font-semibold text-muted-foreground">Nicio persoană activă.</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function InventarStocTranzactieDialog({
  open,
  setOpen,
  selectedItems = [],
  inventar = null,
  tipResursa = "material",
  defaultSource = null,
  defaultDestination = null,
  onAddItems = null,
  onSaved = null,
}) {
  const { user } = useContext(AuthContext);
  const config = resurseConfig[tipResursa] || resurseConfig.material;
  const { data: conturiData } = useConturi("");
  const { data: santiereData } = useSantiereByCompany(null);
  const { mutateAsync: saveInventarTranzactie, isPending: saving } = useSaveInventarTranzactie();
  const [sourceType, setSourceType] = useState("cumparare");
  const [sourceSantierId, setSourceSantierId] = useState("");
  const [sourceUserId, setSourceUserId] = useState("");
  const [destinationType, setDestinationType] = useState("inventar");
  const [destinationSantierId, setDestinationSantierId] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("none");
  const [assignedUserId, setAssignedUserId] = useState("none");
  const [assignedUserAsDestination, setAssignedUserAsDestination] = useState(false);
  const [lines, setLines] = useState({});
  const [removedLineKeys, setRemovedLineKeys] = useState(new Set());

  const activeUserOptions = useMemo(() => (conturiData?.conturi || []).filter((item) => isActiveValue(item?.activ)), [conturiData?.conturi]);
  const allowUserLocation = tipResursa === "utilaj";
  const showStatus = tipResursa === "utilaj";

  // Grila tabelului — o coloană în plus (Status) doar pentru utilaje.
  const transactionGridTemplate = showStatus
    ? "grid-cols-[2.4rem_3rem_minmax(12rem,1.2fr)_4.5rem_minmax(7rem,.65fr)_minmax(7rem,.65fr)_minmax(6rem,.5fr)_minmax(24rem,1fr)_2rem_minmax(24rem,1fr)]"
    : "grid-cols-[2.4rem_3rem_minmax(12rem,1.2fr)_4.5rem_minmax(7rem,.65fr)_minmax(7rem,.65fr)_minmax(24rem,1fr)_2rem_minmax(24rem,1fr)]";

  const activeSantiere = useMemo(() => {
    const rows = Array.isArray(santiereData?.santiere) ? santiereData.santiere : Array.isArray(santiereData) ? santiereData : [];
    return rows.filter((item) => isActiveValue(item?.activ)).sort((a, b) => getSantierName(a).localeCompare(getSantierName(b), "ro"));
  }, [santiereData]);
  const selectedItemsSignature = useMemo(() => (selectedItems || []).map((item) => getLineKey(item)).join("|"), [selectedItems]);

  const normalizedItems = useMemo(() => {
    const seen = new Set();
    return (selectedItems || [])
      .filter((item) => item?.sub && item?.parent)
      .filter((item) => {
        const key = getLineKey(item);
        if (removedLineKeys.has(key)) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [removedLineKeys, selectedItems]);
  const selectedSubcategorieIds = useMemo(() => normalizedItems.map((item) => Number(item?.sub?.id)).filter((id) => Number.isInteger(id) && id > 0), [normalizedItems]);
  const { data: stocLocatiiData } = useInventarStocLocatii(inventar?.id, selectedSubcategorieIds);

  const getStockBucketForItem = (item) => stocLocatiiData?.items?.[String(item?.sub?.id)] || null;

  // Toate variantele selectate (id + nume) — afișate în popover-ul de stoc, inclusiv cele cu 0.
  const selectedVariants = useMemo(() => normalizedItems.map((item) => ({ id: String(item?.sub?.id), name: getVariantTitle(item) })), [normalizedItems]);

  // Cantitatea din magazie pe variantă: { [subId]: qty } (doar variantele cu stoc > 0).
  const inventarQtyById = useMemo(() => {
    const map = {};
    normalizedItems.forEach((item) => {
      const subId = String(item?.sub?.id);
      const qty = getStockValue(stocLocatiiData?.items?.[subId]?.inventar);
      if (qty > 0) map[subId] = qty;
    });
    return map;
  }, [normalizedItems, stocLocatiiData]);

  // Cantitatea pe fiecare șantier și variantă: { [santierId]: { [subId]: qty } }.
  const santiereQtyById = useMemo(() => {
    const map = {};
    normalizedItems.forEach((item) => {
      const subId = String(item?.sub?.id);
      const santiere = stocLocatiiData?.items?.[subId]?.santiere || {};
      Object.entries(santiere).forEach(([santierId, value]) => {
        const qty = getStockValue(value);
        if (qty <= 0) return;
        if (!map[santierId]) map[santierId] = {};
        map[santierId][subId] = qty;
      });
    });
    return map;
  }, [normalizedItems, stocLocatiiData]);
  const usersQtyById = useMemo(() => {
    const map = {};
    normalizedItems.forEach((item) => {
      const subId = String(item?.sub?.id);
      const users = stocLocatiiData?.items?.[subId]?.users || {};
      Object.entries(users).forEach(([userId, value]) => {
        const qty = getStockValue(value);
        if (qty <= 0) return;
        if (!map[userId]) map[userId] = {};
        map[userId][subId] = qty;
      });
    });
    return map;
  }, [normalizedItems, stocLocatiiData]);

  const getInventoryStockForItem = (item) => {
    const bucket = getStockBucketForItem(item);
    if (bucket) return getStockValue(bucket.inventar);
    return getStockValue(item.sub?.stoc_inventar, item.sub?.stocInventar, item.sub?.stoc_total);
  };

  const getLocationStockInfo = (item, type, santierId, userId) => {
    if (type === "cumparare") {
      return { stock: null, exists: true, unlimited: true, label: "Nelimitat" };
    }

    const bucket = getStockBucketForItem(item);

    if (type === "inventar") {
      const stock = getInventoryStockForItem(item);
      const exists = bucket ? !!bucket.inventar_exists : stock > 0;
      return { stock, exists, unlimited: false, label: exists ? formatNumber(stock) : "Nu există" };
    }

    if (type === "santier") {
      if (!santierId) return { stock: null, exists: false, unlimited: false, label: "Alege șantier" };
      const rawValue = bucket?.santiere?.[String(santierId)];
      const exists = rawValue !== undefined && rawValue !== null;
      const stock = exists ? getStockValue(rawValue) : 0;
      return { stock, exists, unlimited: false, label: exists ? formatNumber(stock) : "Nu există" };
    }

    if (type === "user") {
      if (!userId) return { stock: null, exists: false, unlimited: false, label: "Alege persoană" };
      const rawValue = bucket?.users?.[String(userId)];
      const exists = rawValue !== undefined && rawValue !== null;
      const stock = exists ? getStockValue(rawValue) : 0;
      return { stock, exists, unlimited: false, label: exists ? formatNumber(stock) : "Nu există" };
    }

    return { stock: null, exists: false, unlimited: false, label: EMPTY };
  };

  const assignedDestinationUserId = allowUserLocation && assignedUserAsDestination && assignedUserId && assignedUserId !== "none" ? assignedUserId : "";
  const effectiveDestinationType = assignedDestinationUserId ? "user" : destinationType;
  const effectiveDestinationSantierId = effectiveDestinationType === "santier" ? destinationSantierId : "";
  const effectiveDestinationUserId = effectiveDestinationType === "user" ? assignedDestinationUserId : "";

  const getSourceStockForItem = (item) => {
    const info = getLocationStockInfo(item, sourceType, sourceSantierId, sourceUserId);
    return info.unlimited ? null : info.stock;
  };

  const getDestinationStockForItem = (item) => {
    const info = getLocationStockInfo(item, effectiveDestinationType, effectiveDestinationSantierId, effectiveDestinationUserId);
    return info.stock;
  };

  const getSourceStockLabel = (item) => {
    return getLocationStockInfo(item, sourceType, sourceSantierId, sourceUserId).label;
  };

  const getDestinationStockLabel = (item) => {
    return getLocationStockInfo(item, effectiveDestinationType, effectiveDestinationSantierId, effectiveDestinationUserId).label;
  };

  const getSourceProblemForItem = (item) => {
    const info = getLocationStockInfo(item, sourceType, sourceSantierId, sourceUserId);
    if (info.unlimited) return false;
    return !info.exists || getStockValue(info.stock) <= 0;
  };

  const sameLocationSelected =
    sourceType !== "cumparare" &&
    sourceType === effectiveDestinationType &&
    (sourceType === "santier"
      ? String(sourceSantierId || "") === String(effectiveDestinationSantierId || "")
      : sourceType === "user"
        ? String(sourceUserId || "") === String(effectiveDestinationUserId || "")
        : true);

  const sourceMissing = sourceType === "santier" && !sourceSantierId;
  const destinationMissing = effectiveDestinationType === "santier" && !effectiveDestinationSantierId;
  const destinationUserMissing = assignedUserAsDestination && (!assignedUserId || assignedUserId === "none");
  const sourceUserMissing = sourceType === "user" && !sourceUserId;

  useEffect(() => {
    if (!open) return;
    setRemovedLineKeys(new Set());
  }, [open, selectedItemsSignature]);

  useEffect(() => {
    if (!open) return;

    // Pe șantier, sursa implicită este chiar acel șantier (mutăm stoc DIN șantier); altfel cumpărare → magazie.
    const initialSourceType = defaultSource?.type || "cumparare";
    const initialSourceSantierId = defaultSource?.type === "santier" && defaultSource?.santierId ? String(defaultSource.santierId) : "";
    const initialSourceUserId = defaultSource?.type === "user" && defaultSource?.userId ? String(defaultSource.userId) : "";
    const initialDestinationType = defaultDestination?.type === "user" ? "inventar" : defaultDestination?.type || "inventar";
    const initialDestinationSantierId = defaultDestination?.type === "santier" && defaultDestination?.santierId ? String(defaultDestination.santierId) : "";

    setSourceType(initialSourceType);
    setSourceSantierId(initialSourceSantierId);
    setSourceUserId(initialSourceUserId);
    setDestinationType(initialDestinationType);
    setDestinationSantierId(initialDestinationSantierId);
    setResponsibleUserId(user?.id ? String(user.id) : "none");
    setAssignedUserId(defaultDestination?.type === "user" && defaultDestination?.userId ? String(defaultDestination.userId) : "none");
    setAssignedUserAsDestination(allowUserLocation && defaultDestination?.type === "user" && !!defaultDestination?.userId);
  }, [
    open,
    user?.id,
    allowUserLocation,
    selectedItemsSignature,
    defaultSource?.type,
    defaultSource?.santierId,
    defaultSource?.userId,
    defaultDestination?.type,
    defaultDestination?.santierId,
    defaultDestination?.userId,
  ]);

  useEffect(() => {
    if (!open) return;

    setLines((prev) => {
      const next = {};
      normalizedItems.forEach((item) => {
        const key = getLineKey(item);
        next[key] = prev[key] || getDefaultDraftLine();
      });
      return next;
    });
  }, [normalizedItems, open]);

  const handleRemoveLine = (item) => {
    const key = getLineKey(item);
    if (!key) return;

    setRemovedLineKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setLines((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    setLines((prev) => {
      let changed = false;
      const next = { ...prev };

      normalizedItems.forEach((item) => {
        const key = getLineKey(item);
        const current = next[key] || getDefaultDraftLine();
        const available = getSourceStockForItem(item);
        const currentValue = parseNumber(current.cantitate);

        if (available !== null && current.cantitate !== "" && currentValue > available) {
          next[key] = { ...current, cantitate: String(available) };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [sourceType, sourceSantierId, sourceUserId, normalizedItems, stocLocatiiData]);

  const updateQuantity = (item, rawValue) => {
    const key = getLineKey(item);
    const cleaned = rawValue.replace(",", ".").replace(/[^\d.]/g, "");
    const available = getSourceStockForItem(item);
    const numeric = Number(cleaned);
    const nextValue = available !== null && Number.isFinite(numeric) && numeric > available ? String(available) : cleaned;

    setLines((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || getDefaultDraftLine()),
        cantitate: nextValue,
      },
    }));
  };

  const handleDestinationTypeChange = (nextType) => {
    setDestinationType(nextType);
    setAssignedUserAsDestination(false);
  };

  const handleAssignedUserChange = (nextUserId) => {
    setAssignedUserId(nextUserId);
    if (!nextUserId || nextUserId === "none") {
      setAssignedUserAsDestination(false);
    }
  };

  const handleUseAssignedUserAsDestination = () => {
    if (!allowUserLocation) return;

    if (!assignedUserId || assignedUserId === "none") {
      toast.warning("Alege persoana asignată înainte.", { position: "top-right" });
      return;
    }

    setAssignedUserAsDestination(true);
  };

  // Inversează tranzacția: ce era sursă devine destinație și invers. Cumpărarea nu poate deveni destinație.
  const handleReverseTransaction = () => {
    if (sourceType === "cumparare") {
      toast.warning("Cumpărarea nu poate fi inversată.", { position: "top-right" });
      return;
    }

    const prevDestType = effectiveDestinationType;
    const prevDestSantierId = effectiveDestinationSantierId;
    const prevDestUserId = effectiveDestinationUserId;
    const prevSourceType = sourceType;
    const prevSourceSantierId = sourceSantierId;
    const prevSourceUserId = sourceUserId;

    // Sursă nouă = fosta destinație.
    setSourceType(prevDestType);
    setSourceSantierId(prevDestType === "santier" ? String(prevDestSantierId || "") : "");
    setSourceUserId(prevDestType === "user" ? String(prevDestUserId || "") : "");

    // Destinație nouă = fosta sursă. Persoana se modelează prin „asignat ca destinație".
    if (prevSourceType === "user") {
      setAssignedUserId(String(prevSourceUserId || "none"));
      setAssignedUserAsDestination(true);
      setDestinationType("inventar");
      setDestinationSantierId("");
    } else {
      setAssignedUserAsDestination(false);
      setDestinationType(prevSourceType);
      setDestinationSantierId(prevSourceType === "santier" ? String(prevSourceSantierId || "") : "");
    }
  };

  const buildPayload = () => {
    const inventarId = toPositiveInt(inventar?.id);

    if (!inventarId) {
      toast.error("Inventar invalid pentru tranzacție.", { position: "top-right" });
      return null;
    }

    if (sourceMissing) {
      toast.warning("Alege șantierul sursă.", { position: "top-right" });
      return null;
    }

    if (sourceUserMissing) {
      toast.warning("Alege persoana sursă.", { position: "top-right" });
      return null;
    }

    if (destinationMissing) {
      toast.warning("Alege șantierul destinație.", { position: "top-right" });
      return null;
    }

    if (destinationUserMissing) {
      toast.warning("Alege persoana destinație.", { position: "top-right" });
      return null;
    }

    if (!allowUserLocation && (sourceType === "user" || effectiveDestinationType === "user")) {
      toast.warning("Persoana poate fi folosită ca locație doar la utilaje.", { position: "top-right" });
      return null;
    }

    if (sameLocationSelected) {
      toast.warning("Sursa și destinația nu pot fi aceeași locație.", { position: "top-right" });
      return null;
    }

    const payloadLines = buildSavableLines({ notifyInvalidIds: true });

    if (payloadLines.length === 0) {
      toast.warning("Nu există nicio linie cu cantitate validă și stoc suficient.", { position: "top-right" });
      return null;
    }

    return {
      inventar_id: inventarId,
      source: {
        type: sourceType,
        santier_id: sourceType === "santier" ? Number(sourceSantierId) : null,
        user_id: sourceType === "user" ? Number(sourceUserId) : null,
      },
      destination: {
        type: effectiveDestinationType,
        santier_id: effectiveDestinationType === "santier" ? Number(effectiveDestinationSantierId) : null,
        user_id: effectiveDestinationType === "user" ? Number(effectiveDestinationUserId) : null,
      },
      responsabil_user_id: responsibleUserId && responsibleUserId !== "none" ? Number(responsibleUserId) : null,
      assigned_user_id: assignedUserId && assignedUserId !== "none" ? Number(assignedUserId) : null,
      lines: payloadLines,
    };
  };

  function buildSavableLines({ notifyInvalidIds = false } = {}) {
    return normalizedItems
      .map((item, index) => {
        const key = getLineKey(item);
        const cantitate = parseNumber(lines[key]?.cantitate);

        if (!Number.isFinite(cantitate) || cantitate <= 0) return null;

        const catalogDefinitieId = getItemDefinitionId(item);
        const catalogSubcategorieId = getItemSubcategorieId(item);
        const sourceStock = getSourceStockForItem(item);

        if (!catalogDefinitieId || !catalogSubcategorieId) {
          if (notifyInvalidIds) {
            toast.error(`Linia ${index + 1}: varianta nu are ID-uri valide.`, { position: "top-right" });
          }
          return null;
        }

        if (sourceStock !== null && (!sourceStock || cantitate > sourceStock)) return null;

        return {
          catalog_definitie_id: catalogDefinitieId,
          catalog_subcategorie_id: catalogSubcategorieId,
          cantitate,
        };
      })
      .filter(Boolean);
  }

  const savableLineCount = buildSavableLines().length;
  const saveDisabled = saving || normalizedItems.length === 0 || sourceMissing || destinationMissing || destinationUserMissing || sourceUserMissing || sameLocationSelected || savableLineCount === 0;

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      const response = await saveInventarTranzactie(payload);
      toast.success(response?.message || "Tranzacția de stoc a fost salvată.", { position: "top-right" });
      setOpen(false);
      onSaved?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la salvarea tranzacției de stoc.", { position: "top-right" });
    }
  };

  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection flex min-h-[50vh] max-h-[76vh] max-w-[65vw] flex-col gap-0  p-0">
        <DialogHeader className="shrink-0 rounded-t-md border-b bg-muted px-5 py-4">
          <div className="flex items-center justify-between gap-3 pr-9">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/50 bg-primary/10 text-primary">
                <FontAwesomeIcon icon={faRightLeft} className="text-base" />
              </span>
              <DialogTitle className="text-left text-xl font-black text-foreground">Tranzacție stoc</DialogTitle>
              <Badge variant="outline" className="h-8 border-primary bg-primary/10 px-3 text-sm font-black text-primary">
                {normalizedItems.length} {normalizedItems.length === 1 ? "variantă" : "variante"}
              </Badge>
            </div>

            {onAddItems && (
              <Button type="button" className={`h-9 gap-2 px-3 text-sm font-semibold text-white ${config.hoverButton}`} onClick={onAddItems}>
                <FontAwesomeIcon icon={faPlus} className="text-sm" />
                Adaugă {config.title.toLowerCase()}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-3">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] items-stretch gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(11rem,.48fr)] gap-2.5">
                    <LocationField
                      label="De la"
                      type={sourceType}
                      santierId={sourceSantierId}
                      userId={sourceUserId}
                      onTypeChange={setSourceType}
                      onSantierChange={setSourceSantierId}
                      onUserChange={setSourceUserId}
                      santiere={activeSantiere}
                      users={activeUserOptions}
                      allowPurchase
                      allowUser={allowUserLocation}
                      selectedVariants={selectedVariants}
                      inventarQtyById={inventarQtyById}
                      santiereQtyById={santiereQtyById}
                      usersQtyById={usersQtyById}
                    />

                    <UserSearchSelect label="Responsabil" value={responsibleUserId} onChange={setResponsibleUserId} options={activeUserOptions} />
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReverseTransaction}
                    disabled={sourceType === "cumparare"}
                    title={sourceType === "cumparare" ? "Cumpărarea nu poate fi inversată" : "Inversează sursa și destinația"}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 p-0 text-primary shadow-sm transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faRightLeft} className="text-xl" />
                  </Button>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(11rem,.48fr)] gap-2.5">
                    <LocationField
                      label="Către"
                      type={assignedUserAsDestination ? "" : destinationType}
                      santierId={destinationSantierId}
                      onTypeChange={handleDestinationTypeChange}
                      onSantierChange={setDestinationSantierId}
                      santiere={activeSantiere}
                      selectedVariants={selectedVariants}
                      inventarQtyById={inventarQtyById}
                      santiereQtyById={santiereQtyById}
                    />

                    <div className={cn("min-w-0", allowUserLocation ? "grid grid-cols-[minmax(0,1fr)_2.25rem] items-end gap-1.5" : "")}>
                      <UserSearchSelect
                        label="Persoană asignată"
                        value={assignedUserId}
                        onChange={handleAssignedUserChange}
                        options={activeUserOptions}
                        includeNone
                        active={assignedUserAsDestination}
                      />
                      {allowUserLocation ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleUseAssignedUserAsDestination}
                          title={assignedUserAsDestination ? "Către persoană" : "Setează persoana ca destinație"}
                          className={cn(
                            "h-9 w-9 shrink-0 justify-center p-0 text-xs font-black",
                            assignedUserAsDestination ? "border-primary bg-primary/15 text-primary hover:bg-primary/25" : "bg-card text-foreground hover:bg-accent",
                          )}
                        >
                          <FontAwesomeIcon icon={faUser} className="text-xs" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-auto rounded-md border">
                <div className="min-w-[92rem]">
                  <div className={`grid ${transactionGridTemplate} items-center gap-2 border-b bg-muted/30 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-foreground`}>
                    <span className="text-center">#</span>
                    <span className="text-center">Poză</span>
                    <span>Variantă</span>
                    <span className="text-center">U.M.</span>
                    <span>Furnizor</span>
                    <span>Marcă</span>
                    {showStatus && <span className="text-center">Status</span>}
                    <span className="text-center">Stoc sursă - Cantitate = Rămâne</span>
                    <span />
                    <span className="text-center">Stoc către + Cantitate = Primește</span>
                  </div>

                  <div className="divide-y">
                    {normalizedItems.length === 0 && (
                      <div className="flex min-h-[10rem]  items-center justify-center px-3 py-8 text-sm font-semibold text-muted-foreground">Nu există variante selectate.</div>
                    )}

                    {normalizedItems.map((item, index) => {
                      const key = getLineKey(item);
                      const line = lines[key] || getDefaultDraftLine();
                      const qty = parseNumber(line.cantitate);
                      const sourceStock = getSourceStockForItem(item);
                      const destinationStock = getDestinationStockForItem(item);
                      const remainingStock = sourceStock === null ? null : Math.max(sourceStock - qty, 0);
                      const receivedStock = destinationStock === null ? null : getStockValue(destinationStock) + qty;
                      const unitate = item.parent?.unitate_masura || "U";
                      const sourceProblem = getSourceProblemForItem(item);
                      const metaParts = getMetaParts(item);
                      const photoUrl = getItemPhotoUrl(item);

                      const rowNode = (
                        <div className={cn(`grid ${transactionGridTemplate} items-center gap-2 px-3 py-2 hover:bg-muted/30`, sourceProblem ? "opacity-55" : "")}>
                          <span className="mx-auto flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-black text-primary-foreground">{index + 1}</span>

                          <div className="flex justify-center">
                            <ImagePreviewTooltip
                              src={photoUrl ? `${photoAPI}/${photoUrl}` : NoImage}
                              alt={getVariantTitle(item)}
                              fallback=""
                              containerClassName="h-9 w-9 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden"
                              ringColor="hover:ring-primary"
                            />
                          </div>

                          <OverflowTooltip text={getVariantTitle(item)} align="left" className="block min-w-0 truncate text-sm font-black text-foreground" maxLines={1} />

                          <div className="flex justify-center">
                            <Badge variant="outline" className="h-6 shrink-0 px-2 text-xs font-black">
                              {unitate}
                            </Badge>
                          </div>

                          <OverflowTooltip text={metaParts.furnizor} align="left" className="block truncate text-xs font-semibold text-foreground" maxLines={1} />
                          <OverflowTooltip text={metaParts.marca} align="left" className="block truncate text-xs font-semibold text-foreground" maxLines={1} />

                          {showStatus && (
                            <div className="flex justify-center">
                              <Badge variant="outline" className="h-6 max-w-full truncate px-2 text-xs font-black">
                                {getItemStatus(item) || EMPTY}
                              </Badge>
                            </div>
                          )}

                          <div className="grid grid-cols-[5.75rem_1rem_6.75rem_1rem_5.75rem] items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1">
                            <span className={cn("text-center text-sm font-black", sourceProblem ? "text-red-600 dark:text-red-400" : "text-foreground")}>{getSourceStockLabel(item)}</span>
                            <span className="text-center text-sm font-black text-muted-foreground">-</span>
                            <Input
                              value={line.cantitate}
                              onChange={(event) => updateQuantity(item, event.target.value)}
                              placeholder="0,00"
                              className="h-7 border-red-500/70 bg-red-500/15 px-1 text-center text-sm font-black text-red-700 placeholder:text-red-700/50 focus-visible:ring-red-500 dark:bg-red-500/20 dark:text-red-300"
                            />
                            <span className="text-center text-sm font-black text-muted-foreground">=</span>
                            <span className="text-center text-sm font-black text-amber-700 dark:text-amber-300">{remainingStock === null ? EMPTY : formatNumber(remainingStock)}</span>
                          </div>

                          <div className="flex justify-center text-sm font-black text-muted-foreground">→</div>

                          <div className="grid grid-cols-[5.75rem_1rem_6.75rem_1rem_5.75rem] items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1">
                            <span className="text-center text-sm font-black text-foreground">{getDestinationStockLabel(item)}</span>
                            <span className="text-center text-sm font-black text-muted-foreground">+</span>
                            <span className="flex h-7 items-center justify-center rounded-md border border-emerald-500/70 bg-emerald-500/20 px-1 text-center text-sm font-black text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200">
                              {formatNumber(qty)}
                            </span>
                            <span className="text-center text-sm font-black text-muted-foreground">=</span>
                            <span className="text-center text-sm font-black text-primary">{receivedStock === null ? EMPTY : formatNumber(receivedStock)}</span>
                          </div>
                        </div>
                      );

                      return (
                        <ContextMenu key={key}>
                          <ContextMenuTrigger asChild>{rowNode}</ContextMenuTrigger>
                          <ContextMenuContent className="w-44">
                            <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => handleRemoveLine(item)}>
                              <FontAwesomeIcon icon={faTrash} className="text-sm" />
                              Elimină
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-muted/20 px-4 py-3">
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs font-semibold text-muted-foreground"></span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Închide
              </Button>
              <Button onClick={handleSave} disabled={saveDisabled}>
                {saving ? "Se salvează..." : "Salvează tranzacția"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
