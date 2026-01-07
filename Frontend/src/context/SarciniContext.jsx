import { getWeek } from 'date-fns';
import React, { createContext, useState } from 'react'

const SarciniContext = createContext();

const SarciniProvider = ({ children }) => {

    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [currentWeek, setCurrentWeek] = useState(getWeek(new Date()));

    const [selectedWeek, setSelectedWeek] = useState(0); // 0 = toate săptămânile

    return (
        <SarciniContext.Provider value={{ year, setYear, selectedWeek, setSelectedWeek, currentWeek, setCurrentWeek }}>
            {children}
        </SarciniContext.Provider>
    )
}

export { SarciniContext, SarciniProvider };
