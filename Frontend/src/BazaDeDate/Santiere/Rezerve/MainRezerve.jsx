// src/components/Rezerve/MainRezerve.jsx
import React, { useState } from 'react';
import SidebarRezerve from './SidebarRezerve';
import PlanView from './PlanView/PlanView';
import Viewer3D from './3D/Viewer3D';
import ZoneManagement from './ZoneManagement';
import PlanDrawer from './PlanDrawer/PlanDrawer';

export default function MainRezerve() {
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selected3D, setSelected3D] = useState(null);

    const [zoneManagement, setZoneManagement] = useState(false);
    const [drawingZone, setDrawingZone] = useState(false);

    const [key, setKey] = useState(0); // to force remount if needed

    // When a plan is chosen, clear 3D
    const handleSelectPlan = (plan) => {
        setZoneManagement(false);
        setDrawingZone(false);
        setSelected3D(null);
        setSelectedPlan(plan);
    };

    // When a 3D lucrare is chosen, clear plan
    const handleSelectLucrare3D = (lucrare3D) => {
        setZoneManagement(false);
        setDrawingZone(false);
        setSelectedPlan(null);
        setSelected3D(lucrare3D);
    };

    const onPlanReplaced = (newPlan) => {
        setKey(k => k + 1); // force remount to reset state
        setSelectedPlan(newPlan);
    }



    return (
        <div className='grid grid-cols-[1fr_5fr] h-full w-full bg-gray-200 gap-6 rounded-lg p-6'>
            <div className='w-full h-full p-4 overflow-hidden bg-white rounded-lg'>
                <SidebarRezerve
                    onSelectPlan={handleSelectPlan}
                    onSelectLucrare3D={handleSelectLucrare3D}
                    selectedPlanSideBar={selectedPlan}
                />
            </div>

            <div className='w-full h-full p-4 bg-white rounded-lg'>
                {selectedPlan ? (
                    !zoneManagement && !drawingZone ?
                        <PlanView plan={selectedPlan} onPlanReplaced={onPlanReplaced} key={key} onSelectManagementZone={setZoneManagement} onSelectDrawingZone={setDrawingZone} />
                        :
                        zoneManagement ?
                            <ZoneManagement plan={selectedPlan} onSelectManagementZone={setZoneManagement} />
                            :
                            drawingZone ?
                                <PlanDrawer plan={selectedPlan} onSelectDrawingZone={setDrawingZone} />
                                :
                                null
                ) : selected3D ? (
                    <Viewer3D plan={selected3D} />
                ) : (
                    <div className='flex items-center justify-center h-full w-full'>
                        <div className="text-2xl text-gray-500 select-none">
                            Selecteazǎ un plan sau o lucrare 3D
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}