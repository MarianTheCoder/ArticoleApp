import React, { useState } from 'react'
import SarciniLeftBar from './SarciniLeftBar'
import SarciniTable from './SarciniTable';
import { SarciniProvider } from '../../../context/SarciniContext';

export default function SarciniMain() {

    return (
        <SarciniProvider>
            <div className='grid grid-cols-[1fr_6fr] h-full w-full bg-gray-200 gap-6 rounded-lg p-6'>
                <div className='w-full h-full p-4 overflow-hidden bg-white rounded-lg'>
                    <SarciniLeftBar />
                </div>
                <div className='w-full h-full p-6 bg-white rounded-lg'>
                    <SarciniTable />
                </div>
            </div>
        </SarciniProvider>
    )
}
