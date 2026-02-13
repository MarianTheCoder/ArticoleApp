import React from 'react'
import FilialaMainCompany from '../Filiale/FilialeMainCompany'


export default function FilialaMainPage() {
    return (
        <div className="h-full w-full flex  justify-center overflow-hidden items-center">
            <div className="w-[95%] h-[95%] flex flex-col p-4  gap-4 overflow-hidden  bg-background relative rounded-lg">
                <FilialaMainCompany />
            </div>
        </div>
    )
}
