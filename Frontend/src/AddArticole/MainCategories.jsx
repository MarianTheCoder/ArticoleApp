import React, { useContext } from 'react'
import AddArticol from './AddArticol';
import { ArticlesContext } from '../context/ArticlesContext';
import HorizontalSearch from './HorizontalSearch';

export default function MainCategories() {

    const {clicked, setClicked} = useContext(ArticlesContext);

  return (
    <div className='h-screen flex items-center justify-center'>
       {/* <div className='h-full w-full  flex items-center gap-12 justify-end pr-12'> */}
        <div className="bg-gray-600 w-2/3 h-90h relative flex flex-col items-center p-8 pb-6 pt-1 rounded-lg shadow-lg">
          <div className='w-full bg-gray-800 flex justify-around items-center p-4 mt-4 text-xl rounded-xl'>
            <button onClick={() => setClicked(1)} className={`bg-blue-600 text-white px-4 py-3 rounded-xl ${clicked == 1 ? "bg-blue-800 outline-2 outline" : ""} hover:bg-blue-700`}>
              Categorie 1
            </button>
            <button onClick={() => setClicked(2)} className={`bg-blue-600 text-white px-4 py-3 rounded-xl ${clicked == 2 ? "bg-blue-800 outline-2 outline" : ""} hover:bg-blue-700`}>
              Categorie 2
            </button>
            <button onClick={() => setClicked(3)} className={`bg-blue-600 text-white px-4 py-3 rounded-xl ${clicked == 3 ? "bg-blue-800 outline-2 outline" : ""} hover:bg-blue-700`}>
              Categorie 3
            </button>
            <button onClick={() => setClicked(4)} className={`bg-blue-600 text-white px-4 py-3 rounded-xl ${clicked == 4 ? "bg-blue-800 outline-2 outline" : ""} hover:bg-blue-700`}>
              Categorie 4
            </button>
          </div>
          {clicked && <AddArticol/>}
        </div>
        {/* <HorizontalSearch/> */}
        {/* </div> */}
      </div>
  )
}
