import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faFolderTree, faList } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";

export default function CatalogMetaSelect({ label, valueId, fallbackValue = "", options = [], onChange, onManage }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = useMemo(() => options.find((item) => String(item.id) === String(valueId)), [options, valueId]);
  const selectedLabel = selectedOption?.denumire || fallbackValue || "";
  const filteredOptions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((item) =>
      String(item.denumire || "")
        .toLowerCase()
        .includes(needle),
    );
  }, [options, search]);

  return (
    <div className="flex items-center gap-1">
      <div className="flex min-w-0 flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-9 min-w-0 bg-card flex-1 justify-start rounded-r-none px-2 text-left text-foreground">
              {selectedLabel ? (
                <OverflowTooltip text={selectedLabel} align="left" maxLines={1} className="min-w-0 truncate text-sm font-semibold" />
              ) : (
                <span className="min-w-0 truncate text-sm text-muted-foreground">Alege {label.toLowerCase()}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[20rem] p-2">
            <div className="flex flex-col gap-2">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută..." className="h-8 text-sm" />

              <div className="max-h-60 overflow-auto rounded-md border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b px-2 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onChange(null, "");
                    setOpen(false);
                  }}
                >
                  <span className="text-muted-foreground">Fără {label.toLowerCase()}</span>
                  {!valueId && !fallbackValue ? <FontAwesomeIcon icon={faCheck} className="text-primary" /> : null}
                </button>

                {filteredOptions.map((item) => {
                  const selected = String(item.id) === String(valueId);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center justify-between border-b px-2 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
                      onClick={() => {
                        onChange(item.id, item.denumire);
                        setOpen(false);
                      }}
                    >
                      <span className="min-w-0 truncate font-semibold text-foreground">{item.denumire}</span>
                      {selected ? <FontAwesomeIcon icon={faCheck} className="shrink-0 text-primary" /> : null}
                    </button>
                  );
                })}

                {filteredOptions.length === 0 ? <div className="px-2 py-4 text-center text-sm text-muted-foreground">Niciun rezultat.</div> : null}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-l-none border-l-0" onClick={onManage}>
          <FontAwesomeIcon icon={faList} className="text-sm" />
        </Button>
      </div>

    </div>
  );
}
