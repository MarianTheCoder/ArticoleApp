import React, { useEffect, useState } from 'react'
import ManoperaForm from './Manopera/ManoperaForm';
import MaterialeForm from './Materiale/MaterialeForm';
import TransportForm from './Transport/TransportForm';
import UtilajeForm from './Utilaje/UtilajeForm';

export default function DatabaseMainCategories({dateType}) {

    const [clicked, setClicked] = useState(0);

        useEffect(() => {
          setClicked(dateType);
        }, [dateType])

return (
    <div className='h-screen w-full flex items-center justify-center'>
        <div className="container  w-90w h-90h relative flex  flex-col items-center rounded-lg">
        {
            clicked == 1 ? <ManoperaForm/>
            :
            clicked == 2 ? <MaterialeForm/>
            :
            clicked == 3 ? <TransportForm/>
            :
            clicked == 4 ? <UtilajeForm/>
            :
            ""
        }
        </div>
      </div>
  )
}
