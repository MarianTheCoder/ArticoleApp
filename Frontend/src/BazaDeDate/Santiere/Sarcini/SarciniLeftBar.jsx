import React, { useContext, useEffect, useRef, useState } from "react";
import { getISOWeeksInYear, getISOWeekYear, getWeek } from "date-fns";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleChevronLeft, faCircleChevronRight } from "@fortawesome/free-solid-svg-icons";
import { SarciniContext } from "../../../context/SarciniContext";

export default function SarciniLeftBar({ }) {
    const { year, setYear, selectedWeek, setSelectedWeek, currentWeek, setCurrentWeek } = useContext(SarciniContext);

    const [weeks, setWeeks] = useState([]);
    // ref pentru butonul săptămânii curente
    const currentWeekRef = useRef(null);

    useEffect(() => {
        const weeksInYear = getISOWeeksInYear(new Date(year, 0, 1));
        const cw = year === getISOWeekYear(new Date()) ? getWeek(new Date()) : 1;
        const arr = Array.from({ length: weeksInYear }, (_, i) => i + 1);
        setWeeks(arr);
        setSelectedWeek(0);
        setCurrentWeek(cw);
    }, [year]);

    useEffect(() => {
        if (currentWeekRef.current) {
            currentWeekRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [weeks]);

    return (
        <div className="w-full text-black h-full flex flex-col gap-2">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => setYear((y) => y - 1)}>
                    <FontAwesomeIcon icon={faCircleChevronLeft} className="text-4xl text-blue-500 hover:text-blue-600" />
                </button>
                <span className="font-bold text-xl">{year}</span>
                <button onClick={() => setYear((y) => y + 1)}>
                    <FontAwesomeIcon icon={faCircleChevronRight} className="text-4xl text-blue-500 hover:text-blue-600" />
                </button>
            </div>
            <div className="flex overflow-hidden flex-col gap-4 h-full">
                <button
                    className={`p-4 text-lg text-center border border-black hover:bg-blue-200 rounded-full ${selectedWeek === 0 ? "text-blue-500 border-blue-500 border-2 font-semibold" : ""
                        }`}
                    onClick={() => setSelectedWeek(0)}
                >
                    Toate săptămânile
                </button>
                <div className="w-full bg-gray-400 h-1"></div>
                <div className="flex flex-col gap-1 overflow-y-auto">
                    {weeks.map((w) => {
                        const isCurrent = currentWeek === w && year === getISOWeekYear(new Date());
                        return (
                            <button
                                key={w}
                                ref={isCurrent ? currentWeekRef : null}
                                className={`p-4 text-lg text-center hover:bg-blue-200 rounded-full 
                                    ${selectedWeek === w ? "bg-blue-300 font-semibold" : ""} 
                                    ${isCurrent ? "bg-blue-100" : ""}`}
                                onClick={() => setSelectedWeek(w)}
                            >
                                Săptămâna {w}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}