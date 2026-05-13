// components/PontajeCalendar.jsx
import { memo, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format, getWeek } from "date-fns";
import { ro } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faRotate, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { faCalendarDays } from "@fortawesome/free-regular-svg-icons";

const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getDatesInRange = (start, end) => {
  const range = [];
  const current = new Date(start);
  const final = new Date(end);
  const direction = current < final ? 1 : -1;
  while ((direction === 1 && current <= final) || (direction === -1 && current >= final)) {
    range.push(new Date(current));
    current.setDate(current.getDate() + direction);
  }
  return range;
};

const getAllDatesInMonth = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  return getDatesInRange(new Date(year, month, 1), new Date(year, month + 1, 0));
};

export const PontajeCalendar = memo(({ selectedDates, setSelectedDates, onReset }) => {
  const [lastSelectedDate, setLastSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [open, setOpen] = useState(true);

  return (
    <>
      <style>{`
                .pontaje-calendar td[data-selected="true"] button {
                    background-color: hsl(var(--primary)) !important;
                    color: white !important;
                    font-weight: 600 !important;
                    border-radius: 6px !important;
                }
                .pontaje-calendar td[data-selected="true"] button:hover {
                    background-color: hsl(var(--primary) / 0.85) !important;
                    color: white !important;
                }
                .pontaje-calendar .rdp-chevron {
                    fill: white !important;
                }
            `}</style>

      <Collapsible open={open} onOpenChange={setOpen} className="pontaje-calendar rounded-xl bg-card shadow-md border  w-full">
        {/* Trigger / Header */}
        <CollapsibleTrigger asChild>
          <button className={`flex items-center selectedRow justify-between w-full ${open ? "rounded-t-xl" : "rounded-xl"}  px-5 py-4 hover:bg-accent transition-colors `}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarDays} className="text-primary text-xl" />
              <span className="text-base font-semibold text-foreground">Calendar - Săptămâna {getWeek(new Date(), { weekStartsOn: 1 })}</span>
            </div>
            <FontAwesomeIcon icon={faChevronDown} className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>

        {/* Collapsible body */}
        <CollapsibleContent className="overflow-hidden">
          <div className="border-t border-border" />

          <div className="p-4 flex flex-col gap-4">
            {/* DayPicker */}
            <div className="flex justify-center select-none w-full">
              <DayPicker
                modifiers={{ selected: selectedDates }}
                selected={selectedDates}
                month={currentMonth}
                fixedWeeks
                showWeekNumber
                weekStartsOn={1}
                locale={ro}
                onMonthChange={setCurrentMonth}
                onDayClick={(day, _modifiers, e) => {
                  e.preventDefault();
                  const exists = selectedDates.some((d) => isSameDay(d, day));

                  if (e.shiftKey && lastSelectedDate) {
                    setSelectedDates(getDatesInRange(lastSelectedDate, day));
                    return;
                  }
                  if (e.ctrlKey || e.metaKey) {
                    if (exists) {
                      const updated = selectedDates.filter((d) => !isSameDay(d, day));
                      setSelectedDates(updated);
                      if (updated.length === 0) setLastSelectedDate(null);
                    } else {
                      setSelectedDates([...selectedDates, day]);
                      setLastSelectedDate(day);
                    }
                    return;
                  }
                  if (exists) {
                    const updated = selectedDates.filter((d) => !isSameDay(d, day));
                    setSelectedDates(updated);
                    if (updated.length === 0) setLastSelectedDate(null);
                  } else {
                    setSelectedDates([day]);
                    setLastSelectedDate(day);
                  }
                }}
                classNames={{
                  root: "w-full",
                  months: "flex  flex-col w-full",
                  month: "space-y-2 w-full",
                  month_caption: "flex justify-center items-center py-2 relative",
                  caption_label: "text-base font-semibold text-foreground capitalize",
                  nav: "flex relative items-center justify-between",
                  button_previous:
                    "absolute z-50 left-0 top-0 h-10 w-10 flex items-center justify-center rounded-md bg-primary hover:bg-primary/90 text-muted-foreground hover:text-foreground transition-colors",
                  button_next:
                    "absolute z-50 right-0 top-0 h-10 w-10 flex items-center justify-center rounded-md bg-primary hover:bg-primary/90 text-muted-foreground hover:text-foreground transition-colors",
                  month_grid: "w-full  border-collapse",
                  weekdays: "flex  w-full",
                  weekday: "text-muted-foreground flex-1 text-center text-base font-medium py-2",
                  week: "flex w-full mt-1 gap-1",
                  week_number: "text-sm  text-muted-foreground w-10 flex items-center justify-center",
                  week_number_header: "w-10",

                  day: "flex-1 h-10 flex items-center justify-center",
                  day_button: [
                    "h-10 w-full rounded-md text-base font-normal",
                    "flex items-center justify-center",
                    "hover:bg-accent hover:text-accent-foreground",
                    "transition-colors cursor-pointer",
                    "text-foreground",
                  ].join(" "),
                  today: "bg-accent text-accent-foreground font-semibold rounded-md",
                  outside: "text-muted-foreground opacity-40",
                  disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
                  hidden: "invisible",
                }}
              />
            </div>

            <div className="border-t border-border" />

            {/* Footer */}
            <div className="flex text-base gap-3">
              <Button
                onClick={() => {
                  setCurrentMonth(new Date());
                  setLastSelectedDate(null);
                  onReset();
                }}
                className="flex-1 flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 font-medium text-foreground hover:bg-accent transition-colors"
              >
                <FontAwesomeIcon icon={faRotate} />
                Reset
              </Button>
              <Button
                onClick={() => setSelectedDates(getAllDatesInMonth(currentMonth))}
                className="flex-1 flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <FontAwesomeIcon icon={faCalendar} />
                Toată Luna
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
});
