import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';

export default function HorizontalSearch() {
  const [extend, setExtend] = useState(false);
  const [searchBy, setSearchBy] = useState(0);

  return (
    <div className='w-72 h-auto bg-gray-600 rounded-xl'>
      <div>Filter</div>
    </div>
  );
}
    // <div
    //   className={`h-full rounded-xl transition-all duration-500 border-r-2 flex  bg-gray-800 
    //     ${extend ? "w-52" : "w-12"}`}
    // >
    //   {/* Toggle Button */}
    //   <div
    //     onClick={() => setExtend(!extend)}
    //     className={`select-none flex flex-col w-12 cursor-pointer justify-around items-center  `}
    //   >
    //     <FontAwesomeIcon
    //       className={`${extend === false ? "rotate-0" : "-rotate-180"} transition-transform duration-500`}
    //       icon={faArrowRight}
    //     />
    //     <p className="-rotate-90">Search</p>
    //     <FontAwesomeIcon
    //       className={`${extend === false ? "rotate-0" : "rotate-180"} transition-transform duration-500`}
    //       icon={faArrowRight}
    //     />
    //   </div>

    //   {/* Smooth Animated Text */}
    //   <div
    //     className={`overflow-hidden transition-opacity duration-500 flex justify-center ease-in-out pl-4 
    //     ${extend ? "opacity-100 translate-x-0" : "opacity-0 "}`}
    //   >
        
    //     <input className='w-32 h-8 outline-none text-black px-1' type="text" />
    //   </div>