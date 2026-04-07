import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faTrash,
  faEllipsis,
  faClock,
  faEnvelope,
  faPhone,
  faUserTie,
  faShield,
  faBuilding,
  faToggleOn,
  faToggleOff,
  faCalendar,
  faChainSlash,
  faChain,
} from "@fortawesome/free-solid-svg-icons";
import photoApi from "@/api/photoAPI";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableVirtuoso, Virtuoso } from "react-virtuoso";

const getContrastColor = (hexColor) => {
  if (!hexColor) return "white";
  // Eliminăm # dacă există
  const color = hexColor.replace("#", "");
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  // Calculăm luminozitatea (formula standard YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "black" : "white";
};

const formatPhoneDisplay = (raw) => {
  if (!raw) return null;
  const formats = [
    { prefix: "+373", mask: "+### ## ### ###" },
    { prefix: "+40", mask: "+## ### ### ###" },
    { prefix: "+33", mask: "+## # ## ## ## ##" },
    { prefix: "+44", mask: "+## #### ######" },
  ];
  const found = formats.find((f) => raw.startsWith(f.prefix));
  if (!found) return raw;

  const digits = raw.replace(/\D/g, ""); // all digits including country code
  let di = 0;
  let out = "";
  for (const ch of found.mask) {
    if (ch === "#") {
      if (di < digits.length) out += digits[di++];
      else break;
    } else {
      out += ch;
    }
  }
  return out;
};

const formatDateTime = (str) => {
  if (!str) return "—";
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "short", timeStyle: "short" }).format(new Date(str));
};

const formatDate = (str) => {
  if (!str) return "—";
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "short" }).format(new Date(str));
};

