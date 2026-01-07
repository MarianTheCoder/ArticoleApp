import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'
import SarcinaAdauga from './SarcinaAdauga';

export default function SarciniTable({ }) {

    const [modalSarcinaAdauga, setModalSarcinaAdauga] = useState(false);

    return (
        <div className='text-black h-full w-full flex flex-col justify-between'>
            <div>Sarcini</div>
            <button onClick={() => setModalSarcinaAdauga(true)} className='border-blue-500 border-2 containerAdauga hover:bg-blue-200 bg-blue-50 px-4 py-3 text-base flex items-center justify-center gap-2 rounded-full'><FontAwesomeIcon className='text-lg ' icon={faPlus} /> Adaugă sarcină</button>
            {modalSarcinaAdauga && <div className='fixed top-0 left-0 w-full h-full bg-black/30 flex items-center justify-center z-50'>
                <SarcinaAdauga setModalSarcinaAdauga={setModalSarcinaAdauga} />
            </div>}
        </div>
    )
}
