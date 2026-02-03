import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';
import api from '../../api/axiosAPI'; // Ensure you import your API instance

import OferteWrapper from './Ofertare/OferteWrapper';
import Prezentare from './Prezentare/Prezentare';
import MainRezerve from './Rezerve/MainRezerve';
import SarciniMain from './Sarcini/SarciniMain';

export default function SantiereRoutes() {

    const { idUser, idSantier } = useParams();

    // UI State
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [selectedButton, setSelectedButton] = useState(1);

    // --- FETCH DATA LOCALLY ---
    useEffect(() => {
        const validateRoute = async () => {
            try {
                // Fetch the lists directly from API
                const [usersRes, santiereRes] = await Promise.all([
                    api.get('/users/GetUsersName'),
                    api.get('/users/getSantiere')
                ]);

                const beneficiari = usersRes.data || [];
                const santiere = santiereRes.data || [];

                // Check if the IDs in the URL actually exist
                const existsUser = beneficiari.some(item => item.id == idUser);
                const existsSantier = santiere.some(item => item.id == idSantier);

                if (existsSantier && existsUser) {
                    setIsValid(true);
                } else {
                    console.warn("Invalid Santier or User ID in URL");
                }
            } catch (err) {
                console.error("Validation failed:", err);
            } finally {
                setLoading(false);
            }
        };

        validateRoute();
    }, [idUser, idSantier]);

    // Helper for button classes to keep JSX clean
    const getBtnClass = (index) => {
        const isActive = selectedButton === index;
        const base = "relative w-40 transition-all duration-[150ms] text-white px-6 p-3 xxxl:px-4 rounded-tr-[4rem] rounded-tl-2xl hover:-translate-y-1";
        const active = "bg-[#26415f] -translate-y-1 shadow-[8px_8px_15px_rgba(0,0,0,1)] z-40";
        const inactive = "bg-blue-500 shadow-[4px_4px_10px_rgba(0,0,0,1)]";

        // Z-index layering logic from your original code
        const zIndex = `z-[${50 - (index * 10)}]`;

        return `${base} ${isActive ? active : inactive} ${zIndex}`;
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;

    if (!isValid) return <div className="h-screen w-full flex items-center justify-center text-red-500">Nu s-a găsit șantierul sau beneficiarul.</div>;

    return (
        <div className='relative h-screen w-full flex text-sm leading-tight items-center justify-center'>
            <div className="w-[96%] h-90h relative flex justify-center rounded-lg">

                {/* Tabs Header */}
                <div className="absolute -top-9 left-8 -space-x-2 select-none flex">
                    <button onClick={() => setSelectedButton(1)} className={`z-50 ${getBtnClass(1)}`}>Prezentare</button>
                    <button onClick={() => setSelectedButton(2)} className={`z-40 ${getBtnClass(2)}`}>Oferte</button>
                    <button onClick={() => setSelectedButton(3)} className={`z-30 ${getBtnClass(3)}`}>Execuție</button>
                    <button onClick={() => setSelectedButton(4)} className={`z-20 ${getBtnClass(4)}`}>Rezerve</button>
                    <button onClick={() => setSelectedButton(5)} className={`z-10 ${getBtnClass(5)}`}>Antimăsurători</button>
                </div>

                {/* Content Body */}
                <div className="containerNoGlass relative z-50 w-full h-full flex flex-col items-center rounded-lg">
                    {selectedButton === 1 && <Prezentare key={`${idUser}-${idSantier}`} />}
                    {selectedButton === 2 && <OferteWrapper key={`${idUser}-${idSantier}`} />}
                    {selectedButton === 3 && <SarciniMain key={`${idUser}-${idSantier}`} />}
                    {selectedButton === 4 && <MainRezerve key={`${idUser}-${idSantier}`} />}
                    {/* Add Button 5 component here if you have one */}
                </div>
            </div>
        </div>
    )
}