// ── Define OUTSIDE the component, at module level ──────────────────────────
const virtuosoComponents = {
  Table: (props) => <table {...props} className="w-full table-auto caption-bottom text-left min-w-max" />,
  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  // NOTE: TableRow cannot access `conturi` here since it's outside the component.
  // Pass data via the `context` prop instead (see below).
  TableRow: (props) => {
    const index = props["data-index"];
    const cont = props.context?.conturi?.[index];
    if (!cont) return <TableRow {...props} />;

    const opacityClass = cont.activ ? "opacity-100" : "opacity-80 grayscale-[0.25]";

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TableRow {...props} className={`cursor-pointer ${opacityClass} hover:bg-muted h-20 md:h-24 xl:h-28 transition-colors border-b`}>
            {props.children}
          </TableRow>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={!cont.activ} className="gap-2 text-primary focus:text-primary font-semibold" onClick={() => props.context?.handleAtribuiriClick(cont?.id)}>
            <FontAwesomeIcon icon={faChain} /> Atribuiri
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="gap-2" onClick={() => navigator.clipboard.writeText(cont.email || "")}>
            <FontAwesomeIcon icon={faEnvelope} /> Copiază Email
          </ContextMenuItem>
          <ContextMenuItem className="gap-2" onClick={() => navigator.clipboard.writeText(cont.telephone || "")}>
            <FontAwesomeIcon icon={faPhone} /> Copiază Telefon
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="gap-2" onClick={() => props.context?.handleEdit(cont)}>
            <FontAwesomeIcon icon={faPenToSquare} /> Editează
          </ContextMenuItem>
          <ContextMenuItem className="text-destructive gap-2 focus:text-destructive" onClick={() => props.context?.handleDeleteClick({ id: cont.id, nume: cont.name })}>
            <FontAwesomeIcon icon={faTrash} /> Șterge
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function UtilizatoriList({ conturi = [], visibleColumns = {}, handleEdit, handleDeleteClick, isCardView = false, handleAtribuiriClick }) {
  const containerRef = useRef(null);
  const scrollPosRef = useRef(0);

  const getGridCols = () => {
    const w = window.innerWidth;
    if (w >= 1536) return 5; // 2xl
    if (w >= 1280) return 4; // xl
    if (w >= 1024) return 3; // lg
    if (w >= 640) return 2; // sm
    return 1;
  };

  const [gridCols, setGridCols] = useState(getGridCols);

  useEffect(() => {
    const onResize = () => setGridCols(getGridCols());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const gridRowCount = Math.ceil(conturi.length / gridCols);

  const rowVirtualizer = useVirtualizer({
    count: isCardView ? gridRowCount : conturi.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => (isCardView ? 450 : 80), // 450px pt rând de carduri, 80px pt rând tabel
    overscan: 10,
  });

  const handleScroll = (e) => {
    scrollPosRef.current = e.target.scrollTop;
  };

  useLayoutEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = scrollPosRef.current;
  }, [conturi]);

  const showCol = (key) => visibleColumns[key] !== false;

  const virtuosoContext = React.useMemo(() => {
    return {
      conturi,
      handleEdit,
      handleDeleteClick,
      handleAtribuiriClick,
    };
  }, [conturi, handleEdit, handleDeleteClick, handleAtribuiriClick]);

  if (isCardView) {
    return (
      <div ref={containerRef} onScroll={handleScroll} className="w-full h-full overflow-auto p-2">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIndex = virtualRow.index * gridCols;
            const rowItems = conturi.slice(startIndex, startIndex + gridCols);

            return (
              <div
                key={virtualRow.key}
                className={`absolute top-0 left-0 w-full p-2 grid grid-cols-1  md:grid-cols-2  lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4`}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {rowItems.map((cont) => {
                  const initials = `${cont.name?.[0] ?? ""}`.toUpperCase();
                  const cardOpacity = cont.activ ? "opacity-100" : "opacity-80 grayscale-[0.25]";

                  return (
                    <Card key={cont.id} className={`group flex flex-col justify-between shadow-base   border-4 border-border transition-all duration-200 bg-card hover:shadow-md ${cardOpacity}`}>
                      <CardContent className="p-4 pb-3 flex-1">
                        {/* Header */}
                        <div className="flex gap-4 mb-4">
                          <div className="relative shrink-0">
                            <Avatar className="h-16 w-16 rounded-lg border border-border">
                              <AvatarImage src={cont.photo_url ? `${photoApi}/${cont.photo_url}` : null} alt={cont.name} />
                              <AvatarFallback className="text-base font-bold text-foreground bg-muted rounded-lg">{initials}</AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-base text-foreground truncate pr-1 leading-tight">{cont.name}</h3>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-2 text-muted-foreground hover:text-foreground">
                                    <FontAwesomeIcon icon={faEllipsis} className="text-base" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="font-semibold" align="end">
                                  <DropdownMenuItem className="text-primary" onClick={() => handleAtribuiriClick(cont?.id)}>
                                    <span className="">
                                      <FontAwesomeIcon icon={faChain} className="text-base mr-1" /> {/* Use whatever size you want */}
                                    </span>
                                    Atribuiri
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-border" />
                                  <DropdownMenuItem onClick={() => handleEdit(cont)}>
                                    <FontAwesomeIcon icon={faPenToSquare} className="mr-2 text-base" />
                                    Editează
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick({ id: cont.id, nume: cont.name })}>
                                    <FontAwesomeIcon icon={faTrash} className="mr-2 text-base" />
                                    Șterge
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {cont.activ ? (
                                <Badge className="text-low hover:bg-transparent bg-transparent border-low shadow-none px-1.5 h-5 text-sm">Activ</Badge>
                              ) : (
                                <Badge variant="destructive" className="shadow-none px-1.5 h-5 text-sm">
                                  Inactiv
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="flex items-center justify-between gap-2 text-base">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FontAwesomeIcon icon={faBuilding} className="w-3.5 opacity-70" />
                              <span>Companie</span>
                            </div>
                            {cont.companie_interna_color ? (
                              <span
                                className="font-medium  truncate flex items-center gap-1.5 p-1 px-2 rounded-lg"
                                style={{
                                  backgroundColor: cont.companie_interna_color,
                                  color: getContrastColor(cont.companie_interna_color),
                                }}
                              >
                                {cont.nume_companie_interna || "—"}
                              </span>
                            ) : (
                              <span className="font-medium text-foreground">{cont.nume_companie_interna || "—"}</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 text-base">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FontAwesomeIcon icon={faUserTie} className="w-3.5 opacity-70" />
                              <span>Specializare</span>
                            </div>
                            <span className="font-medium text-foreground truncate">{cont.specializare || "—"}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-base">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FontAwesomeIcon icon={faEnvelope} className="w-3.5 opacity-70" />
                              <span>Email</span>
                            </div>
                            <span
                              className={`truncate text-base ${cont.email ? "text-foreground cursor-pointer hover:text-primary transition-colors" : "text-muted-foreground"}`}
                              onClick={(e) => {
                                if (cont.email) {
                                  e.stopPropagation();
                                  window.location.href = `mailto:${cont.email}`;
                                }
                              }}
                            >
                              {cont.email || "—"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-base">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FontAwesomeIcon icon={faPhone} className="w-3.5 opacity-70" />
                              <span>Telefon</span>
                            </div>
                            <span
                              className={`truncate text-base ${cont.telephone ? "text-foreground cursor-pointer hover:text-primary transition-colors" : "text-muted-foreground"}`}
                              onClick={(e) => {
                                if (cont.telephone) {
                                  e.stopPropagation();
                                  window.location.href = `tel:${cont.telephone}`;
                                }
                              }}
                            >
                              {cont.telephone || "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-base">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FontAwesomeIcon icon={faCalendar} className="w-3.5 opacity-70" />
                              <span>Data nașterii</span>
                            </div>
                            <span className={`truncate text-base ${cont.data_nastere ? "text-foreground cursor-pointer hover:text-primary transition-colors" : "text-muted-foreground"}`}>
                              {formatDate(cont.data_nastere) || "—"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-base">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FontAwesomeIcon icon={faClock} className="w-3.5 opacity-70" />
                              <span>Actualizat</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{formatDateTime(cont.updated_at)}</span>
                          </div>
                        </div>

                        {/* Created by */}
                        <div className="mt-3 flex items-center border-t border-border gap-3 pt-3">
                          <Avatar className="h-10 rounded-lg w-10 border border-border">
                            <AvatarImage src={cont.created_by_photo_url ? `${photoApi}/${cont.created_by_photo_url}` : null} />
                            <AvatarFallback className="text-sm bg-muted rounded-lg text-muted-foreground">
                              <FontAwesomeIcon icon={faUserTie} />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm text-muted-foreground">Creat de</span>
                            <span className="text-sm font-medium text-foreground/90 truncate">{cont.created_by_name || "Sistem"}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
        {conturi.length === 0 && <div className="text-center p-10 text-muted-foreground">Nu există utilizatori.</div>}
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="rounded-md border bg-card w-full h-full overflow-auto relative">
      <TableVirtuoso
        customScrollParent={containerRef.current}
        totalCount={conturi.length}
        data={conturi}
        style={{ height: "100%", width: "100%" }}
        fixedHeaderContent={() => {
          return (
            <TableRow className="hover:bg-transparent border-b">
              {showCol("fotografie") && <TableHead className=" text-center py-4 px-2">Fotografie</TableHead>}
              {showCol("nume") && <TableHead className=" text-center py-4">Nume</TableHead>}
              {showCol("companie") && <TableHead className="text-center px-4">Companie</TableHead>}
              {showCol("email") && <TableHead className="text-center px-4">Email</TableHead>}
              {showCol("specializare") && <TableHead className="text-center px-4">Specializare</TableHead>}
              {showCol("telefon_munca") && <TableHead className="text-center px-4">Telefon Munca</TableHead>}
              {showCol("telefon_personal") && <TableHead className="text-center px-4">Telefon Personal</TableHead>}
              {showCol("status") && <TableHead className="text-center px-4">Status</TableHead>}
              {showCol("data_nastere") && <TableHead className="text-center px-4">Data Nașterii</TableHead>}
              {showCol("actualizat") && <TableHead className="text-center px-4">Actualizat</TableHead>}
              {showCol("creat") && <TableHead className="text-center px-4">Creat</TableHead>}
            </TableRow>
          );
        }}
        components={virtuosoComponents} // ← stable reference, never recreated
        context={virtuosoContext}
        itemContent={(index, cont) => (
          <>
            {showCol("fotografie") && (
              <TableCell className="  whitespace-nowrap">
                <div className="flex items-center justify-center gap-4">
                  <Avatar className=" border rounded-lg  h-16 w-16 md:h-20 md:w-20 xl:h-24 xl:w-24  border-border">
                    <AvatarImage src={cont.photo_url ? `${photoApi}/${cont.photo_url}` : null} className="object-cover" alt={cont.name} />
                    <AvatarFallback className="font-bold rounded-lg text-foreground bg-muted text-base">{cont.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </TableCell>
            )}
            {showCol("nume") && (
              <TableCell className=" pl-6 whitespace-nowrap">
                <div className="flex items-center justify-center">
                  <span className="font-semibold text-foreground text-base">{cont.name}</span>
                </div>
              </TableCell>
            )}

            {showCol("companie") && (
              <TableCell className="px-4 text-center whitespace-nowrap">
                <span className="flex items-center justify-center gap-1.5 py-2  rounded-lg text-base text-foreground" style={{ backgroundColor: cont.companie_interna_color }}>
                  <span style={{ color: getContrastColor(cont.companie_interna_color) }}>{cont.nume_companie_interna || "—"}</span>
                </span>
              </TableCell>
            )}

            {showCol("email") && (
              <TableCell className="px-4 text-center whitespace-nowrap">
                {cont.email ? (
                  <span
                    className="text-base text-foreground hover:text-primary cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `mailto:${cont.email}`;
                    }}
                  >
                    {cont.email}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            )}

            {showCol("specializare") && (
              <TableCell className="px-4 text-center whitespace-nowrap">
                <span className="text-base text-foreground">{cont.specializare || "—"}</span>
              </TableCell>
            )}

            {showCol("telefon_munca") && (
              <TableCell className="px-4 text-center whitespace-nowrap">
                {cont.telephone ? (
                  <span
                    className="text-base text-foreground hover:text-primary cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${cont.telephone}`;
                    }}
                  >
                    {formatPhoneDisplay(cont.telephone)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            )}
            {showCol("telefon_personal") && (
              <TableCell className="px-4 text-center whitespace-nowrap">
                {cont.telephone_1 ? (
                  <span
                    className="text-base text-foreground hover:text-primary cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${cont.telephone_1}`;
                    }}
                  >
                    {formatPhoneDisplay(cont.telephone_1)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            )}
            {showCol("status") && (
              <TableCell className="px-4 text-center whitespace-nowrap">
                {cont.activ ? (
                  <Badge className="text-low w-16 text-center items-center justify-center p-2 text-base hover:bg-transparent bg-transparent border-low shadow-none">Activ</Badge>
                ) : (
                  <Badge variant="destructive" className="w-16 text-center items-center justify-center shadow-none p-2 text-base">
                    Inactiv
                  </Badge>
                )}
              </TableCell>
            )}
            {showCol("data_nastere") && (
              <TableCell className="px-4 text-center whitespace-nowrap">
                <span className="text-base text-foreground">{formatDate(cont.data_nastere)}</span>
              </TableCell>
            )}
            {showCol("actualizat") && (
              <TableCell className="px-4 text-center whitespace-nowrap">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm text-foreground">{formatDateTime(cont.updated_at)}</span>
                  {cont.updated_by_name && <span className="text-sm text-muted-foreground">{cont.updated_by_name}</span>}
                </div>
              </TableCell>
            )}

            {showCol("creat") && (
              <TableCell className="px-4 text-center whitespace-nowrap">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm text-foreground">{formatDateTime(cont.created_at)}</span>
                  {cont.created_by_name && <span className="text-sm text-muted-foreground">{cont.created_by_name}</span>}
                </div>
              </TableCell>
            )}
          </>
        )}
      />
    </div>
  );
}
