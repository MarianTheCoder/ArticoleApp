import { faX } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'

export default function SarciniRapideModal({ setSarciniRapideModal, selectedSarcini, onSelectionChange }) {
    return (
        <div className="w-[35%] h-[40%] containerAdauga text-base flex flex-col bg-white rounded-xl">
            <div className="flex items-center justify-between p-3 border-b border-gray-400">
                <h2 className="font-semibold whitespace-nowrap">Adaugă Sarcină Rapidă</h2>
                <button
                    onClick={() => setSarciniRapideModal(false)}
                    className="rounded-lg p-2 bg-red-500 text-white hover:bg-red-600"
                >
                    <FontAwesomeIcon icon={faX} />
                </button>
            </div>
        </div>
    )
}
